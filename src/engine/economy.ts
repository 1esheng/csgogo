import type { BuyType, MatchPlayerState, Side, TeamState } from '@/types';
import { MATCH_CONFIG, MATCH_ECONOMY } from '@/data/config';
import { MAPS } from '@/data/maps';
import { WEAPON_MAP, defaultPistol, rifleFor, smgFor } from '@/data/weapons';

export function isPistolRound(roundNumber: number, overtime: number): boolean {
  if (overtime > 0) return (roundNumber - MATCH_CONFIG.regulationRounds - 1) % MATCH_CONFIG.overtimeRoundsPerHalf === 0;
  return roundNumber === 1 || roundNumber === MATCH_CONFIG.halfRounds + 1;
}

/** How rich is this team right now. */
export function teamMoney(team: TeamState): number {
  return team.players.reduce((acc, p) => acc + p.money, 0);
}

export function averageMoney(team: TeamState): number {
  return teamMoney(team) / Math.max(1, team.players.length);
}

/**
 * Buy decision shared by the player (default suggestion) and the AI.
 * Never overspends: each purchase is checked against that player's wallet.
 */
export function decideBuy(team: TeamState, roundNumber: number, overtime: number, style: 'conservative' | 'balanced' | 'aggressive' = 'balanced'): BuyType {
  const avg = averageMoney(team);
  const alive = team.players.filter((p) => p.alive);
  const hasAwper = alive.some((p) => p.role === 'AWPer');
  if (isPistolRound(roundNumber, overtime)) return 'light';
  const thresholds = { ...MATCH_ECONOMY.buyThresholds };
  if (style === 'aggressive') {
    thresholds.full -= 350;
    thresholds.force -= 350;
  }
  if (style === 'conservative') {
    thresholds.full += 400;
    thresholds.force += 300;
  }
  if (hasAwper && avg >= thresholds.awp) return 'awp';
  if (avg >= thresholds.full) return 'full';
  if (avg >= thresholds.force) return 'force';
  if (avg >= thresholds.light) return 'light';
  return 'eco';
}

interface PurchaseResult {
  spent: number;
  notes: string[];
}

function tryBuy(
  player: MatchPlayerState,
  weaponId: string,
  side: Side,
  result: PurchaseResult,
  opts: { armor?: boolean; helmet?: boolean; utility?: boolean } = {},
): void {
  const weapon = WEAPON_MAP[weaponId];
  if (!weapon) return;
  if (player.money < weapon.cost) return;
  if (player.equipment.weaponId === weaponId) return;
  player.money -= weapon.cost;
  player.equipment.weaponId = weaponId;
  result.spent += weapon.cost;
  result.notes.push(weapon.name);

  if (opts.armor && player.equipment.armor < 100 && player.money >= MATCH_ECONOMY.armorCost) {
    player.money -= MATCH_ECONOMY.armorCost;
    player.equipment.armor = 100;
    result.spent += MATCH_ECONOMY.armorCost;
  }
  if (opts.helmet && !player.equipment.helmet && player.money >= MATCH_ECONOMY.helmetCost) {
    player.money -= MATCH_ECONOMY.helmetCost;
    player.equipment.helmet = true;
    result.spent += MATCH_ECONOMY.helmetCost;
  }
  if (opts.utility) {
    const costs = MATCH_ECONOMY.utilityCosts;
    (['flash', 'smoke', 'molotov', 'he'] as const).forEach((kind) => {
      if (player.equipment.utilities[kind] < 2 && player.money >= costs[kind]) {
        player.money -= costs[kind];
        player.equipment.utilities[kind] += 1;
        result.spent += costs[kind];
      }
    });
  }
  void side;
}

/**
 * Applies a buy strategy to a whole team. Survivors keep their weapons; dead
 * players respawn with a default pistol. Money never drops below zero.
 */
export function applyBuy(team: TeamState, buy: BuyType, roundNumber: number, overtime: number): PurchaseResult {
  const result: PurchaseResult = { spent: 0, notes: [] };
  const side = team.side;
  const pistolRound = isPistolRound(roundNumber, overtime);

  team.players.forEach((player) => {
    if (pistolRound) {
      player.equipment = {
        weaponId: defaultPistol(side).id,
        armor: 0,
        helmet: false,
        utilities: { flash: 0, smoke: 0, molotov: 0, he: 0 },
      };
      if (player.money >= 300) tryBuy(player, 'p250', side, result);
      return;
    }
    if (!player.alive) {
      // Died last round: back to a pistol, keeps armour if it survived.
      const current = WEAPON_MAP[player.equipment.weaponId];
      if (!current || current.kind === 'awp' || current.kind === 'rifle') {
        player.equipment.weaponId = defaultPistol(side).id;
      }
    }
    const hasPrimary = ['rifle', 'awp', 'smg'].includes((WEAPON_MAP[player.equipment.weaponId] ?? WEAPON_MAP.glock).kind);

    if (buy === 'eco') {
      if (!hasPrimary && player.money >= 700 && player.money < MATCH_ECONOMY.buyThresholds.force) {
        tryBuy(player, 'p250', side, result);
      }
      return;
    }

    if (buy === 'light') {
      if (!hasPrimary) {
        const smg = smgFor(side);
        if (player.money >= smg.cost) tryBuy(player, smg.id, side, result, { armor: player.money > 2200 });
        else if (player.money >= 700) tryBuy(player, 'deagle', side, result);
      } else if (player.money >= MATCH_ECONOMY.helmetCost && !player.equipment.helmet) {
        tryBuy(player, player.equipment.weaponId, side, result, { helmet: true });
      }
      return;
    }

    if (buy === 'force') {
      if (!hasPrimary) {
        if (player.money >= 2050) {
          const cheap = side === 'T' ? 'galil' : 'famas';
          tryBuy(player, cheap, side, result, { armor: player.money > 1300 });
        } else if (player.money >= 1250) {
          tryBuy(player, smgFor(side).id, side, result);
        } else if (player.money >= 700) {
          tryBuy(player, 'deagle', side, result);
        }
      }
      if (player.money >= MATCH_ECONOMY.armorCost) {
        player.money -= MATCH_ECONOMY.armorCost;
        player.equipment.armor = 100;
        result.spent += MATCH_ECONOMY.armorCost;
      }
      if (player.equipment.utilities.flash < 1 && player.money >= MATCH_ECONOMY.utilityCosts.flash) {
        player.money -= MATCH_ECONOMY.utilityCosts.flash;
        player.equipment.utilities.flash += 1;
        result.spent += MATCH_ECONOMY.utilityCosts.flash;
      }
      return;
    }

    if (buy === 'awp' && player.role === 'AWPer') {
      const awp = WEAPON_MAP.awp;
      if (player.money >= awp.cost) {
        tryBuy(player, 'awp', side, result, { armor: true, helmet: player.money > 1200, utility: player.money > 1600 });
        return;
      }
    }

    // full buy
    if (!hasPrimary) {
      const rifle = rifleFor(side);
      if (player.money >= rifle.cost) {
        tryBuy(player, rifle.id, side, result, { armor: true, helmet: true, utility: player.money > 1200 });
      } else if (player.money >= smgFor(side).cost) {
        tryBuy(player, smgFor(side).id, side, result, { armor: true });
      } else if (player.money >= 700) {
        tryBuy(player, 'deagle', side, result, { armor: player.money >= 1400 });
      }
      return;
    }
    // Already armed: top up armour and utility.
    if (player.equipment.armor < 100 && player.money >= MATCH_ECONOMY.armorCost) {
      player.money -= MATCH_ECONOMY.armorCost;
      player.equipment.armor = 100;
      result.spent += MATCH_ECONOMY.armorCost;
    }
    if (!player.equipment.helmet && player.money >= MATCH_ECONOMY.helmetCost) {
      player.money -= MATCH_ECONOMY.helmetCost;
      player.equipment.helmet = true;
      result.spent += MATCH_ECONOMY.helmetCost;
    }
    (['flash', 'smoke', 'molotov', 'he'] as const).forEach((kind) => {
      if (player.equipment.utilities[kind] < 2 && player.money >= MATCH_ECONOMY.utilityCosts[kind]) {
        player.money -= MATCH_ECONOMY.utilityCosts[kind];
        player.equipment.utilities[kind] += 1;
        result.spent += MATCH_ECONOMY.utilityCosts[kind];
      }
    });
  });

  team.players.forEach((p) => {
    if (p.money > MATCH_ECONOMY.maxMoney) p.money = MATCH_ECONOMY.maxMoney;
    if (p.money < 0) p.money = 0;
  });
  return result;
}

/** End-of-round money. Winners get the round reward, losers climb the loss ladder. */
export function settleRoundEconomy(
  winnerTeam: TeamState,
  loserTeam: TeamState,
  bombPlantedByT: boolean,
  tSide: Side,
): void {
  winnerTeam.lossBonus = Math.max(0, winnerTeam.lossBonus - 1);
  loserTeam.lossBonus = Math.min(MATCH_ECONOMY.lossLadder.length - 1, loserTeam.lossBonus + 1);
  const lossReward = MATCH_ECONOMY.lossLadder[loserTeam.lossBonus];

  winnerTeam.players.forEach((p) => {
    p.money = Math.min(MATCH_ECONOMY.maxMoney, p.money + MATCH_ECONOMY.roundWinReward);
  });
  loserTeam.players.forEach((p) => {
    let reward = lossReward;
    if (tSide === 'T' && bombPlantedByT) reward += MATCH_ECONOMY.plantBonus;
    p.money = Math.min(MATCH_ECONOMY.maxMoney, p.money + reward);
  });

  if (tSide === 'CT' && !bombPlantedByT) {
    winnerTeam.players.forEach((p) => {
      p.money = Math.min(MATCH_ECONOMY.maxMoney, p.money + MATCH_ECONOMY.defuseBonus);
    });
  }
}

export function mapTempo(mapId: string): number {
  return MAPS[mapId as keyof typeof MAPS]?.tempo ?? 1;
}

export function killRewardFor(weaponId: string): number {
  return WEAPON_MAP[weaponId]?.killReward ?? 300;
}
