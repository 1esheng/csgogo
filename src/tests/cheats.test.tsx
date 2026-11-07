// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CheatPanel } from '@/features/cheats/CheatPanel';
import { CHEAT_PASSWORD, SAVE_FILE_NAME, debugInfo, verifyCheatPassword } from '@/features/cheats/cheats';
import { useGameStore } from '@/stores/gameStore';
import { clearDatabase, loadSave } from '@/db/db';
import { parseSaveFile } from '@/db/save';
import { GAME_VERSION, LEVEL_CONFIG, PACK_CONFIG } from '@/data/config';
import { TEMPLATE_MAP } from '@/data/cards';
import { COMBAT_ROLES } from '@/types';

const FLAGS_OFF = { freePacks: false, guaranteeUR: false, teamBoost: false };

async function freshClub(name = 'Cheat FC') {
  await clearDatabase();
  useGameStore.setState({ cheatFlags: { ...FLAGS_OFF } });
  await useGameStore.getState().newGame(name);
  return useGameStore.getState();
}

function openGate() {
  fireEvent.click(screen.getByRole('button', { name: /修改器/ }));
}

function submitPassword(value: string) {
  fireEvent.change(screen.getByLabelText('密码'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: '确认' }));
}

function unlockPanel() {
  openGate();
  submitPassword(CHEAT_PASSWORD);
}

beforeEach(async () => {
  await freshClub();
});

afterEach(() => {
  cleanup();
  useGameStore.setState({ cheatFlags: { ...FLAGS_OFF } });
});

describe('cheat panel gate', () => {
  it('keeps the panel closed when the password is wrong', () => {
    render(<CheatPanel />);
    openGate();
    expect(screen.getByRole('dialog')).toBeTruthy();

    submitPassword('nope');
    expect(screen.getByText('密码错误')).toBeTruthy();
    expect(screen.queryByText('经济')).toBeNull();
    expect(screen.queryByText('调试信息')).toBeNull();
  });

  it('opens the panel with the right password and re-locks after closing', () => {
    render(<CheatPanel />);
    unlockPanel();
    expect(screen.getByText('经济')).toBeTruthy();
    expect(screen.getByText('调试信息')).toBeTruthy();
    expect(screen.queryByText('密码错误')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.queryByText('经济')).toBeNull();

    // 再次打开：必须重新输口令
    openGate();
    expect(screen.getByLabelText('密码')).toBeTruthy();
    expect(screen.queryByText('经济')).toBeNull();
  });

  it('reads end to end in English', async () => {
    await freshClub('EN FC');
    useGameStore.setState({ settings: { ...useGameStore.getState().settings, language: 'en' } });

    render(<CheatPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Cheat panel/ }));
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: CHEAT_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('Economy')).toBeTruthy();
    expect(screen.getByText('Debug info')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+10,000 coins' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Free packs/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Unlock every player card/ })).toBeTruthy();
  });

  it('recognises the shared password constant', () => {
    expect(CHEAT_PASSWORD).toBe('lesheng');
    expect(verifyCheatPassword(CHEAT_PASSWORD)).toBe(true);
    expect(verifyCheatPassword('  lesheng  ')).toBe(true);
    expect(verifyCheatPassword('leshen')).toBe(false);
    expect(SAVE_FILE_NAME).toBe('cs2-dynasty-save.json');
  });
});

describe('cheat panel actions', () => {
  it('grants coins through the store and writes them back to disk', async () => {
    render(<CheatPanel />);
    unlockPanel();
    const before = useGameStore.getState().club.coins;

    fireEvent.click(screen.getByRole('button', { name: '+10,000 金币' }));
    expect(useGameStore.getState().club.coins).toBe(before + 10000);

    fireEvent.click(screen.getByRole('button', { name: '+100,000 金币' }));
    expect(useGameStore.getState().club.coins).toBe(before + 110000);

    await useGameStore.getState().saveNow();
    const saved = await loadSave();
    expect(saved?.club.coins).toBe(before + 110000);
  });

  it('asks for confirmation before a destructive action', () => {
    render(<CheatPanel />);
    unlockPanel();
    fireEvent.click(screen.getByRole('button', { name: '+10,000 金币' }));

    fireEvent.click(screen.getByRole('button', { name: '金币清零' }));
    expect(screen.getByText('确认把金币清零？此操作无法撤销。')).toBeTruthy();
    // 还没确认，金币没动
    expect(useGameStore.getState().club.coins).toBe(15000);

    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(useGameStore.getState().club.coins).toBe(0);
  });

  it('unlocks every card template and maxes level and stars on all of them', () => {
    render(<CheatPanel />);
    unlockPanel();
    const totalTemplates = Object.keys(TEMPLATE_MAP).length;

    fireEvent.click(screen.getByRole('button', { name: new RegExp('解锁全部选手卡') }));
    expect(useGameStore.getState().cards.length).toBe(totalTemplates);

    fireEvent.click(screen.getByRole('button', { name: '全部满级' }));
    expect(useGameStore.getState().cards.every((c) => c.level === LEVEL_CONFIG.maxLevel)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '全部满星' }));
    expect(useGameStore.getState().cards.every((c) => (c.stars ?? 1) === 5)).toBe(true);
  });

  it('bumps every card by one star and stops at five', async () => {
    await freshClub('Bump FC');
    const touched = useGameStore.getState().cheatTuneCards({ starsBump: 1 });
    expect(touched).toBe(useGameStore.getState().cards.length);
    expect(useGameStore.getState().cards.every((c) => c.stars === 2)).toBe(true);

    useGameStore.getState().cheatTuneCards({ stars: 5 });
    expect(useGameStore.getState().cheatTuneCards({ starsBump: 1 })).toBe(0);
    expect(useGameStore.getState().cards.every((c) => c.stars === 5)).toBe(true);
  });

  it('selects five different players when auto-filling the starters', async () => {
    await freshClub('Fill FC');
    useGameStore.setState({
      squad: { slots: { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null }, igl: null, synergy: 42, matchesTogether: 0 },
    });
    expect(useGameStore.getState().squadRating().filled).toBe(0);

    render(<CheatPanel />);
    unlockPanel();
    fireEvent.click(screen.getByRole('button', { name: '自动补齐首发' }));

    const after = useGameStore.getState();
    const ids = COMBAT_ROLES.map((role) => after.squad.slots[role]).filter((id): id is string => Boolean(id));
    expect(ids.length).toBe(5);
    const templateIds = ids.map((id) => after.cards.find((c) => c.instanceId === id)!.templateId);
    expect(new Set(templateIds).size).toBe(5);
    expect(after.squadRating().filled).toBe(5);
  });
});

describe('cheat pull modifiers', () => {
  it('consumes the guaranteed UR flag exactly once', async () => {
    await freshClub('UR FC');
    useGameStore.setState({ club: { ...useGameStore.getState().club, coins: 200000 } });
    useGameStore.getState().setCheatFlags({ guaranteeUR: true });

    // 单抽不消费这个标记（只对十连生效）
    expect(useGameStore.getState().openPack(1)).not.toBeNull();
    expect(useGameStore.getState().cheatFlags.guaranteeUR).toBe(true);

    const ten = useGameStore.getState().openPack(10)!;
    expect(ten.length).toBe(10);
    const forced = ten[ten.length - 1];
    expect(forced.rarity).toBe('UR');
    expect(TEMPLATE_MAP[forced.template.id].rarity).toBe('UR');
    // 标记用完即关，而且这张 UR 真的进了收藏
    expect(useGameStore.getState().cheatFlags.guaranteeUR).toBe(false);
    expect(useGameStore.getState().cards.some((c) => c.templateId === forced.template.id)).toBe(true);

    // 再开一次十连：标记已关闭，不会自动再补一张 UR（只校验标记状态）
    useGameStore.getState().openPack(10);
    expect(useGameStore.getState().cheatFlags.guaranteeUR).toBe(false);
  });

  it('opens packs for free while the flag is on', async () => {
    await freshClub('Free FC');
    const poor = PACK_CONFIG.tenPrice - 1;
    useGameStore.setState({ club: { ...useGameStore.getState().club, coins: poor } });

    useGameStore.getState().setCheatFlags({ freePacks: true });
    expect(useGameStore.getState().openPack(10)).not.toBeNull();
    expect(useGameStore.getState().club.coins).toBe(poor);

    useGameStore.getState().setCheatFlags({ freePacks: false });
    expect(useGameStore.getState().openPack(10)).toBeNull();
    expect(useGameStore.getState().club.coins).toBe(poor);
  });
});

describe('cheat team and career actions', () => {
  it('applies the team attribute bonus and reverts it when switched off', async () => {
    await freshClub('Boost FC');
    const before = useGameStore.getState().squadRating();
    useGameStore.getState().setCheatFlags({ teamBoost: true });
    const boosted = useGameStore.getState().squadRating();
    expect(boosted.ovr).toBeGreaterThan(before.ovr);
    expect(boosted.attack).toBeGreaterThan(before.attack);

    useGameStore.getState().setCheatFlags({ teamBoost: false });
    expect(useGameStore.getState().squadRating().ovr).toBe(before.ovr);
    // 存档里的卡牌没有被改写
    const saved = useGameStore.getState().snapshot();
    expect(saved.customTemplates.length).toBe(0);
  });

  it('unlocks every coach and pushes the head coach over the next level', async () => {
    await freshClub('Coach FC');
    const added = useGameStore.getState().cheatGrantAllCoaches();
    expect(added).toBeGreaterThan(0);
    expect(useGameStore.getState().coaches.length).toBe(added);
    expect(useGameStore.getState().headCoachId).not.toBeNull();

    useGameStore.getState().cheatCoachXp({ add: 10000 });
    const head = useGameStore.getState().coaches.find((c) => c.instanceId === useGameStore.getState().headCoachId)!;
    expect(useGameStore.getState().coachXp[head.instanceId]).toBe(10000);
    expect(Math.floor(useGameStore.getState().coachXp[head.instanceId] / 100)).toBeGreaterThanOrEqual(100);

    useGameStore.getState().cheatCoachXp({ reset: true });
    expect(useGameStore.getState().coaches.every((c) => c.xp === 0)).toBe(true);
    expect(useGameStore.getState().coachXp[head.instanceId]).toBe(0);
  });

  it('raises the career tier by one step and can reset it', async () => {
    await freshClub('Tier FC');
    expect(useGameStore.getState().career.tier).toBe(0);
    expect(useGameStore.getState().cheatAdvanceTier()).toBe(1);
    expect(useGameStore.getState().career.tier).toBe(1);
    expect(useGameStore.getState().leaders.find((l) => l.id === 'player')!.tier).toBe(1);

    useGameStore.getState().cheatResetCareer();
    expect(useGameStore.getState().career.tier).toBe(0);
    expect(useGameStore.getState().tournaments).toEqual([]);
  });

  it('refuses to force a win when no event is running', async () => {
    await freshClub('No Cup FC');
    const result = useGameStore.getState().cheatWinFixture();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('当前没有进行中的赛事。');
  });
});

describe('cheat save round trip', () => {
  it('exports and re-imports an identical save', async () => {
    await freshClub('Roundtrip FC');
    useGameStore.getState().openPack(1);
    await useGameStore.getState().saveNow();
    const before = useGameStore.getState();
    const json = await before.exportSave();
    expect(parseSaveFile(json).ok).toBe(true);

    await useGameStore.getState().newGame('Other Club');
    const result = await useGameStore.getState().importSave(json);
    expect(result.ok).toBe(true);
    const after = useGameStore.getState();
    expect(after.club.name).toBe('Roundtrip FC');
    expect(after.club.coins).toBe(before.club.coins);
    expect(after.cards.length).toBe(before.cards.length);
    expect(after.squad.slots).toEqual(before.squad.slots);
  });

  it('keeps a max-level save importable', async () => {
    await freshClub('Maxed FC');
    useGameStore.getState().cheatTuneCards({ level: LEVEL_CONFIG.maxLevel, stars: 5 });
    const json = await useGameStore.getState().exportSave();
    const parsed = parseSaveFile(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.snapshot!.cards.every((c) => c.level === LEVEL_CONFIG.maxLevel)).toBe(true);
    expect(parsed.snapshot!.cards.every((c) => c.stars === 5)).toBe(true);
  });

  it('reports live counters for the debug block', () => {
    const info = debugInfo(useGameStore.getState(), GAME_VERSION);
    expect(info.coins).toBe(useGameStore.getState().club.coins);
    expect(info.cards).toBe(useGameStore.getState().cards.length);
    expect(info.tier).toBe(useGameStore.getState().career.tier);
    expect(info.version).toBe(GAME_VERSION);
  });
});
