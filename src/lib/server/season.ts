import type { Chroma, Season, SeasonAnalysis, Undertone } from '$lib/types';

/**
 * undertone × chroma → season の対応表。
 * gemini.ts のプロンプト生成と deriveSeason の両方がこの表を参照する（規則の二重管理防止）。
 * contrast は分類軸には使わない: プロンプト側で chroma 判定の補助
 * （high→clear寄り / low→soft寄り）として効かせ、導出はこの2軸のみで決定論的に行う。
 */
export const SEASON_RULE: Record<Undertone, Record<Chroma, Season>> = {
  warm: { clear: 'spring', soft: 'autumn' },
  cool: { clear: 'winter', soft: 'summer' },
};

/**
 * 観察結果から season を導出する。
 * Geminiの自己申告 season が観察結果と矛盾していても、この導出値を正とする。
 */
export function deriveSeason(analysis: Pick<SeasonAnalysis, 'undertone' | 'chroma'>): Season {
  return SEASON_RULE[analysis.undertone][analysis.chroma];
}

/**
 * 主季節と衝突しないサブ季節。undertone を維持した「同系統だが chroma が反対」を
 * デフォルト採用する（例: spring↔autumn は共に warm、summer↔winter は共に cool）。
 * サブ申告が主季節と一致しなければそのまま採用する。
 */
const SECONDARY_FALLBACK: Record<Season, Season> = {
  spring: 'autumn',
  autumn: 'spring',
  summer: 'winter',
  winter: 'summer',
};

export function resolveSecondarySeason(primary: Season, geminiSecondary: Season): Season {
  return geminiSecondary === primary ? SECONDARY_FALLBACK[primary] : geminiSecondary;
}
