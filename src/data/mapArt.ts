import type { MapId } from '@/types';
import mirage from '@/assets/maps/mirage.png';
import inferno from '@/assets/maps/inferno.png';
import nuke from '@/assets/maps/nuke.png';
import ancient from '@/assets/maps/ancient.png';
import anubis from '@/assets/maps/anubis.png';
import dust2 from '@/assets/maps/dust2.png';

/** 地图缩略图（自绘抽象战术图，非真实地图）。缺图时回退 null，由调用方画占位。 */
export const MAP_ART: Partial<Record<MapId, string>> = {
  Mirage: mirage,
  Inferno: inferno,
  Nuke: nuke,
  Ancient: ancient,
  Anubis: anubis,
  Dust2: dust2,
};
