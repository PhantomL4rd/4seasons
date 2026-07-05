import { describe, expect, it } from 'vitest';
import type { Season } from '$lib/types';
import { deriveSeason, resolveSecondarySeason } from './season';

describe('deriveSeason', () => {
  it('warm + clear は spring', () => {
    expect(deriveSeason({ undertone: 'warm', chroma: 'clear' })).toBe('spring');
  });

  it('warm + soft は autumn', () => {
    expect(deriveSeason({ undertone: 'warm', chroma: 'soft' })).toBe('autumn');
  });

  it('cool + soft は summer', () => {
    expect(deriveSeason({ undertone: 'cool', chroma: 'soft' })).toBe('summer');
  });

  it('cool + clear は winter', () => {
    expect(deriveSeason({ undertone: 'cool', chroma: 'clear' })).toBe('winter');
  });
});

describe('resolveSecondarySeason', () => {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  it('主季節と異なるサブ申告はそのまま採用する', () => {
    expect(resolveSecondarySeason('spring', 'autumn')).toBe('autumn');
    expect(resolveSecondarySeason('winter', 'summer')).toBe('summer');
  });

  it('主季節と同じサブ申告は必ず別の季節に差し替える', () => {
    for (const season of seasons) {
      expect(resolveSecondarySeason(season, season)).not.toBe(season);
    }
  });

  it('差し替え後も4シーズンのいずれか', () => {
    for (const season of seasons) {
      expect(seasons).toContain(resolveSecondarySeason(season, season));
    }
  });
});
