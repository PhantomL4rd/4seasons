import type { Oklab } from 'culori/fn';
import { dyes } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, Season } from '$lib/types';
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

function findClosestDye(
  targetOklab: Oklab,
  excludeIds: Set<string>
): DyeWithOklab & { deltaE: number } {
  let best: DyeWithOklab | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const d of dyesWithOklab) {
    if (excludeIds.has(d.dye.id)) continue;
    const delta = deltaEOklab(targetOklab, d.oklab);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = d;
    }
  }

  if (!best) {
    // 除外IDが多すぎて見つからない場合は制約を緩和
    return { ...dyesWithOklab[0], deltaE: bestDelta };
  }

  return { ...best, deltaE: bestDelta };
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
      const match = findClosestDye(targetOklab, usedIds);
      usedIds.add(match.dye.id);
      results.push({
        dye: match.dye,
        hex,
        deltaE: match.deltaE,
        role: 'base',
      });
    } catch {
      // 不正なhex値はスキップ
    }
  }

  // アクセントカラーをマッチング
  for (const hex of accentHexes) {
    try {
      const targetOklab = hexToOklab(hex);
      const match = findClosestDye(targetOklab, usedIds);
      usedIds.add(match.dye.id);
      results.push({
        dye: match.dye,
        hex,
        deltaE: match.deltaE,
        role: 'accent',
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
      const match = findClosestDye(targetOklab, usedIds);
      usedIds.add(match.dye.id);
      results.push({
        dye: match.dye,
        hex,
        deltaE: match.deltaE,
        role: 'avoid',
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
  return dyeIds
    .map((id, i) => {
      const dye = dyes.find((d) => d.id === id);
      if (!dye) return null;
      const rgb = dye.rgb;
      const hex =
        `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toUpperCase();
      return {
        dye,
        hex,
        deltaE: 0,
        role: (i < 6 ? 'base' : 'accent') as MatchedDye['role'],
      };
    })
    .filter((d): d is MatchedDye => d !== null);
}
