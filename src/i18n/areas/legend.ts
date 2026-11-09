/** 「传奇」标签 的英文词条（由子智能体维护，勿与其它分区混写）。
 *
 * 说明：徽标里的「传奇」二字复用 phrases.ts 里已有的全局词条，但在英文下用
 * pick() 强制显示 LEGEND（对应的是本标签，而不是 SSR 稀有度的 Legendary），
 * 所以这里不重复登记「传奇」，避免覆盖稀有度文案。
 */
export const PHRASES: { zh: string; en: string }[] = [
  { zh: "自", en: "since" },
  { zh: "年征战", en: "pro career" },
  { zh: "只看传奇", en: "Legends only" },
];
