// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { it } from 'vitest';
import fs from 'node:fs';
import { useGameStore } from '@/stores/gameStore';
import { avatarCount } from '@/data/avatars';
it('seed57', async () => {
  await useGameStore.getState().newGame('头像覆盖');
  useGameStore.setState({ club: { ...useGameStore.getState().club, coins: 60000 } });
  useGameStore.getState().openPack(20);
  fs.writeFileSync('public/_seed57.json', JSON.stringify(useGameStore.getState().snapshot()));
  console.log('SEED57 avatars', avatarCount());
});