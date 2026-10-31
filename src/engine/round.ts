import type {
  MatchEvent, MatchEventKind, MatchPlayerState, MatchState,
  RoundRecord, Side, TeamRoundOrders, TeamState,
} from '@/types';
import { BUY_LABEL, FORM_VARIANCE, MATCH_CONFIG, MATCH_ECONOMY, REASON_LABEL } from '@/data/config';
import { MAPS } from '@/data/maps';
import { tacticById } from '@/data/tactics';
import { WEAPON_MAP } from '@/data/weapons';
import type { Rng } from '@/engine/rng';
import { resolveDuel, type DuelContext } from '@/engine/combat';
import { applyBuy, killRewardFor } from '@/engine/economy';
import { alivePlayers, enemySide, teamBySide } from '@/engine/state';

interface RoundFlags {
  kill: boolean;
  assist: boolean;
  survived: boolean;
  traded: boolean;
  clutchOpportunity: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function multiLabel(kills: number): string {
  if (kills >= 5) return '五杀 ACE';
  if (kills === 4) return '四杀';
  if (kills === 3) return '三杀';
  return '双杀';
}

/**
 * Simulates exactly one round of CS2 (MR12 rules) from the current match state.
 * Every kill, plant, defuse and round result below is produced by resolved
 * events — the round winner is never rolled up front.
 */
export function simulateRound(match: MatchState, rng: Rng, orders: TeamRoundOrders): RoundRecord {
  const map = MAPS[match.mapId];
  const tTeam = teamBySide(match, 'T');
  const ctTeam = teamBySide(match, 'CT');
  const tTactic = tacticById(orders.t.tactic ?? tTeam.orders.t.tactic);
  const ctTactic = tacticById(orders.ct.tactic ?? ctTeam.orders.ct.tactic);
  const events: MatchEvent[] = [];
  const flags = new Map<string, RoundFlags>();
  let evSeq = 0;
  let clock = MATCH_CONFIG.roundTime;

  const flag = (id: string): RoundFlags => {
    let f = flags.get(id);
    if (!f) {
      f = { kill: false, assist: false, survived: false, traded: false, clutchOpportunity: false };
      flags.set(id, f);
    }
    return f;
  };

  const push = (
    kind: MatchEventKind,
    text: string,
    extra: Partial<MatchEvent> = {},
  ): void => {
    evSeq += 1;
    events.push({
      id: `${match.id}-r${match.roundNumber}-e${evSeq}`,
      round: match.roundNumber,
      clock: Math.max(0, Math.round(clock)),
      kind,
      text,
      ...extra,
    });
  };

  // ---------- 1. Reset & economy ----------
  resetTeamsForRound(tTeam, ctTeam);
  const tBuyResult = applyBuy(tTeam, orders.t.buy, match.roundNumber, match.overtime);
  const ctBuyResult = applyBuy(ctTeam, orders.ct.buy, match.roundNumber, match.overtime);

  push('buy', `T 方购买${BUY_LABEL[orders.t.buy]}——花费 $${tBuyResult.spent}，手上还剩 $${teamMoney(tTeam)}。`, { side: 'T' });
  push('buy', `CT 方购买${BUY_LABEL[orders.ct.buy]}——花费 $${ctBuyResult.spent}，手上还剩 $${teamMoney(ctTeam)}。`, { side: 'CT' });

  // ---------- 2. Tactics ----------
  push('tactic', `T 方叫出「${tTactic.name}」：${tTactic.blurb}`, { side: 'T' });
  push('tactic', `CT 方布置「${ctTactic.name}」：${ctTactic.blurb}`, { side: 'CT' });

  // ---------- 3. Site pick ----------
  const siteWeights: { value: 'A' | 'B'; weight: number }[] = [
    { value: 'A', weight: tTactic.siteBias.A * (1.05 - map.sites.A.tDifficulty * 0.1) },
    { value: 'B', weight: tTactic.siteBias.B * (1.05 - map.sites.B.tDifficulty * 0.1) },
  ];
  let targetSite: 'A' | 'B' = 'A';
  if (orders.t.target === 'A' || orders.t.target === 'B') {
    targetSite = orders.t.target;
  } else {
    targetSite = rng.weighted(siteWeights);
  }
  const stackSite: 'A' | 'B' = ctTactic.id === 'stack_site' ? rng.weighted([{ value: 'A', weight: 0.5 }, { value: 'B', weight: 0.5 }]) : 'A';
  if (ctTactic.id === 'stack_site') {
    push('info', `CT 正在重守 ${stackSite} 点——另一侧人手很薄。`, { side: 'CT', node: stackSite });
  }

  // ---------- 4. Map control ----------
  const midRoll = clamp(
    0.5
      + (avgOvr(tTeam) - avgOvr(ctTeam)) / 260
      + (map.midValue - 70) / 260
      + (tTactic.info - 0.5) * 0.34
      - (ctTactic.info - 0.5) * 0.24,
    0.12,
    0.88,
  );
  const tHasMid = rng.chance(midRoll);
  const tForm = rng.float(-1, 1) * FORM_VARIANCE;
  const ctForm = rng.float(-1, 1) * FORM_VARIANCE;
  const contactAt = Math.max(8, Math.min(tTactic.contactAt, ctTactic.contactAt) / Math.max(0.85, map.tempo));
  clock -= contactAt;

  if (tHasMid) {
    push('info', 'T 方赢下中路对枪，拿到控图权，逼出 CT 提前轮转。', { side: 'T', node: 'mid' });
  } else {
    push('info', 'CT 稳住了中路，T 方失去控图权，只能盲打。', { side: 'CT', node: 'mid' });
  }
  if (tTactic.utility > 0.6) {
    push('utility', `T 方交出 ${Math.round(tTactic.utility * 4)} 颗道具，强行打开 ${map.sites[targetSite].name}。`, { side: 'T' });
  }
  if (ctTactic.utility > 0.6) {
    push('utility', 'CT 用燃烧弹封路加一颗单向烟回敬。', { side: 'CT' });
  }

  // ---------- 5. Opening duel ----------
  let bombPlanted = false;
  let bombTimer = 0;
  let site: 'A' | 'B' = targetSite;
  let resolved: { winner: Side; reason: RoundRecord['reason'] } | null = null;

  const siteHeldByCT = ctTactic.id !== 'retake_setup';
  const tSiteStrength = clamp(
    tTactic.attackPower
      + (tHasMid ? 0.05 : -0.02)
      + (ctTactic.id === 'stack_site' && stackSite !== targetSite ? 0.09 : 0)
      - map.sites[targetSite].tDifficulty * 0.16,
    0.7,
    1.35,
  );
  const ctSiteStrength = clamp(
    ctTactic.defensePower
      + (ctTactic.id === 'stack_site' && stackSite === targetSite ? 0.12 : 0)
      + map.sites[targetSite].ctAdvantage * 0.16
      + (siteHeldByCT ? 0.03 : -0.05),
    0.7,
    1.4,
  );

  const openingAttacker = pickDuelist(alivePlayers(tTeam), rng, 'T');
  const openingDefender = pickDuelist(alivePlayers(ctTeam), rng, 'CT');
  if (openingAttacker && openingDefender) {
    const ctxT = contextFor('T', {
      mapId: match.mapId, tacticEdge: (tSiteStrength - 1) * 1.6,
      utilityEdge: tTactic.utility * 0.6, supportEdge: 0.15, opening: true, holdingSite: false,
      mapAwpFactor: map.awpFactor,
    });
    const ctxCT = contextFor('CT', {
      mapId: match.mapId, tacticEdge: (ctSiteStrength - 1) * 1.6,
      utilityEdge: ctTactic.utility * 0.5, supportEdge: 0.2, opening: true, holdingSite: siteHeldByCT,
      mapAwpFactor: map.awpFactor,
    });
    const duel = resolveDuel(rng, openingAttacker, openingDefender, ctxT, ctxCT);
    const winner = duel.attackerWins ? openingAttacker : openingDefender;
    const loser = duel.attackerWins ? openingDefender : openingAttacker;
    applyDamage(winner, loser, duel.damage);
    const openingSide = winner === openingAttacker ? 'T' : 'CT';
    if (duel.killed) {
      // `victim` is only set when the player actually died — never for a wound.
      push('opening', `${winner.nickname}（${weaponOf(winner)}）在 ${map.sites[targetSite].name} 拿下首杀，击杀 ${loser.nickname}。`, {
        side: openingSide, actor: winner.nickname, victim: loser.nickname,
      });
      winner.stats.openingKills += 1;
      loser.stats.openingDeaths += 1;
      killPlayer(winner, loser, duel.headshot);
    } else {
      applyReturnDamage(loser, winner, duel.returned);
      push('opening', `${winner.nickname} 赢下首轮对枪，但没能收掉 ${loser.nickname}（对方剩 ${Math.max(1, loser.hp)} 血）。`, {
        side: openingSide, actor: winner.nickname,
      });
    }
  }

  // ---------- 6. Main engagement loop ----------
  let beats = 0;
  while (!resolved && beats < 90) {
    beats += 1;
    const tAlive = alivePlayers(tTeam);
    const ctAlive = alivePlayers(ctTeam);

    if (!bombPlanted) {
      if (tAlive.length === 0) {
        resolved = { winner: 'CT', reason: 'elimination' };
        push('elimination', 'T 方全员阵亡——CT 拿下本回合。', { side: 'CT' });
        break;
      }
      if (ctAlive.length === 0) {
        // No defenders left: the bomb goes down and detonates.
        bombPlanted = true;
        bombTimer = MATCH_CONFIG.bombTime;
        site = targetSite;
        clock = Math.max(3, clock);
        push('plant', `${tAlive[0].nickname} 在 ${map.sites[site].name} 安放炸弹——CT 已无人可以拆包。`, { side: 'T', node: site });
        resolved = { winner: 'T', reason: 'bomb' };
        push('explode', '炸弹无人干扰地起爆。', { side: 'T' });
        break;
      }

      if (clock <= 0) {
        resolved = { winner: 'CT', reason: 'time' };
        push('timeout', '回合时间耗尽，炸弹仍未安放——CT 守住。', { side: 'CT' });
        break;
      }

      // Decide whether the T side plants now.
      const plantWindow = clock <= MATCH_CONFIG.roundTime - contactAt - 12 && clock > 6;
      const numbersEdge = (tAlive.length - ctAlive.length) * 0.06;
      const plantChance = clamp(0.3 + tTactic.plantSpeed * 0.4 + numbersEdge + (tHasMid ? 0.06 : 0), 0.05, 0.94);
      if (plantWindow && tAlive.length >= 2 && rng.chance(plantChance)) {
        bombPlanted = true;
        bombTimer = MATCH_CONFIG.bombTime;
        site = targetSite;
        const planter = tAlive[rng.int(0, tAlive.length - 1)];
        push('plant', `${planter.nickname} 在 ${map.sites[site].name} 安放炸弹——剩余 ${Math.round(clock)} 秒，炸弹开始倒计时。`, { side: 'T', actor: planter.nickname, node: site });
        continue;
      }

      const dt = rng.int(4, 9);
      clock -= dt;
      if (clock <= 0) {
        clock = 0;
        resolved = { winner: 'CT', reason: 'time' };
        push('timeout', '时间耗尽时炸弹仍在 T 方手里——CT 拿下回合。', { side: 'CT' });
        break;
      }
      runDuelPhase('T', targetSite);
    } else {
      // Post-plant: the round clock is irrelevant, only the bomb timer matters.
      const dt = rng.int(4, 8);
      bombTimer -= dt;
      const tAliveNow = alivePlayers(tTeam);
      const ctAliveNow = alivePlayers(ctTeam);

      if (ctAliveNow.length === 0) {
        resolved = { winner: 'T', reason: 'bomb' };
        push('explode', `CT 全员阵亡——炸弹在 ${map.sites[site].name} 起爆，T 方拿下回合。`, { side: 'T' });
        break;
      }
      if (bombTimer <= 0) {
        resolved = { winner: 'T', reason: 'bomb' };
        push('explode', '回防还没展开，炸弹就炸了。', { side: 'T' });
        break;
      }
      if (tAliveNow.length === 0) {
        // T wiped out but the bomb is still ticking: CT must actually defuse.
        const canDefuse = bombTimer >= MATCH_CONFIG.defuseTime + rng.int(0, 2);
        if (canDefuse) {
          const defuser = ctAliveNow[rng.int(0, ctAliveNow.length - 1)];
          push('defuse', `${defuser.nickname} 在剩余 ${Math.max(1, bombTimer)} 秒时完成拆包——CT 在被团灭的边缘活了下来。`, { side: 'CT', actor: defuser.nickname });
          resolved = { winner: 'CT', reason: 'defuse' };
        } else {
          push('explode', 'T 方已全员阵亡，但炸弹早已过了拆包窗口——照样爆炸。', { side: 'T' });
          resolved = { winner: 'T', reason: 'bomb' };
        }
        break;
      }

      // Retake duel
      runDuelPhase('CT', site);

      const ctAfter = alivePlayers(ctTeam);
      const tAfter = alivePlayers(tTeam);
      if (tAfter.length === 0 && ctAfter.length > 0) {
        const canDefuse = bombTimer >= MATCH_CONFIG.defuseTime + 1;
        if (canDefuse) {
          const defuser = ctAfter[rng.int(0, ctAfter.length - 1)];
          push('defuse', `包点清空——${defuser.nickname} 稳稳拆掉炸弹。`, { side: 'CT', actor: defuser.nickname });
          resolved = { winner: 'CT', reason: 'defuse' };
        } else {
          push('explode', 'CT 还在清包点的过程中，炸弹起爆了。', { side: 'T' });
          resolved = { winner: 'T', reason: 'bomb' };
        }
        break;
      }
    }
  }

  if (!resolved) {
    // Hard safety net: never leave a round unresolved.
    const tAlive = alivePlayers(tTeam).length;
    const ctAlive = alivePlayers(ctTeam).length;
    if (bombPlanted) {
      resolved = { winner: 'T', reason: 'bomb' };
      push('explode', '炸弹起爆。', { side: 'T' });
    } else if (tAlive > ctAlive) {
      resolved = { winner: 'T', reason: 'elimination' };
      push('elimination', 'T 方赢下了这场拉锯战。', { side: 'T' });
    } else {
      resolved = { winner: 'CT', reason: 'time' };
      push('timeout', 'CT 守到了回合结束。', { side: 'CT' });
    }
  }

  const winnerSide = resolved.winner as Side;
  const winnerTeam = winnerSide === 'T' ? tTeam : ctTeam;

  // ---------- 7. Round-end bookkeeping ----------
  [tTeam, ctTeam].forEach((team) => {
    team.players.forEach((p) => {
      const f = flag(p.cardInstanceId);
      if (p.alive) f.survived = true;
      if (f.kill || f.assist || f.survived || f.traded) p.stats.kastRounds += 1;
      if (f.clutchOpportunity && team === winnerTeam) {
        p.stats.clutches += 1;
        push('clutch', `${p.nickname} 拿下 1vX 残局。`, { side: winnerSide, actor: p.nickname });
      }
      if (p.roundKills >= 2) {
        p.stats.multiKills += 1;
        push('multi', `${p.nickname} 本回合打出${multiLabel(p.roundKills)}（${p.roundKills} 杀）。`, { side: team.side, actor: p.nickname });
      }
    });
  });

  const mvp = pickRoundMvp(winnerTeam);
  push('round-end', `第 ${match.roundNumber} 回合 ${winnerSide} 方获胜（${REASON_LABEL[resolved.reason] ?? resolved.reason}）。比分——T ${tTeam.score + (winnerSide === 'T' ? 1 : 0)} : ${ctTeam.score + (winnerSide === 'CT' ? 1 : 0)} CT。`, { side: winnerSide });

  const record: RoundRecord = {
    roundNumber: match.roundNumber,
    winner: winnerSide,
    reason: resolved.reason,
    scoreT: tTeam.score + (winnerSide === 'T' ? 1 : 0),
    scoreCT: ctTeam.score + (winnerSide === 'CT' ? 1 : 0),
    bombPlanted,
    events,
    economy: { t: teamMoney(tTeam), ct: teamMoney(ctTeam) },
    mvpCardId: mvp?.cardInstanceId ?? null,
    wentToOvertime: match.overtime > 0,
  };

  // ---------- nested helpers ----------
  function teamMoney(team: TeamState): number {
    return team.players.reduce((acc, p) => acc + p.money, 0);
  }

  function runDuelPhase(initiative: Side, contestedSite: 'A' | 'B'): void {
    const attackers = alivePlayers(teamBySide(match, initiative));
    const defenders = alivePlayers(teamBySide(match, enemySide(initiative)));
    if (!attackers.length || !defenders.length) return;

    const a = pickDuelist(attackers, rng, initiative);
    const d = pickDuelist(defenders, rng, enemySide(initiative));
    if (!a || !d) return;

    const isT = initiative === 'T';
    const tTacticPart = isT ? tTactic : ctTactic;
    const enemyTactic = isT ? ctTactic : tTactic;
    const numericEdge = (attackers.length - defenders.length) * 0.05;
    const siteBonus = isT
      ? (stockAt(contestedSite, tTeam) ? 0.04 : 0)
      : (stockAt(contestedSite, ctTeam) ? 0.05 : 0);

    const ctxA = contextFor(initiative, {
      mapId: match.mapId,
      tacticEdge: (tTacticPart.attackPower - 1) * 1.4 + numericEdge + siteBonus - (enemyTactic.vsSpread ?? 0) * 0,
      utilityEdge: tTacticPart.utility * 0.4,
      supportEdge: supportRatio(attackers),
      opening: false,
      holdingSite: !isT && siteHeldByCT,
      mapAwpFactor: map.awpFactor,
    });
    const ctxB = contextFor(enemySide(initiative), {
      mapId: match.mapId,
      tacticEdge: (enemyTactic.defensePower - 1) * 1.4 + siteBonus,
      utilityEdge: enemyTactic.utility * 0.35,
      supportEdge: supportRatio(defenders),
      opening: false,
      holdingSite: !isT && siteHeldByCT,
      mapAwpFactor: map.awpFactor,
    });

    const duel = resolveDuel(rng, a, d, ctxA, ctxB);
    const winner = duel.attackerWins ? a : d;
    const loser = duel.attackerWins ? d : a;
    applyDamage(winner, loser, duel.damage);
    applyReturnDamage(loser, winner, duel.returned);

    const siteName = map.sites[contestedSite].name;
    const duelSide = winner === a ? initiative : enemySide(initiative);
    if (duel.killed) {
      push('duel', `${winner.nickname}（${weaponOf(winner)}）在 ${siteName} 击杀 ${loser.nickname}${duel.headshot ? '，一枪爆头' : ''}。`, {
        side: duelSide, actor: winner.nickname, victim: loser.nickname,
      });
    } else {
      push('duel', `${winner.nickname} 赢下这轮对枪，${loser.nickname} 只剩 ${Math.max(1, loser.hp)} 血（${siteName}）。`, {
        side: duelSide, actor: winner.nickname,
      });
    }

    if (duel.killed) {
      killPlayer(winner, loser, duel.headshot);
      // Trade attempt by the victim's team
      const victimSide = winner === a ? enemySide(initiative) : initiative;
      const allies = alivePlayers(teamBySide(match, victimSide));
      const tradeChance = 0.28 + (winner === a ? ctTactic.trade : tTactic.trade) * 0.5;
      if (allies.length && rng.chance(tradeChance)) {
        const trader = pickDuelist(allies, rng, victimSide);
        if (trader) {
          const tradeDuel = resolveDuel(
            rng, trader, winner,
            contextFor(victimSide, {
              mapId: match.mapId, tacticEdge: 0.06, utilityEdge: 0.05, supportEdge: 0.25,
              opening: false, holdingSite: false, mapAwpFactor: map.awpFactor,
            }),
            contextFor(initiative, {
              mapId: match.mapId, tacticEdge: 0, utilityEdge: 0, supportEdge: 0,
              opening: false, holdingSite: false, mapAwpFactor: map.awpFactor,
            }),
          );
          if (tradeDuel.attackerWins) {
            applyDamage(trader, winner, tradeDuel.damage);
            if (tradeDuel.killed) {
              push('duel', `${trader.nickname} 立刻补掉了 ${winner.nickname}。`, {
                side: victimSide, actor: trader.nickname, victim: winner.nickname,
              });
              killPlayer(trader, winner, tradeDuel.headshot);
              flag(trader.cardInstanceId).traded = true;
            } else {
              push('duel', `${trader.nickname} 回身还击 ${winner.nickname}，但补枪没有打中。`, {
                side: victimSide, actor: trader.nickname,
              });
            }
          }
        }
      }
    }

    trackClutchOpportunity();
  }

  function trackClutchOpportunity(): void {
    (['T', 'CT'] as Side[]).forEach((side) => {
      const team = teamBySide(match, side);
      const alive = alivePlayers(team);
      const enemyAlive = alivePlayers(teamBySide(match, enemySide(side)));
      if (alive.length === 1 && enemyAlive.length >= 2) {
        flag(alive[0].cardInstanceId).clutchOpportunity = true;
      }
    });
  }

  function stockAt(siteId: 'A' | 'B', team: TeamState): boolean {
    return team.players.some((p) => p.alive && p.role === (siteId === 'A' ? 'Anchor' : 'Support'));
  }

  function supportRatio(alive: MatchPlayerState[]): number {
    const supporters = alive.filter((p) => p.role === 'Support' || p.role === 'Anchor').length;
    return clamp(supporters / Math.max(1, alive.length), 0, 1);
  }

  function contextFor(side: Side | undefined, opts: {
    mapId: MatchState['mapId']; tacticEdge: number; utilityEdge: number; supportEdge: number;
    opening: boolean; holdingSite: boolean; mapAwpFactor: number;
  }): DuelContext {
    return {
      mapId: opts.mapId,
      tacticEdge: opts.tacticEdge,
      utilityEdge: opts.utilityEdge,
      supportEdge: opts.supportEdge,
      clutch: false,
      opening: opts.opening,
      holdingSite: opts.holdingSite,
      side: side ?? 'CT',
      form: side === 'T' ? tForm : ctForm,
    };
  }

  function applyDamage(from: MatchPlayerState, to: MatchPlayerState, dmg: number): void {
    const rounded = Math.max(1, Math.round(dmg));
    from.roundDamage += rounded;
    from.stats.damage += rounded;
    to.roundDealtDamageTo[from.cardInstanceId] = (to.roundDealtDamageTo[from.cardInstanceId] ?? 0) + rounded;
    to.hp = Math.max(0, to.hp - rounded);
  }

  function applyReturnDamage(from: MatchPlayerState, to: MatchPlayerState, dmg: number): void {
    if (dmg <= 0) return;
    applyDamage(from, to, dmg);
    // Counter-damage can hurt but never kill: only the duel winner can frag here.
    if (to.hp < 1) {
      to.hp = 1;
      to.roundDealtDamageTo[from.cardInstanceId] = (to.roundDealtDamageTo[from.cardInstanceId] ?? 0);
    }
  }

  function killPlayer(
    killer: MatchPlayerState,
    victim: MatchPlayerState,
    headshot: boolean,
  ): void {
    victim.alive = false;
    victim.hp = 0;
    victim.stats.deaths += 1;
    killer.stats.kills += 1;
    killer.roundKills += 1;
    if (headshot) killer.stats.headshots += 1;
    flag(killer.cardInstanceId).kill = true;
    killer.money = Math.min(MATCH_ECONOMY.maxMoney, killer.money + killRewardFor(killer.equipment.weaponId));

    Object.entries(victim.roundDealtDamageTo).forEach(([sourceId, amount]) => {
      if (sourceId === killer.cardInstanceId) return;
      if (amount < 30) return;
      const ally = match.teams.A.players.find((p) => p.cardInstanceId === sourceId)
        ?? match.teams.B.players.find((p) => p.cardInstanceId === sourceId);
      if (ally) {
        ally.stats.assists += 1;
        flag(ally.cardInstanceId).assist = true;
      }
    });
  }

  function pickRoundMvp(team: TeamState): MatchPlayerState | undefined {
    return [...team.players].sort(
      (a, b) => (b.roundKills * 100 + b.roundDamage) - (a.roundKills * 100 + a.roundDamage),
    )[0];
  }

  return record;
}

function resetTeamsForRound(t: TeamState, ct: TeamState): void {
  [t, ct].forEach((team) => {
    team.players.forEach((p) => {
      p.alive = true;
      p.hp = 100;
      p.roundKills = 0;
      p.roundDamage = 0;
      p.roundDealtDamageTo = {};
      p.stats.roundsPlayed += 1;
    });
  });
}

function avgOvr(team: TeamState): number {
  if (!team.players.length) return 0;
  return team.players.reduce((acc, p) => acc + p.ovr, 0) / team.players.length;
}

function weaponOf(p: MatchPlayerState): string {
  return (WEAPON_MAP[p.equipment.weaponId] ?? WEAPON_MAP.glock).name;
}

/** Weighted duelist selection: role and health both matter. */
function pickDuelist(pool: MatchPlayerState[], rng: Rng, side: Side): MatchPlayerState | undefined {
  if (!pool.length) return undefined;
  const weighted = pool.map((p) => {
    let weight = 1;
    if (side === 'T') weight += p.role === 'Entry' ? 1.4 : p.role === 'Lurker' ? 0.6 : 0.3;
    if (side === 'CT') weight += p.role === 'Anchor' ? 1.3 : p.role === 'Support' ? 0.7 : 0.4;
    weight *= 0.5 + (p.hp / 100) * 0.8;
    const weapon = WEAPON_MAP[p.equipment.weaponId];
    if (weapon && weapon.kind === 'awp') weight += 0.5;
    return { value: p, weight };
  });
  return rng.weighted(weighted);
}
