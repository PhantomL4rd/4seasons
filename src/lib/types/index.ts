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

export interface ColorPalette {
  base: string[];
}

/** Gemini APIから返される構造化レスポンス */
export interface GeminiDiagnosisResponse {
  characterCount: number;
  isFaceVisible: boolean;
  isRealHuman: boolean;
  result: SeasonResult;
  palette: ColorPalette;
  colorsToAvoid: string[];
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
  remaining?: number;
}
