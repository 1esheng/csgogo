// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  Attributes, CardTemplate, MapProficiency, MapId, MatchStatLine, MatchSummary, Role, RoleProficiency,
} from '@/types';
import { MAP_IDS, ROLE_LABEL } from '@/types';
import { setLang, tr } from '@/i18n';
import { REASON_LABEL } from '@/data/config';
import { localizeRoundText, roundLabel, roundReasonText, winLossText } from '@/i18n/display';
import { moneyLabel } from '@/features/matches/matchUi';
import { CardDetailBody } from '@/components/CardDetail';
import { RecordDetailBody } from '@/features/career/RecordDetail';
import { PostMatch } from '@/features/matches/PostMatch';
import { PHRASES as SWEEP } from '@/i18n/areas/zh-sweep';

/** zh-sweep 分区的英文侧（接线前也校验词条本身正确）。 */
const SWEEP_EN = new Map(SWEEP.map((row) => [row.zh, row.en]));

const ATTRS: Attributes = {
  aim: 82, reflex: 78, positioning: 74, gameSense: 72, utility: 70, teamwork: 76, clutch: 68, leadership: 60,
};
const PROFICIENCY: RoleProficiency = { AWPer: 70, Entry: 40, Lurker: 45, Support: 50, Anchor: 55, IGL: 60 };
const MAP_PROFICIENCY = Object.fromEntries(MAP_IDS.map((id) => [id, 60])) as MapProficiency;

const TEMPLATE: CardTemplate = {
  id: 'tpl-zh-sweep',
  playerId: 'zh-sweep-player',
  season: '2024',
  rarity: 'UR',
  primaryRole: 'AWPer',
  secondaryRole: 'IGL',
  attributes: ATTRS,
  proficiency: PROFICIENCY,
  mapProficiency: MAP_PROFICIENCY,
  skill: { id: 'skill', name: '枪法专精', icon: '', description: '示例天赋', kind: 'attribute', key: 'aim', value: 3 },
  growth: 1,
};

function line(over: Partial<MatchStatLine> & { nickname: string }): MatchStatLine {
  const base: MatchStatLine = {
    cardInstanceId: 'card-' + over.nickname,
    playerId: 'player-' + over.nickname,
    nickname: over.nickname,
    teamId: 'player',
    side: 'T',
    kills: 0, deaths: 0, assists: 0, adr: 0, kast: 0, kd: 0, rating: 1,
    openingKills: 0, openingDeaths: 0, multiKills: 0, clutches: 0, damage: 0, rounds: 20,
  };
  return { ...base, ...over };
}

const LINES: MatchStatLine[] = [
  line({ nickname: 'alpha', kills: 20, deaths: 10, assists: 5, adr: 100, rating: 1.31, kast: 72, kd: 2 }),
  line({ nickname: 'bravo', teamId: 'liquid', side: 'CT', kills: 12, deaths: 12, rating: 1.02, kast: 66, kd: 1 }),
];

/** 旧存档里的关键回合文案是英文，渲染期必须翻译成结算屏的中文写法。 */
const SUMMARY: MatchSummary = {
  id: 'm-zh-sweep',
  playedAt: Date.UTC(2024, 0, 2, 3, 4),
  mapId: 'Mirage' as MapId,
  opponentName: '对手队',
  teamName: '我方队',
  scoreFor: 13,
  scoreAgainst: 10,
  won: true,
  roundsPlayed: 23,
  seed: 3,
  scoreboard: LINES,
  mvp: LINES[0],
  coins: 120,
  xp: 120,
  keyRounds: [{ roundNumber: 19, winner: 'T', text: 'Round 19: bomb detonation (9:10)' }],
  mode: 'quick',
};

afterEach(() => {
  cleanup();
  setLang('zh');
});

describe('回合原因：全站一套映射', () => {
  it('六种原因都翻成结算屏的中文写法', () => {
    expect(roundReasonText('bomb', tr)).toBe('炸弹爆炸');
    expect(roundReasonText('defuse', tr)).toBe('残局拆包');
    expect(roundReasonText('clutch', tr)).toBe('残局');
    expect(roundReasonText('ace', tr)).toBe('五杀');
    expect(roundReasonText('time', tr)).toBe('时间耗尽');
    expect(roundReasonText('elimination', tr)).toBe('歼灭');
  });

  it('引擎 reason code 与旧存档英文串走同一份映射', () => {
    expect(roundReasonText('bomb detonation', tr)).toBe(roundReasonText('bomb', tr));
    expect(roundReasonText('clutch defuse', tr)).toBe(roundReasonText('defuse', tr));
    expect(roundReasonText('time expired', tr)).toBe(roundReasonText('time', tr));
  });

  it('REASON_LABEL 是唯一的中文来源（结算屏 / 弹窗 / 回放共用）', () => {
    expect(REASON_LABEL.bomb).toBe('炸弹爆炸');
    expect(REASON_LABEL.defuse).toBe('残局拆包');
    expect(REASON_LABEL.time).toBe('时间耗尽');
    expect(REASON_LABEL.elimination).toBe('歼灭');
  });

  it('旧存档英文串解析成「第 N 回合 · 原因（比分）」', () => {
    expect(localizeRoundText('Round 19: bomb detonation (9:10)', tr)).toBe('第 19 回合 · 炸弹爆炸（9:10）');
    expect(localizeRoundText('Round 22: ace (10:10)', tr)).toBe('第 22 回合 · 五杀（10:10）');
    expect(localizeRoundText('Round 3: clutch defuse (2:1)', tr)).toBe('第 3 回合 · 残局拆包（2:1）');
  });

  it('无法识别的文案原样返回，不吞数据', () => {
    expect(localizeRoundText('半场结束', tr)).toBe('半场结束');
  });

  it('回合前缀 R19 改成「第 19 回合」', () => {
    expect(roundLabel(19)).toBe('第 19 回合');
    expect(roundLabel(1)).toBe('第 1 回合');
  });
});

describe('角色名：列表页与详情弹窗共用 ROLE_LABEL', () => {
  it('六个位置都输出中文', () => {
    const roles = Object.keys(ROLE_LABEL) as Role[];
    expect(roles.map((role) => tr(ROLE_LABEL[role]))).toEqual([
      '狙击手', '突破手', '自由人', '辅助', '主防', '指挥',
    ]);
  });

  it('图鉴卡牌详情弹窗的「位置熟练度」不再是 AWPer', () => {
    const { container } = render(
      <CardDetailBody
        template={TEMPLATE}
        nickname='tester'
        countryCode='CN'
        ovr={83}
        level={1}
        stars={1}
        xpPct={0.5}
        xpLabel='100 经验'
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('位置熟练度');
    expect(text).toContain('狙击手');
    expect(text).not.toContain('AWPer');
    expect(text).not.toContain('IGL');
  });
});

describe('战绩与比分文案', () => {
  it('顶栏 2W0L 写成 2胜0负', () => {
    expect(winLossText(2, 0, tr)).toBe('2胜0负');
    expect(winLossText(2, 1, tr)).toBe('2胜1负');
  });

  it('经济对比用「对」而不是 v', () => {
    const versus = moneyLabel(3100) + ' ' + tr('对') + ' ' + moneyLabel(2800);
    expect(versus).toBe('$3.1k 对 $2.8k');
    expect(versus).toContain('对');
  });
});

describe('结算屏与战绩弹窗同源', () => {
  it('赛后结算屏把旧英文关键回合翻成中文', () => {
    const { container } = render(
      <MemoryRouter>
        <PostMatch summary={SUMMARY} onExit={() => {}} />
      </MemoryRouter>,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('第 19 回合 · 炸弹爆炸（9:10）');
    expect(text).not.toContain('bomb detonation');
    expect(text).not.toContain('R19');
  });

  it('战绩详情弹窗显示同一句中文，且不再是整段英文', () => {
    const { container } = render(<RecordDetailBody summary={SUMMARY} />);
    const text = container.textContent ?? '';
    expect(text).toContain('第 19 回合');
    expect(text).toContain('第 19 回合 · 炸弹爆炸（9:10）');
    expect(text).not.toContain('bomb detonation');
    expect(text).not.toContain('R19');
  });
});

describe('zh-sweep 词条表', () => {
  it('新清扫的文案都有正确的英文侧', () => {
    expect(SWEEP_EN.get('歼灭')).toBe('elimination');
    expect(SWEEP_EN.get('残局拆包')).toBe('clutch defuse');
    expect(SWEEP_EN.get('五杀')).toBe('ace');
    expect(SWEEP_EN.get('对')).toBe('v');
    expect(SWEEP_EN.get('快速进攻')).toBe('Fast rush');
    expect(SWEEP_EN.get('昵称排序 A–Z')).toBe('Nickname A–Z');
    expect(SWEEP_EN.get('BO1 · 一局定胜负')).toBe('BO1 · one map');
    expect(SWEEP_EN.get('BO3 · 三局两胜')).toBe('BO3 · best of three');
    expect(SWEEP_EN.get('中路控制、窗户对狙，永恒的路人局路线')).toContain('pug route');
    expect(SWEEP_EN.get('按 BO1 / BO3 顺序推演禁用 / 挑选，结束后自动回填选图。')).toContain('ban-pick');
    expect(SWEEP_EN.get('每场比赛仅保存摘要数据。完整回放（含每个回合事件）只在本地数据库中保留最近 20 场，本页面不会加载。')).toContain('local database');
  });

  it('英文侧回合文案仍然正确', () => {
    setLang('en');
    expect(roundReasonText('bomb', tr)).toBe('bomb detonation');
    expect(roundReasonText('time', tr)).toBe('time ran out');
    expect(roundLabel(19)).toBe('Round 19');
    expect(winLossText(2, 0, tr)).toBe('2W0L');
    expect(localizeRoundText('Round 19: bomb detonation (9:10)', tr)).toContain('Round 19');
  });
});
