import { dyes } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, Season } from '$lib/types';
import { createNearestFinder, hexToOklab, rgb255ToOklab } from '$lib/utils/color';

interface DyeWithOklab {
  dye: Dye;
  oklab: ReturnType<typeof rgb255ToOklab>;
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
 * Geminiの推奨hex値をゲーム内染料にマッチングする
 */
export function matchDyes(baseHexes: string[]): MatchedDye[] {
  const usedIds = new Set<string>();
  const results: MatchedDye[] = [];

  for (const hex of baseHexes) {
    try {
      const { dye, deltaE } = findClosestDye(hex, usedIds);
      usedIds.add(dye.id);
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
