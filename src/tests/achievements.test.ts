import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '@/data/achievements';
import { createNewGame } from '@/game/starter';

describe('achievement catalog', () => {
  it('ships 24 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(24);
  });

  it('keeps every id unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every achievement both languages', () => {
    ACHIEVEMENTS.forEach((a) => {
      expect(a.name.trim().length, a.id + ' name').toBeGreaterThan(0);
      expect(a.nameEn.trim().length, a.id + ' nameEn').toBeGreaterThan(0);
      expect(a.desc.trim().length, a.id + ' desc').toBeGreaterThan(0);
      expect(a.descEn.trim().length, a.id + ' descEn').toBeGreaterThan(0);
    });
  });

  it('pays a positive coin reward with a positive target', () => {
    ACHIEVEMENTS.forEach((a) => {
      expect(a.reward, a.id + ' reward').toBeGreaterThan(0);
      expect(Number.isInteger(a.reward), a.id + ' reward').toBe(true);
      expect(a.target, a.id + ' target').toBeGreaterThan(0);
    });
  });

  it('evaluates every tracker on a fresh save without throwing', () => {
    const snapshot = createNewGame('Achievement Test');
    ACHIEVEMENTS.forEach((a) => {
      const value = a.value(snapshot);
      expect(Number.isFinite(value), a.id).toBe(true);
      expect(value, a.id).toBeGreaterThanOrEqual(0);
    });
  });

  it('starts the new career, collection and coach goals unclaimed on a fresh save', () => {
    const snapshot = createNewGame('Achievement Test');
    const newIds = ['major1', 'majorChamp', 'tierSweep', 'unbeaten10', 'ur5', 'star5', 'level10', 'cards200', 'coachS1', 'headCoach5'];
    newIds.forEach((id) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      expect(ach, id).toBeDefined();
      expect(ach!.value(snapshot), id).toBeLessThan(ach!.target);
    });
  });
});
