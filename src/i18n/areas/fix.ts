/** 训练页修复（Hooks 顺序 / 整队训练费用一致 / 移动端紧凑选手选择）新增的英文词条，由修复子智能体维护。 */
export const PHRASES: { zh: string; en: string }[] = [
  // ── 移动端紧凑选手选择 ──
  { zh: "当前选手", en: "Current player" },
  { zh: "换人", en: "Change" },
  { zh: "选择选手", en: "Pick a player" },
  { zh: "搜索选手", en: "Search players" },
  { zh: "清空搜索", en: "Clear search" },

  // ── 空态 ──
  { zh: "还没有可训练的卡牌", en: "No trainable cards yet" },
  { zh: "先从卡包签下第一位选手——之后每张卡牌都可以通过训练获得经验与永久属性成长。", en: "Sign your first player from a pack — after that every card can gain XP and permanent growth through training." },
  { zh: "没有符合搜索条件的卡牌", en: "No card matches your search" },
  { zh: "清空搜索框即可看到全部收藏。", en: "Clear the search box to see your full collection." },

  // ── 整队训练：费用预览与实际结果 ──
  { zh: "现在阵容", en: "Current lineup" },
  { zh: "按当前首发五人一键训练——同名卡一起升级，按人数扣费。", en: "Train the starting five in one tap — duplicate copies level together and you pay per player." },
  { zh: "首发阵容还是空的——先到「阵容」页面指派 5 名选手。", en: "Your lineup is empty — assign five players on the Lineup page first." },
  { zh: "人：", en: "players: " },
  { zh: "训练项目", en: "Drill" },
  { zh: " 金币/人）", en: " coins/player)" },
  { zh: "一键训练全队", en: "Train the whole squad" },
  { zh: " 金币）", en: " coins)" },
  { zh: "训练 ", en: "Train " },
  { zh: " 人", en: " players" },
  { zh: "可完整训练全队 ", en: "Full squad training available: " },
  { zh: " 人，共 ", en: " players, " },
  { zh: "金币不足，本次只能训练 ", en: "Not enough coins — this run trains only " },
  { zh: " 人，花费 ", en: " players for " },
  { zh: " 金币，剩余 ", en: " coins; " },
  { zh: " 人未训练。", en: " players are skipped." },
  { zh: "金币不足，连一名首发都训练不了——先去打比赛赚金币。", en: "Not enough coins to train even one starter — play matches to earn more." },
  { zh: "首发的选手都已满级，不需要再训练。", en: "Every starter is at the level cap — no training needed." },
  { zh: "上次整队训练：", en: "Last squad session: " },
  { zh: " 人 · 实付 ", en: " players · paid " },
  { zh: "金币不足，无法进行任何训练。打比赛可以赚取更多金币。", en: "Not enough coins for any training. Play matches to earn more." },
];
