import { dyes } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, Season } from '$lib/types';

const dyeMap = new Map<string, Dye>(dyes.map((d) => [d.id, d]));

export function dyeToHex(dye: Dye): string {
  const { r, g, b } = dye.rgb;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Geminiが選んだ染料IDリストを検証し、MatchedDye[]に変換する
 * 存在しないIDは無視する
 */
export function resolveDyeIds(dyeIds: string[], role: 'base' | 'avoid'): MatchedDye[] {
  const results: MatchedDye[] = [];
  const usedIds = new Set<string>();

  for (const id of dyeIds) {
    if (usedIds.has(id)) continue;
    const dye = dyeMap.get(id);
    if (!dye) continue;
    usedIds.add(id);
    results.push({ dye, hex: dyeToHex(dye), deltaE: 0, role });
  }

  return results;
}

/**
 * フォールバック: シーズンに基づいた定番染料を返す
 */
export function getFallbackDyes(season: Season): MatchedDye[] {
  const dyeIds = seasonFallbackDyes[season];
  return resolveDyeIds(dyeIds, 'base');
}
