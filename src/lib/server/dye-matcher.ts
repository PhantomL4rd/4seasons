import { dyes, getDyesBySeason } from '$lib/data/dyes';
import { seasonFallbackDyes } from '$lib/data/season-palettes';
import type { Dye, MatchedDye, RecommendedDyeCandidates, Season } from '$lib/types';

const dyeMap = new Map<string, Dye>(dyes.map((d) => [d.id, d]));

export function dyeToHex(dye: Dye): string {
  const { r, g, b } = dye.rgb;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Geminiに提示するカタログの対象染料か（metallic / vivid は対象外）。
 * gemini.ts のカタログ生成と +server.ts の返却ID検証で共有する。
 */
export function isCatalogDye(dye: Dye): boolean {
  return !dye.tags.includes('metallic') && !dye.tags.includes('vivid');
}

export interface ResolveDyeOptions {
  /** Geminiに提示したカタログ範囲（metallic / vivid 除外）に限定する */
  catalogOnly?: boolean;
  /** 同一カテゴリからは最初の1色のみ採用する */
  uniqueCategory?: boolean;
  /** 除外する染料ID（推奨と回避の重複排除用） */
  excludeIds?: ReadonlySet<string>;
}

/**
 * Geminiが選んだ染料IDリストを検証し、MatchedDye[]に変換する
 * 存在しないIDは無視する
 */
export function resolveDyeIds(
  dyeIds: string[],
  role: 'base' | 'avoid',
  options: ResolveDyeOptions = {}
): MatchedDye[] {
  const results: MatchedDye[] = [];
  const usedIds = new Set<string>();
  const usedCategories = new Set<string>();

  for (const id of dyeIds) {
    if (usedIds.has(id)) continue;
    if (options.excludeIds?.has(id)) continue;
    const dye = dyeMap.get(id);
    if (!dye) continue;
    if (options.catalogOnly && !isCatalogDye(dye)) continue;
    if (options.uniqueCategory && usedCategories.has(dye.category)) continue;
    usedIds.add(id);
    usedCategories.add(dye.category);
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

export interface SampleRecommendedOptions {
  /** primary 候補から採用する上限（デフォルト 4） */
  primaryCount?: number;
  /** secondary 候補から採用する上限（デフォルト 2） */
  secondaryCount?: number;
  /** 除外する染料ID（avoid との重複排除用） */
  excludeIds?: ReadonlySet<string>;
  /** 乱数源（テスト差し替え用、デフォルト Math.random） */
  random?: () => number;
}

/**
 * 拡大した候補プールからランダムにサンプリングして推奨6色を作る。
 * Gemini が同じ染料を毎回上位に置くことによる「しつこい」推奨を緩和するため、
 * Gemini には多めの候補（primary 8, secondary 4）を返させ、ここで振り分ける。
 *
 * カタログ外（metallic/vivid）除外・1カテゴリ1色・ID重複なし・excludeIds は resolveDyeIds と同挙動。
 * 不足分の補充は呼び出し側の fillRecommendedDyes に委ねる（責務分離）。
 */
export function sampleRecommendedDyes(
  candidates: RecommendedDyeCandidates,
  options: SampleRecommendedOptions = {}
): MatchedDye[] {
  const primaryCount = options.primaryCount ?? 4;
  const secondaryCount = options.secondaryCount ?? 2;
  const random = options.random ?? Math.random;

  const usedIds = new Set<string>();
  const usedCategories = new Set<string>();
  const results: MatchedDye[] = [];

  const takeFrom = (pool: string[], limit: number) => {
    const shuffled = shuffleArray(pool, random);
    let taken = 0;
    for (const id of shuffled) {
      if (taken >= limit) break;
      if (usedIds.has(id)) continue;
      if (options.excludeIds?.has(id)) continue;
      const dye = dyeMap.get(id);
      if (!dye) continue;
      if (!isCatalogDye(dye)) continue;
      if (usedCategories.has(dye.category)) continue;
      usedIds.add(id);
      usedCategories.add(dye.category);
      results.push({ dye, hex: dyeToHex(dye), deltaE: 0, role: 'base' });
      taken++;
    }
  };

  takeFrom(candidates.primary, primaryCount);
  takeFrom(candidates.secondary, secondaryCount);

  return results;
}

export interface SampleAvoidOptions {
  /** サンプリング上限（デフォルト 3） */
  count?: number;
  /** 除外する染料ID（推奨と重複したときの排除用） */
  excludeIds?: ReadonlySet<string>;
  /** 乱数源（テスト差し替え用、デフォルト Math.random） */
  random?: () => number;
}

/**
 * avoid（苦手色）の候補プールから count 色をランダムサンプリングする。
 * uniqueCategory 制約は付けない（「同系統の避けたい色」を並べたい場面があるため
 * 現行 resolveDyeIds('avoid') の挙動に揃える）。
 */
export function sampleAvoidDyes(
  candidateIds: string[],
  options: SampleAvoidOptions = {}
): MatchedDye[] {
  const count = options.count ?? 3;
  const random = options.random ?? Math.random;

  const usedIds = new Set<string>();
  const results: MatchedDye[] = [];

  for (const id of shuffleArray(candidateIds, random)) {
    if (results.length >= count) break;
    if (usedIds.has(id)) continue;
    if (options.excludeIds?.has(id)) continue;
    const dye = dyeMap.get(id);
    if (!dye) continue;
    if (!isCatalogDye(dye)) continue;
    usedIds.add(id);
    results.push({ dye, hex: dyeToHex(dye), deltaE: 0, role: 'avoid' });
  }

  return results;
}

/** Fisher-Yates（引数は変更せず新配列を返す） */
function shuffleArray<T>(source: readonly T[], random: () => number): T[] {
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 推奨染料が target 色に満たない場合に補充する。
 * Geminiの推奨5-6色目はサブ季節へのブリッジ枠で、主季節の色とカテゴリが
 * 被って uniqueCategory に間引かれやすいため、補充元はサブ季節の候補色を
 * 優先し、足りなければ主季節の定番パレットを使う。
 * カタログ制約・1カテゴリ1色・ID重複なしは維持したまま足す。
 */
export function fillRecommendedDyes(
  current: MatchedDye[],
  primarySeason: Season,
  secondarySeason: Season,
  target = 6
): MatchedDye[] {
  if (current.length >= target) return current;

  const candidateIds = [
    ...(secondarySeason !== primarySeason
      ? getDyesBySeason(secondarySeason).map((dye) => dye.id)
      : []),
    ...seasonFallbackDyes[primarySeason],
  ];

  const usedIds = new Set(current.map((matched) => matched.dye.id));
  const usedCategories = new Set<string>(current.map((matched) => matched.dye.category));
  const filled = [...current];

  for (const id of candidateIds) {
    if (filled.length >= target) break;
    if (usedIds.has(id)) continue;
    const dye = dyeMap.get(id);
    if (!dye || !isCatalogDye(dye)) continue;
    if (usedCategories.has(dye.category)) continue;
    usedIds.add(id);
    usedCategories.add(dye.category);
    filled.push({ dye, hex: dyeToHex(dye), deltaE: 0, role: 'base' });
  }

  return filled;
}
