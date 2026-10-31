import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';

/** 实时电竞世界：前端每 60 秒推进一轮 AI 对局并刷新排行榜。 */
export function useLiveWorld(intervalMs = 60_000) {
  const tick = useGameStore((s) => s.tickLiveWorld);
  const enabled = useGameStore((s) => s.liveWorld.enabled);
  const ready = useGameStore((s) => s.club.id !== '');
  useEffect(() => {
    if (!enabled || !ready) return undefined;
    const id = window.setInterval(() => tick(), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, ready, intervalMs, tick]);
}
