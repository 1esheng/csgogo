// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '@/app/nav';
import { translate } from '@/i18n';

describe('navigation surface', () => {
  it('exposes every page exactly once', () => {
    const paths = NAV_ITEMS.map((i) => i.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('/');
    expect(paths.length).toBeGreaterThanOrEqual(11);
  });

  it('has an English label for every nav item', () => {
    for (const item of NAV_ITEMS) {
      expect(translate('en', item.labelKey)).not.toBe(item.labelKey);
    }
  });
});
