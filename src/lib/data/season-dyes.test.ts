import { describe, expect, it } from 'vitest';
import { getDyesBySeason } from '$lib/data/dyes';
import type { DyeCategory, Season } from '$lib/types';

const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

describe('season-dyes', () => {
  it.each(seasons)('%s: 各カテゴリが最低2色ある', (season) => {
    const counts = new Map<DyeCategory, number>();

    for (const dye of getDyesBySeason(season)) {
      counts.set(dye.category, (counts.get(dye.category) ?? 0) + 1);
    }

    for (const [category, count] of counts) {
      expect(count, `${season}.${category} has only ${count} dyes`).toBeGreaterThanOrEqual(2);
    }
  });
});
