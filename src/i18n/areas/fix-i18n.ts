/**
 * 双语完整性修复（P1-5）新增词条：新建俱乐部、顶栏 / 侧边栏、训练与设置页的界面文案。
 * 结构与其它 areas 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 * 接线由协调方在 src/i18n/phrases.ts 中统一完成。
 */
export const PHRASES: { zh: string; en: string }[] = [
  // —— 顶栏 / 侧边栏 ——
  { zh: '菜单', en: 'Menu' },

  // —— 新建俱乐部（Onboarding）——
  { zh: '王朝电竞', en: 'Dynasty Esports' },
  { zh: '· 初始 5,000 金币与五张选手卡', en: '· Start with 5,000 Coins and five player cards' },
  { zh: '· 全离线存档（IndexedDB），无需账号、不联网', en: '· Fully offline saves in IndexedDB — no account, no network' },
  { zh: '· 真正的逐回合比赛引擎（MR12 与加时）', en: '· A true round-by-round engine with MR12 and overtime' },

  // —— 启动加载 ——
  { zh: '正在载入王朝…', en: 'Loading Dynasty…' },
];
