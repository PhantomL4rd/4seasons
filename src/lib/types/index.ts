export type TranslateFn = (key: string) => string;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Phase = 'upload' | 'preview' | 'loading' | 'result' | 'error';

export interface RGBColor255 {
  r: number;
  g: number;
  b: number;
}

export type DyeCategory =
  | 'white'
  | 'red'
  | 'brown'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'rare';

export interface Dye {
  id: string;
  name: string;
  category: DyeCategory;
  rgb: RGBColor255;
  tags: string[];
  lodestone: string;
}

export interface DyesData {
  dyes: Dye[];
}

export interface SeasonResult {
  season: Season;
}

export type Undertone = 'warm' | 'cool';
export type Contrast = 'high' | 'low';
export type Chroma = 'clear' | 'soft';

/** Geminiが season を選ぶ前に出力する観察結果 */
export interface SeasonAnalysis {
  undertone: Undertone;
  contrast: Contrast;
  chroma: Chroma;
  secondarySeason: Season;
}

/**
 * Geminiが返す推奨染料の候補プール。
 * サーバー側でランダムサンプリングして提案の多様性を出すため、
 * 表示に必要な数（6）より多めの候補を受け取る。
 */
export interface RecommendedDyeCandidates {
  /** 主季節向けの推奨候補（サンプリング前、8色を想定） */
  primary: string[];
  /** サブ季節向けの推奨候補（サンプリング前、4色を想定） */
  secondary: string[];
}

/** Gemini APIから返される構造化レスポンス */
export interface GeminiDiagnosisResponse {
  characterCount: number;
  isFaceVisible: boolean;
  isRealHuman: boolean;
  analysis: SeasonAnalysis;
  result: SeasonResult;
  /** Geminiが選んだ推奨染料の候補プール（主季節・サブ季節別） */
  recommendedDyeIds: RecommendedDyeCandidates;
  /** Geminiが直接選んだ苦手染料IDリスト */
  avoidDyeIds: string[];
}

export interface MatchedDye {
  dye: Dye;
  hex: string;
  deltaE: number;
  role: 'base' | 'avoid';
}

/** フロントエンド向けレスポンス */
export interface DiagnosisResponse {
  result: SeasonResult;
  recommendedDyes: MatchedDye[];
  dyesToAvoid: MatchedDye[];
}

/** LocalStorageに保存する診断結果の履歴エントリ */
export interface SavedResult {
  /** share URLの末尾（encodeShareDataの出力）と同一。復元・遷移先の特定に使う */
  id: string;
  season: Season;
  savedAt: number;
}
