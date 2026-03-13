import { dyes } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, NearestDye, Season } from '$lib/types';
import { createNearestFinder, hexToOklab, rgb255ToOklab } from '$lib/utils/color';

interface DyeWithOklab {
  dye: Dye;
  oklab: ReturnType<typeof rgb255ToOklab>;
}

// 全染料のOklab値を事前計算
const dyesWithOklab: DyeWithOklab[] = dyes.map((dye) => ({
  dye,
  oklab: rgb255ToOklab(dye.rgb),
}));

// culoriのnearest()でOklab空間の近傍探索を行う
const findNearest = createNearestFinder(dyesWithOklab, (d) => d.oklab);

/**
 * ベストマッチ + 次点のNearestDyeを返す
 * excludeIdsに含まれるカラーラントはスキップ
 */
function findClosestDyeWithNearest(
  hex: string,
  excludeIds: Set<string>
): { best: { dye: Dye; deltaE: number }; nearestDye: NearestDye | null } {
  const targetOklab = hexToOklab(hex);

  // 十分な候補を取得（除外分を考慮して多めに）
  const results = findNearest(targetOklab, excludeIds.size + 2);

  const filtered = results.filter((r) => !excludeIds.has(r.color.dye.id));

  if (filtered.length === 0) {
    // 除外IDが多すぎて見つからない場合は制約を緩和
    const fallback = findNearest(targetOklab, 2);
    return {
      best: { dye: fallback[0].color.dye, deltaE: fallback[0].distance },
      nearestDye: fallback[1] ? { dye: fallback[1].color.dye, deltaE: fallback[1].distance } : null,
    };
  }

  const best = { dye: filtered[0].color.dye, deltaE: filtered[0].distance };
  const second = filtered[1] ?? null;
  const nearestDye: NearestDye | null = second
    ? { dye: second.color.dye, deltaE: second.distance }
    : null;

  return { best, nearestDye };
}

/**
 * Geminiの推奨hex値をゲーム内染料にマッチングする
 */
export function matchDyes(baseHexes: string[], accentHexes: string[]): MatchedDye[] {
  const usedIds = new Set<string>();
  const results: MatchedDye[] = [];

  // ベースカラーをマッチング
  for (const hex of baseHexes) {
    try {
      const { best, nearestDye } = findClosestDyeWithNearest(hex, usedIds);
      usedIds.add(best.dye.id);
      results.push({
        dye: best.dye,
        hex,
        deltaE: best.deltaE,
        role: 'base',
        nearestDye,
      });
    } catch {
      // 不正なhex値はスキップ
    }
  }

  // アクセントカラーをマッチング
  for (const hex of accentHexes) {
    try {
      const { best, nearestDye } = findClosestDyeWithNearest(hex, usedIds);
      usedIds.add(best.dye.id);
      results.push({
        dye: best.dye,
        hex,
        deltaE: best.deltaE,
        role: 'accent',
        nearestDye,
      });
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
      const { best, nearestDye } = findClosestDyeWithNearest(hex, usedIds);
      usedIds.add(best.dye.id);
      results.push({
        dye: best.dye,
        hex,
        deltaE: best.deltaE,
        role: 'avoid',
        nearestDye,
      });
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
  for (let i = 0; i < dyeIds.length; i++) {
    const dye = dyes.find((d) => d.id === dyeIds[i]);
    if (!dye) continue;
    const rgb = dye.rgb;
    const hex =
      `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toUpperCase();
    results.push({
      dye,
      hex,
      deltaE: 0,
      role: i < 6 ? 'base' : 'accent',
      nearestDye: null,
    });
  }
  return results;
}
