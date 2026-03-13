import type { Oklab } from 'culori/fn';
import { dyes } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, NearestDye, Season } from '$lib/types';
import { deltaEOklab, hexToOklab, rgb255ToOklab } from '$lib/utils/color';

interface DyeWithOklab {
  dye: Dye;
  oklab: Oklab;
}

// 全染料のOklab値を事前計算
const dyesWithOklab: DyeWithOklab[] = dyes.map((dye) => ({
  dye,
  oklab: rgb255ToOklab(dye.rgb),
}));

interface DyeCandidate {
  dye: Dye;
  deltaE: number;
}

/**
 * ターゲット色に対してΔEでソートした候補リストを返す
 * colorant-pickerのfindNearestDyesInOklabパターンを参考
 */
function findSortedCandidates(targetOklab: Oklab, excludeIds: Set<string>): DyeCandidate[] {
  const candidates: DyeCandidate[] = dyesWithOklab
    .filter((d) => !excludeIds.has(d.dye.id))
    .map((d) => ({
      dye: d.dye,
      deltaE: deltaEOklab(targetOklab, d.oklab),
    }));
  return candidates.sort((a, b) => a.deltaE - b.deltaE);
}

/**
 * ベストマッチ + 次点のNearestDyeを返す
 */
function findClosestDyeWithNearest(
  targetOklab: Oklab,
  excludeIds: Set<string>
): { best: DyeCandidate; nearestDye: NearestDye | null } {
  const candidates = findSortedCandidates(targetOklab, excludeIds);

  if (candidates.length === 0) {
    // 除外IDが多すぎて見つからない場合は制約を緩和
    const fallback = findSortedCandidates(targetOklab, new Set());
    return {
      best: fallback[0],
      nearestDye: fallback[1] ? { dye: fallback[1].dye, deltaE: fallback[1].deltaE } : null,
    };
  }

  const best = candidates[0];
  // 次点はベストマッチとは別のカラーラント
  const second = candidates[1] ?? null;
  const nearestDye: NearestDye | null = second ? { dye: second.dye, deltaE: second.deltaE } : null;

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
      const targetOklab = hexToOklab(hex);
      const { best, nearestDye } = findClosestDyeWithNearest(targetOklab, usedIds);
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
      const targetOklab = hexToOklab(hex);
      const { best, nearestDye } = findClosestDyeWithNearest(targetOklab, usedIds);
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
      const targetOklab = hexToOklab(hex);
      const { best, nearestDye } = findClosestDyeWithNearest(targetOklab, usedIds);
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
