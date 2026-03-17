import { dyes } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, Season } from '$lib/types';
import { createNearestFinder, hexToOklab, rgb255ToOklab } from '$lib/utils/color';

interface DyeWithOklab {
  dye: Dye;
  oklab: ReturnType<typeof rgb255ToOklab>;
}

/** Oklab色空間から色相バンド(0-5)を算出。低彩度は'neutral'を返す */
const HUE_BANDS = 6; // 60度ごとに6分割
const CHROMA_THRESHOLD = 0.04; // これ以下は無彩色扱い

function getHueBand(oklab: { a: number; b: number }): string {
  const chroma = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
  if (chroma < CHROMA_THRESHOLD) return 'neutral';
  const hue = ((Math.atan2(oklab.b, oklab.a) * 180) / Math.PI + 360) % 360;
  return `hue_${Math.floor(hue / (360 / HUE_BANDS))}`;
}

// 全染料のOklab値を事前計算（メタリック除外）
const dyesWithOklab: DyeWithOklab[] = dyes
  .filter((dye) => !dye.tags.includes('metallic'))
  .map((dye) => ({
    dye,
    oklab: rgb255ToOklab(dye.rgb),
  }));

// culoriのnearest()でOklab空間の近傍探索を行う
const findNearest = createNearestFinder(dyesWithOklab, (d) => d.oklab);

/**
 * 指定hexに最も近い染料を返す
 * excludeIdsに含まれるカラーラントはスキップ
 */
function findClosestDye(hex: string, excludeIds: Set<string>): { dye: Dye; deltaE: number } {
  const targetOklab = hexToOklab(hex);

  // 十分な候補を取得（除外分を考慮して多めに）
  const results = findNearest(targetOklab, excludeIds.size + 1);

  const filtered = results.filter((r) => !excludeIds.has(r.color.dye.id));

  if (filtered.length === 0) {
    // 除外IDが多すぎて見つからない場合は制約を緩和
    const fallback = findNearest(targetOklab, 1);
    return { dye: fallback[0].color.dye, deltaE: fallback[0].distance };
  }

  return { dye: filtered[0].color.dye, deltaE: filtered[0].distance };
}

/**
 * 指定hexに最も近い染料を返す（色相バンド重複制約付き）
 * excludeIds: 既に使用済みの染料ID
 * usedHueBands: 既に使用済みの色相バンド（同一バンドは最大1色）
 */
function findClosestDyeWithDiversity(
  hex: string,
  excludeIds: Set<string>,
  usedHueBands: Set<string>
): { dye: Dye; deltaE: number } {
  const targetOklab = hexToOklab(hex);

  // 十分な候補を取得
  const results = findNearest(targetOklab, excludeIds.size + usedHueBands.size + 10);

  // 色相バンド重複も除外
  const filtered = results.filter(
    (r) => !excludeIds.has(r.color.dye.id) && !usedHueBands.has(getHueBand(r.color.oklab))
  );

  if (filtered.length === 0) {
    // 色相バンド制約を緩和してID重複だけ避ける
    const relaxed = results.filter((r) => !excludeIds.has(r.color.dye.id));
    if (relaxed.length === 0) {
      const fallback = findNearest(targetOklab, 1);
      return { dye: fallback[0].color.dye, deltaE: fallback[0].distance };
    }
    return { dye: relaxed[0].color.dye, deltaE: relaxed[0].distance };
  }

  return { dye: filtered[0].color.dye, deltaE: filtered[0].distance };
}

/**
 * Geminiの推奨hex値をゲーム内染料にマッチングする
 * 同一色相バンドの染料は最大1色まで（多様性制約）
 */
export function matchDyes(baseHexes: string[]): MatchedDye[] {
  const usedIds = new Set<string>();
  const usedHueBands = new Set<string>();
  const results: MatchedDye[] = [];

  for (const hex of baseHexes) {
    try {
      const { dye, deltaE } = findClosestDyeWithDiversity(hex, usedIds, usedHueBands);
      usedIds.add(dye.id);
      usedHueBands.add(getHueBand(dyesWithOklab.find((d) => d.dye.id === dye.id)!.oklab));
      results.push({ dye, hex, deltaE, role: 'base' });
    } catch {
      // 不正なhex値はスキップ
    }
  }

  return results;
}

/**
 * 苦手なhex値をゲーム内染料にマッチングする
 */
export function matchAvoidDyes(avoidHexes: string[], excludeIds: Set<string>): MatchedDye[] {
  const usedIds = new Set(excludeIds);
  const results: MatchedDye[] = [];

  for (const hex of avoidHexes) {
    try {
      const { dye, deltaE } = findClosestDye(hex, usedIds);
      usedIds.add(dye.id);
      results.push({ dye, hex, deltaE, role: 'avoid' });
    } catch {
      // 不正なhex値はスキップ
    }
  }

  return results;
}

/**
 * フォールバック: シーズンに基づいた定番染料を返す
 */
export function getFallbackDyes(season: Season): MatchedDye[] {
  const dyeIds = seasonFallbackDyes[season];
  const results: MatchedDye[] = [];
  for (const dyeId of dyeIds) {
    const dye = dyes.find((d) => d.id === dyeId);
    if (!dye) continue;
    const rgb = dye.rgb;
    const hex =
      `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toUpperCase();
    results.push({ dye, hex, deltaE: 0, role: 'base' });
  }
  return results;
}
