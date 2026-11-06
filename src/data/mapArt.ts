import type { MapId } from '@/types';
import mirage from '@/assets/maps/mirage.png';

/** 地图缩略图（自绘抽象战术图，非真实地图）。缺图时回退 null，由调用方画占位。 */
export const MAP_ART: Partial<Record<MapId, string>> = {
  Mirage: mirage,
};
