// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { makeCard } from '@/game/starter';
import { GalleryPage } from '@/pages/GalleryPage';

it('升星按钮点击后真的合成并显示星级', async () => {
  await useGameStore.getState().newGame('UI 合成');
  useGameStore.setState({ cards: [makeCard('tpl-donk-2026', 1), makeCard('tpl-donk-2026', 1), makeCard('tpl-donk-2026', 1)] });
  const { container } = render(<MemoryRouter><GalleryPage /></MemoryRouter>);
  fireEvent.click([...container.querySelectorAll('button')].find((b) => /卡牌合成/.test(b.textContent || ''))!);
  await new Promise((r) => setTimeout(r, 60));
  const btn = [...container.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '升星') as HTMLButtonElement;
  expect(btn).toBeTruthy();
  fireEvent.click(btn);
  await new Promise((r) => setTimeout(r, 80));
  const cards = useGameStore.getState().cards;
  expect(cards.length).toBe(1);
  expect(cards[0].stars).toBe(2);
  // 合成后该行从列表消失（只剩 1 张，不够 3 张）
  const stillThere = [...container.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === '升星');
  expect(stillThere).toBe(false);
  cleanup();
});