import { describe, expect, it } from 'vitest';
import { getDyesBySeason } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import { fillRecommendedDyes, resolveDyeIds } from './dye-matcher';

// dye_104: rare/metallic, dye_017: red/vivid,
// dye_008, dye_009, dye_010: red, dye_065: blue（いずれも実データ）
const ids = (result: ReturnType<typeof resolveDyeIds>) => result.map((m) => m.dye.id);

describe('resolveDyeIds', () => {
  it('存在しないIDは無視する', () => {
    expect(ids(resolveDyeIds(['dye_008', 'dye_999'], 'base'))).toEqual(['dye_008']);
  });

  it('重複IDは1件にまとめる', () => {
    expect(ids(resolveDyeIds(['dye_008', 'dye_008'], 'base'))).toEqual(['dye_008']);
  });

  it('catalogOnly で metallic / vivid の染料を除外する', () => {
    const result = resolveDyeIds(['dye_104', 'dye_017', 'dye_008'], 'base', {
      catalogOnly: true,
    });
    expect(ids(result)).toEqual(['dye_008']);
  });

  it('catalogOnly なしでは metallic も通す（フォールバック用の従来動作）', () => {
    expect(ids(resolveDyeIds(['dye_104'], 'base'))).toEqual(['dye_104']);
  });

  it('uniqueCategory で同一カテゴリは最初の1色のみ採用する', () => {
    const result = resolveDyeIds(['dye_008', 'dye_009', 'dye_065'], 'base', {
      uniqueCategory: true,
    });
    expect(ids(result)).toEqual(['dye_008', 'dye_065']);
  });

  it('excludeIds に含まれるIDを除外する（推奨と回避の重複排除）', () => {
    const result = resolveDyeIds(['dye_008', 'dye_065'], 'avoid', {
      excludeIds: new Set(['dye_008']),
    });
    expect(ids(result)).toEqual(['dye_065']);
  });
});

// uniqueCategory の間引きで推奨が6色未満になった回帰（おすすめ4色事件）の再発防止
describe('fillRecommendedDyes', () => {
  // red / blue / green / white の4カテゴリを使用済みにする
  const fourDyes = () => resolveDyeIds(['dye_008', 'dye_065', 'dye_048', 'dye_002'], 'base');

  it('6色未満ならサブ季節の候補から補充して6色にする', () => {
    const filled = fillRecommendedDyes(fourDyes(), 'spring', 'autumn');
    expect(filled).toHaveLength(6);
  });

  it('補充後も1カテゴリ1色・ID重複なしを維持する', () => {
    const filled = fillRecommendedDyes(fourDyes(), 'spring', 'autumn');
    const categories = filled.map((m) => m.dye.category);
    expect(new Set(categories).size).toBe(filled.length);
    expect(new Set(ids(filled)).size).toBe(filled.length);
  });

  it('補充分はサブ季節候補または主季節定番パレット由来である', () => {
    const filled = fillRecommendedDyes(fourDyes(), 'spring', 'autumn');
    const candidatePool = new Set([
      ...getDyesBySeason('autumn').map((d) => d.id),
      ...seasonFallbackDyes.spring,
    ]);
    for (const added of filled.slice(4)) {
      expect(candidatePool.has(added.dye.id), `${added.dye.id} が補充候補外`).toBe(true);
    }
  });

  it('すでに6色あれば何もしない', () => {
    const six = resolveDyeIds(
      ['dye_008', 'dye_065', 'dye_048', 'dye_002', 'dye_025', 'dye_043'],
      'base'
    );
    expect(fillRecommendedDyes(six, 'spring', 'autumn')).toEqual(six);
  });

  it('サブ季節が主季節と同じでも定番パレットから補充する', () => {
    const filled = fillRecommendedDyes(fourDyes(), 'spring', 'spring');
    expect(filled.length).toBeGreaterThan(4);
  });
});
