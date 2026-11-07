/**
 * 修改器（作弊面板）的纯逻辑：口令、调试信息、文件读写。
 * 所有状态改写都必须回到 gameStore 的 action，这里只放无副作用的辅助函数。
 */
import type { GameSnapshot } from '@/types';

/**
 * 修改器口令。
 * 纯前端常量——它只用来挡住误触，任何能读源码的人都能看到，不构成安全措施。
 */
export const CHEAT_PASSWORD = 'lesheng';

/** 导出文件名（与设置页的存档工具保持一致）。 */
export const SAVE_FILE_NAME = 'cs2-dynasty-save.json';

/** 校验口令：忽略首尾空白。 */
export function verifyCheatPassword(input: string): boolean {
  return input.trim() === CHEAT_PASSWORD;
}

/** 把文本存成下载文件；浏览器环境不可用时返回 false。 */
export function downloadText(fileName: string, text: string, mime = 'application/json'): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

/** 读取用户挑选的存档文件；空文件直接报错，避免把空字符串喂给 importSave。 */
export async function readTextFile(file: File): Promise<string> {
  const text = await file.text();
  if (!text.trim()) throw new Error('empty save file');
  return text;
}

export interface CheatDebugInfo {
  coins: number;
  cards: number;
  coaches: number;
  tier: number;
  version: number;
}

/** 面板底部只读的调试数字。 */
export function debugInfo(
  snapshot: Pick<GameSnapshot, 'club' | 'cards' | 'coaches' | 'career'>,
  version: number,
): CheatDebugInfo {
  return {
    coins: snapshot.club.coins,
    cards: snapshot.cards.length,
    coaches: (snapshot.coaches ?? []).length,
    tier: snapshot.career.tier,
    version,
  };
}
