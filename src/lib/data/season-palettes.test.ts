import { describe, expect, it } from 'vitest';
import { getDyeById } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import { isCatalogDye } from '$lib/server/dye-matcher';

// フォールバックパレットのIDが実データと乖離していた回帰の再発防止
describe('seasonFallbackDyes', () => {
  const seasons = Object.entries(seasonFallbackDyes);

  it.each(seasons)('%s: 全IDが実在の染料を指す', (_season, ids) => {
    for (const id of ids) {
      expect(getDyeById(id), `${id} が dyes.json に存在しない`).toBeDefined();
    }
  });

  it.each(seasons)('%s: 全染料がカタログ対象（metallic / vivid でない）', (_season, ids) => {
    for (const id of ids) {
      const dye = getDyeById(id);
      expect(dye && isCatalogDye(dye), `${id} はカタログ対象外`).toBe(true);
    }
  });

  it.each(seasons)('%s: ID重複がない', (_season, ids) => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(seasons)('%s: 名前がコメントの意図（英名）と一致する', (season, ids) => {
    const expectedNames: Record<string, string[]> = {
      spring: [
        'Coral Pink',
        'Salmon Pink',
        'Sunset Orange',
        'Honey Yellow',
        'Cream Yellow',
        'Celeste Green',
        'Pastel Blue',
        'Pastel Pink',
        'Rose Pink',
      ],
      summer: [
        'Lilac Purple',
        'Pastel Pink',
        'Pastel Blue',
        'Dark Blue',
        'Ash Grey',
        'Turquoise Green',
        'Vanilla Yellow',
        'Rose Pink',
        'Snow White',
      ],
      autumn: [
        'Rust Red',
        'Sunset Orange',
        'Cork Brown',
        'Kobold Brown',
        'Chestnut Brown',
        'Olive Green',
        'Moss Green',
        'Wine Red',
        'Hunter Green',
      ],
      winter: [
        'Soot Black',
        'Snow White',
        'Dalamud Red',
        'Blood Red',
        'Royal Blue',
        'Dark Blue',
        'Gloom Purple',
        'Slate Grey',
        'Charcoal Grey',
      ],
    };
    expect(ids.map((id) => getDyeById(id)?.name)).toEqual(expectedNames[season]);
  });
});
