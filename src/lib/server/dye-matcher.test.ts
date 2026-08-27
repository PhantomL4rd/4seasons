import { describe, expect, it } from 'vitest';
import { getDyesBySeason } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import {
  fillRecommendedDyes,
  resolveDyeIds,
  sampleAvoidDyes,
  sampleRecommendedDyes,
} from './dye-matcher';

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

  it('選択済みの色と知覚的にほぼ同じ色（deltaEOK < 0.05）は補充候補から除外される', () => {
    // dye_024 Kobold Brown(brown) と dye_094 Jet Black(rare) は deltaEOK ≈ 0.039 でほぼ同色。
    // カテゴリが異なるため 1カテゴリ1色 制約はすり抜け、近似色チェックがなければ補充されてしまう
    const current = resolveDyeIds(['dye_024'], 'base');
    const filled = fillRecommendedDyes(current, 'spring', 'winter', 8);
    expect(ids(filled)).not.toContain('dye_094');
  });
});

// 「同じ染料ばかり提案される」問題を解消するための候補プール拡大＆サンプリング機構
describe('sampleRecommendedDyes', () => {
  // 8色のprimary候補（red×3, brown, yellow, green×3, blue×2）と5色のsecondary候補
  const primary10 = [
    'dye_008', // red
    'dye_009', // red
    'dye_010', // red
    'dye_025', // brown
    'dye_043', // yellow
    'dye_048', // green
    'dye_051', // green
    'dye_062', // green
    'dye_065', // blue
    'dye_078', // blue
  ];
  const secondary5 = [
    'dye_002', // white
    'dye_095', // rare
    'dye_100', // rare
    'dye_101', // rare
    'dye_017', // red vivid → catalog外なのでskipされる
  ];

  // 決定的なseeded random（テスト用）
  const seeded = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  it('デフォルトで primary 4 + secondary 2 の計6色をサンプリングする', () => {
    const result = sampleRecommendedDyes(
      { primary: primary10, secondary: secondary5 },
      { random: seeded(1) }
    );
    expect(result).toHaveLength(6);
  });

  it('全て role=base として返す', () => {
    const result = sampleRecommendedDyes(
      { primary: primary10, secondary: secondary5 },
      { random: seeded(1) }
    );
    for (const m of result) expect(m.role).toBe('base');
  });

  it('catalog外（metallic / vivid）は候補から除外する', () => {
    const result = sampleRecommendedDyes(
      { primary: primary10, secondary: secondary5 },
      { random: seeded(7) }
    );
    expect(ids(result)).not.toContain('dye_017'); // vivid
  });

  it('1カテゴリ1色制約を守る（primary/secondaryをまたいで）', () => {
    const result = sampleRecommendedDyes(
      { primary: primary10, secondary: secondary5 },
      { random: seeded(3) }
    );
    const categories = result.map((m) => m.dye.category);
    expect(new Set(categories).size).toBe(result.length);
  });

  it('カテゴリが違っても知覚的にほぼ同じ色（deltaEOK < 0.05）は選ばれない', () => {
    // dye_007 Soot Black(white) と dye_061 Deepwood Green(green) は deltaEOK ≈ 0.023 でほぼ同色
    const result = sampleRecommendedDyes(
      { primary: ['dye_007', 'dye_061'], secondary: [] },
      { random: seeded(1), primaryCount: 2 }
    );
    expect(result).toHaveLength(1);
  });

  it('primary と secondary に同じIDがあっても重複しない', () => {
    const result = sampleRecommendedDyes(
      { primary: primary10, secondary: ['dye_008', ...secondary5] },
      { random: seeded(5) }
    );
    expect(new Set(ids(result)).size).toBe(result.length);
  });

  it('excludeIds に含まれるIDは選ばれない', () => {
    const result = sampleRecommendedDyes(
      { primary: primary10, secondary: secondary5 },
      { random: seeded(11), excludeIds: new Set(['dye_008', 'dye_009']) }
    );
    expect(ids(result)).not.toContain('dye_008');
    expect(ids(result)).not.toContain('dye_009');
  });

  it('乱数源が違えば選ばれるIDセットが変わる（多様性の担保）', () => {
    const a = ids(
      sampleRecommendedDyes({ primary: primary10, secondary: secondary5 }, { random: seeded(1) })
    );
    const b = ids(
      sampleRecommendedDyes({ primary: primary10, secondary: secondary5 }, { random: seeded(999) })
    );
    expect(a).not.toEqual(b);
  });

  it('primary が primaryCount 未満でも取れる分だけ返す（補充は呼び出し側）', () => {
    const result = sampleRecommendedDyes(
      { primary: ['dye_008'], secondary: [] },
      { random: seeded(1) }
    );
    expect(ids(result)).toEqual(['dye_008']);
  });
});

// avoid（苦手色）側も同じ発想で候補プールを拡大しサンプリングで多様性を出す
describe('sampleAvoidDyes', () => {
  const seeded = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };
  const avoid5 = [
    'dye_008', // red
    'dye_009', // red
    'dye_010', // red
    'dye_043', // yellow
    'dye_017', // red vivid → catalog外
  ];

  it('デフォルトで3色をサンプリングする', () => {
    const result = sampleAvoidDyes(avoid5, { random: seeded(1) });
    expect(result).toHaveLength(3);
  });

  it('全て role=avoid として返す', () => {
    const result = sampleAvoidDyes(avoid5, { random: seeded(1) });
    for (const m of result) expect(m.role).toBe('avoid');
  });

  it('catalog外（metallic / vivid）は候補から除外する', () => {
    const result = sampleAvoidDyes(avoid5, { random: seeded(5) });
    expect(ids(result)).not.toContain('dye_017');
  });

  it('excludeIds に含まれるID（推奨と重複）は選ばれない', () => {
    const result = sampleAvoidDyes(avoid5, {
      random: seeded(3),
      excludeIds: new Set(['dye_008', 'dye_009']),
    });
    expect(ids(result)).not.toContain('dye_008');
    expect(ids(result)).not.toContain('dye_009');
  });

  it('乱数源が違えば選ばれるIDセットが変わる（多様性の担保）', () => {
    const pool = ['dye_008', 'dye_009', 'dye_010', 'dye_043', 'dye_048', 'dye_051', 'dye_065'];
    const a = ids(sampleAvoidDyes(pool, { random: seeded(1) }));
    const b = ids(sampleAvoidDyes(pool, { random: seeded(999) }));
    expect(a).not.toEqual(b);
  });

  it('候補が count 未満でも取れる分だけ返す', () => {
    const result = sampleAvoidDyes(['dye_008'], { random: seeded(1) });
    expect(ids(result)).toEqual(['dye_008']);
  });

  it('重複IDは1件にまとめる', () => {
    const result = sampleAvoidDyes(['dye_008', 'dye_008', 'dye_009'], { random: seeded(1) });
    expect(new Set(ids(result)).size).toBe(result.length);
  });
});
