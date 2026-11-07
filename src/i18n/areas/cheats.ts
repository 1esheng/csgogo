/**
 * 修改器（作弊面板）的界面词条：中文 → 英文。
 * 面板里所有文案都走 tr()，所以英文模式下这里是唯一的翻译来源。
 */
export const PHRASES: { zh: string; en: string }[] = [
  { zh: "修改器", en: "Cheat panel" },
  { zh: "输入密码", en: "Enter password" },
  { zh: "密码", en: "Password" },
  { zh: "密码错误", en: "Wrong password" },
  { zh: "修改器已解锁", en: "Cheat panel unlocked" },
  { zh: "以下操作会直接改写本地存档，仅用于单机自娱。", en: "These actions rewrite your local save directly — single-player use only." },
  { zh: "只影响本机存档，不影响其他玩家。", en: "Local save only — no other players are affected." },

  // ── 分组标题 ──
  { zh: "经济", en: "Economy" },
  { zh: "卡牌", en: "Cards" },
  { zh: "抽卡", en: "Packs" },
  { zh: "教练", en: "Coaches" },
  { zh: "球队", en: "Team" },
  { zh: "生涯", en: "Career" },
  { zh: "存档", en: "Save" },
  { zh: "调试信息", en: "Debug info" },

  // ── 按钮 ──
  { zh: "+10,000 金币", en: "+10,000 coins" },
  { zh: "+100,000 金币", en: "+100,000 coins" },
  { zh: "金币清零", en: "Clear coins" },
  { zh: "解锁全部选手卡", en: "Unlock every player card" },
  { zh: "全部满级", en: "Max every level" },
  { zh: "全部满星", en: "Max every star" },
  { zh: "一键升星", en: "Star up everything" },
  { zh: "必出 UR（一次性）", en: "Guaranteed UR (one-shot)" },
  { zh: "免费开包", en: "Free packs" },
  { zh: "解锁全部教练", en: "Unlock every coach" },
  { zh: "主教练经验 +10,000", en: "Head coach XP +10,000" },
  { zh: "教练经验清零", en: "Clear coach XP" },
  { zh: "全队属性 +10", en: "Team attributes +10" },
  { zh: "自动补齐首发", en: "Auto-fill starters" },
  { zh: "直接判胜", en: "Force a win" },
  { zh: "解锁下一档联赛", en: "Unlock next league" },
  { zh: "重置生涯进度", en: "Reset career progress" },
  { zh: "导出存档 JSON", en: "Export save JSON" },
  { zh: "导入存档 JSON", en: "Import save JSON" },
  { zh: "清空全部进度", en: "Wipe all progress" },
  { zh: "开", en: "On" },
  { zh: "关", en: "Off" },

  // ── 调试信息 ──
  { zh: "卡牌数量", en: "Cards owned" },
  { zh: "教练数量", en: "Coaches" },
  { zh: "赛事档位", en: "League tier" },
  { zh: "存档版本", en: "Save version" },

  // ── 二次确认 ──
  { zh: "确认操作", en: "Confirm action" },
  { zh: "确认把金币清零？此操作无法撤销。", en: "Clear all coins? This cannot be undone." },
  { zh: "确认清空所有教练的执教经验？", en: "Clear every coach's XP?" },
  { zh: "确认重置生涯进度？段位、积分与奖杯都会清空。", en: "Reset career progress? Tier, points and trophies are all cleared." },
  { zh: "确认清空全部进度？这会删除存档并回到初始引导。", en: "Wipe all progress? The save is deleted and you return to onboarding." },

  // ── toast ──
  { zh: "金币已清零", en: "Coins cleared" },
  { zh: "已解锁全部选手卡", en: "Unlocked every player card" },
  { zh: "所有卡牌已满级", en: "Every card is at max level" },
  { zh: "所有卡牌已满星", en: "Every card is at max stars" },
  { zh: "一键升星完成", en: "Star-up complete" },
  { zh: "已解锁全部教练", en: "Unlocked every coach" },
  { zh: "主教练经验已增加", en: "Head coach XP raised" },
  { zh: "教练经验已清零", en: "Coach XP cleared" },
  { zh: "全队属性 +10 已开启", en: "Team attributes +10 enabled" },
  { zh: "全队属性 +10 已关闭", en: "Team attributes +10 disabled" },
  { zh: "已自动补齐首发", en: "Starters auto-filled" },
  { zh: "已判胜一场", en: "Fixture won" },
  { zh: "已解锁下一档联赛", en: "Next league unlocked" },
  { zh: "生涯进度已重置", en: "Career progress reset" },
  { zh: "已导出存档文件", en: "Save file exported" },
  { zh: "当前环境无法下载文件", en: "This environment cannot download files" },
  { zh: "存档已导入", en: "Save imported" },
  { zh: "无法读取该文件", en: "Cannot read that file" },
  { zh: "进度已清空", en: "Progress wiped" },
  { zh: "必出 UR 已开启（下次十连生效）", en: "Guaranteed UR armed for the next ten-pull" },
  { zh: "必出 UR 已关闭", en: "UR guarantee off" },
  { zh: "免费开包已开启", en: "Free packs enabled" },
  { zh: "免费开包已关闭", en: "Free packs disabled" },
  { zh: "先解锁一位教练。", en: "Unlock a coach first." },

  // ── store 返回的错误句 ──
  { zh: "当前没有进行中的赛事。", en: "No event is running right now." },
  { zh: "这届赛事已经没有待打的比赛了。", en: "No fixtures left in this event." },
];
