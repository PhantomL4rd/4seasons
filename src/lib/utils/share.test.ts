import { describe, expect, it } from 'vitest';
import type { MatchedDye } from '$lib/types';
import { buildDyeNamesText } from './share';

function makeDye(id: string, name: string): MatchedDye {
  return {
    dye: { id, name, category: 'white', rgb: { r: 0, g: 0, b: 0 }, tags: [], lodestone: '' },
    hex: '#000000',
    deltaE: 0,
    role: 'base',
  };
}

const untranslated = (key: string) => key;

describe('buildDyeNamesText', () => {
  it('推奨染料が6件あっても、先頭4件までしか文言に含まれない', () => {
    const dyes = Array.from({ length: 6 }, (_, i) => makeDye(`dye-${i}`, `染料${i}`));

    const text = buildDyeNamesText(dyes, untranslated);

    for (let i = 0; i < 4; i++) {
      expect(text).toContain(`染料${i}`);
    }
    for (let i = 4; i < 6; i++) {
      expect(text).not.toContain(`染料${i}`);
    }
  });

  it('推奨染料が4件以下のときはすべて文言に含まれる', () => {
    const dyes = Array.from({ length: 2 }, (_, i) => makeDye(`dye-${i}`, `染料${i}`));

    const text = buildDyeNamesText(dyes, untranslated);

    expect(text).toBe('染料0、染料1');
  });
});
