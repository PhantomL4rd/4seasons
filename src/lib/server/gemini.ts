import { dyes } from '$lib/data/dyes';
import type { Chroma, Contrast, GeminiDiagnosisResponse, Season, Undertone } from '$lib/types';
import { dyeToHex, isCatalogDye } from './dye-matcher';
import { deriveSeason, SEASON_RULE } from './season';

interface GeminiApiPart {
  text?: string;
}

interface GeminiApiCandidate {
  content?: {
    parts?: GeminiApiPart[];
  };
}

interface GeminiApiResponse {
  candidates?: GeminiApiCandidate[];
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** メタリック・ビビッド以外の全染料をコンパクトなカタログ形式で生成 */
function buildDyeCatalog(): string {
  return dyes
    .filter(isCatalogDye)
    .map((dye) => {
      return `${dye.id}:${dyeToHex(dye)} [${dye.category}] ${dye.name}`;
    })
    .join('\n');
}

/** SEASON_RULE からプロンプト用の導出規則行を生成する（コードとの規則drift防止） */
function buildSeasonRuleLines(): string {
  const undertones: readonly Undertone[] = ['warm', 'cool'];
  const chromas: readonly Chroma[] = ['clear', 'soft'];
  return undertones
    .flatMap((undertone) =>
      chromas.map((chroma) => `- ${undertone} + ${chroma} → ${SEASON_RULE[undertone][chroma]}`)
    )
    .join('\n');
}

function buildPrompt(): string {
  const catalog = buildDyeCatalog();
  return `Analyze game character screenshot for personal color season and select dyes from catalog.

# Screening
Report these observations honestly. Do NOT alter any other field based on them — the server handles rejection:
- isFaceVisible: true if the character's eyes and skin (or fur for non-human races) are visible. Hair covered by hats/hoods is fine. False for full helmets, masks, or back-of-head shots.
- isRealHuman: true if real photograph of a person, not CG/game/illustration.
- characterCount: the number of prominent foreground characters. Ignore small background figures (bystanders, distant players, minions).
If no character is analyzable, still fill every remaining field with your best guess; the server discards them.

# Analysis
From SKIN and EYES only (ignore hair color & CG lighting), determine:
- undertone: warm (yellow/peach/olive) vs cool (pink/rosy/blueish)
- contrast: high (skin/eyes differ in value) vs low (similar value)
- chroma: clear (vivid/intense) vs soft (muted/grayish). High contrast suggests clear, low contrast suggests soft.

Output "analysis" BEFORE "result".
result.season follows mechanically from undertone × chroma — apply exactly:
${buildSeasonRuleLines()}

analysis.secondarySeason: second-best fitting season, must differ from result.season.

Game notes: ignore CG lighting/shadows for undertone. Hair may inspire dye choices but not season.

Dye selection guide:
| Season | Recommend profile | Avoid profile |
| Spring | warm, light-medium, saturated, clean, fresh | cool, dusty/muted, very dark |
| Summer | cool, light-medium, low-saturation, powdery | warm, high-chroma, harsh contrast |
| Autumn | warm, medium-deep, mid-saturation, earthy, rich | icy-cool, pastel, neon, stark contrast |
| Winter | cool, deep/icy, high-saturation, sharp, dramatic | muddy, earthy-warm, soft/dull |

# Dye Catalog (id:hex [category] name)
${catalog}

# Output
recommendedDyeIds: 6 dye IDs, visually distinct (vary hue, lightness, saturation). Judge by hex, not name.
- Max 1 dye per [category]. Never pick 2+ dyes from the same category.
- 1-4: match result.season's Recommend profile.
- 5-6: bridge toward secondarySeason's Recommend profile.

avoidDyeIds: 3 dye IDs matching result.season's Avoid profile. No overlap with recommendedDyeIds.`;
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    isFaceVisible: { type: 'BOOLEAN' },
    isRealHuman: { type: 'BOOLEAN' },
    characterCount: { type: 'INTEGER' },
    analysis: {
      type: 'OBJECT',
      description: 'Show your reasoning BEFORE choosing a season',
      properties: {
        undertone: { type: 'STRING', enum: ['warm', 'cool'] },
        contrast: { type: 'STRING', enum: ['high', 'low'] },
        chroma: { type: 'STRING', enum: ['clear', 'soft'] },
        secondarySeason: {
          type: 'STRING',
          enum: ['spring', 'summer', 'autumn', 'winter'],
          description: 'The second-best fitting season for this character',
        },
      },
      required: ['undertone', 'contrast', 'chroma', 'secondarySeason'],
      propertyOrdering: ['undertone', 'contrast', 'chroma', 'secondarySeason'],
    },
    result: {
      type: 'OBJECT',
      properties: {
        season: { type: 'STRING', enum: ['spring', 'summer', 'autumn', 'winter'] },
      },
      required: ['season'],
    },
    recommendedDyeIds: {
      type: 'ARRAY',
      description: '6 dye IDs from the catalog that flatter this character',
      items: { type: 'STRING' },
    },
    avoidDyeIds: {
      type: 'ARRAY',
      description: '3 dye IDs that clash with this character',
      items: { type: 'STRING' },
    },
  },
  required: [
    'isFaceVisible',
    'isRealHuman',
    'characterCount',
    'analysis',
    'result',
    'recommendedDyeIds',
    'avoidDyeIds',
  ],
  // analysis（観察）を result（結論）より先に出力させ、CoT の順序を保証する
  propertyOrdering: [
    'isFaceVisible',
    'isRealHuman',
    'characterCount',
    'analysis',
    'result',
    'recommendedDyeIds',
    'avoidDyeIds',
  ],
};

const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
const UNDERTONES: readonly Undertone[] = ['warm', 'cool'];
const CONTRASTS: readonly Contrast[] = ['high', 'low'];
const CHROMAS: readonly Chroma[] = ['clear', 'soft'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Geminiの生テキストを検証してGeminiDiagnosisResponseに変換する。
 * structured outputでもenum逸脱・欠落は起こりうるため、境界で弾く。
 */
export function parseGeminiDiagnosis(text: string): GeminiDiagnosisResponse {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned invalid JSON');
  }
  if (!isRecord(raw)) {
    throw new Error('Gemini response is not an object');
  }

  const { isFaceVisible, isRealHuman, characterCount, analysis, result } = raw;

  if (typeof isFaceVisible !== 'boolean' || typeof isRealHuman !== 'boolean') {
    throw new Error('Gemini response has invalid screening flags');
  }
  if (
    typeof characterCount !== 'number' ||
    !Number.isInteger(characterCount) ||
    characterCount < 0
  ) {
    throw new Error('Gemini response has invalid characterCount');
  }
  if (
    !isRecord(analysis) ||
    !isOneOf(analysis.undertone, UNDERTONES) ||
    !isOneOf(analysis.contrast, CONTRASTS) ||
    !isOneOf(analysis.chroma, CHROMAS) ||
    !isOneOf(analysis.secondarySeason, SEASONS)
  ) {
    throw new Error('Gemini response has invalid analysis');
  }
  if (!isRecord(result) || !isOneOf(result.season, SEASONS)) {
    throw new Error('Gemini response has invalid result.season');
  }
  if (!isStringArray(raw.recommendedDyeIds) || !isStringArray(raw.avoidDyeIds)) {
    throw new Error('Gemini response has invalid dye ID lists');
  }

  return {
    isFaceVisible,
    isRealHuman,
    characterCount,
    analysis: {
      undertone: analysis.undertone,
      contrast: analysis.contrast,
      chroma: analysis.chroma,
      secondarySeason: analysis.secondarySeason,
    },
    result: { season: result.season },
    recommendedDyeIds: raw.recommendedDyeIds,
    avoidDyeIds: raw.avoidDyeIds,
  };
}

/** スクリーニング却下理由。クライアントの i18n エラーキーと一致させる */
export type ScreeningRejection = 'noFaceDetected' | 'realHumanDetected' | 'multipleCharacters';

/**
 * スクリーニング判定。+server.ts の422分岐とリトライゲートで共有する（判定式のdrift防止）。
 * characterCount === 0 は「解析可能なキャラがいない」矛盾出力として noFaceDetected 扱い。
 */
export function screenDiagnosis(result: GeminiDiagnosisResponse): ScreeningRejection | null {
  if (!result.isFaceVisible || result.characterCount === 0) return 'noFaceDetected';
  if (result.isRealHuman) return 'realHumanDetected';
  if (result.characterCount >= 2) return 'multipleCharacters';
  return null;
}

/**
 * モデル起因で再試行に意味がある失敗（スキーマ逸脱・season矛盾・空応答）。
 * APIキー不正やクォータ超過などのHTTPエラーはリトライしても無駄なので含めない。
 */
class RetryableDiagnosisError extends Error {}

/**
 * スクリーニング通過見込みの結果に限り、自己申告 season と観察結果由来の
 * 導出 season の矛盾を検出して throw する（リトライのトリガー）。
 * スクリーニングで弾かれる画像は analysis が best guess のため突き合わせない。
 */
function assertSeasonConsistent(result: GeminiDiagnosisResponse): GeminiDiagnosisResponse {
  if (screenDiagnosis(result) !== null) return result;

  const derived = deriveSeason(result.analysis);
  if (result.result.season !== derived) {
    throw new RetryableDiagnosisError(
      `Gemini season "${result.result.season}" contradicts analysis-derived "${derived}" (analysis=${JSON.stringify(result.analysis)})`
    );
  }
  return result;
}

/**
 * 診断を実行する。モデル起因の一時的な失敗（スキーマ逸脱・season矛盾）で
 * ユーザーのレート枠を無駄にしないよう、1回だけリトライする。
 * リトライ後の結果は矛盾が残っていてもそのまま返し、呼び出し側で処理する。
 */
export async function diagnoseWithGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<GeminiDiagnosisResponse> {
  try {
    return assertSeasonConsistent(await requestDiagnosis(apiKey, imageBase64, mimeType));
  } catch (firstError) {
    if (!(firstError instanceof RetryableDiagnosisError)) {
      throw firstError;
    }
    console.warn('Gemini diagnosis attempt failed, retrying once:', firstError);
    return requestDiagnosis(apiKey, imageBase64, mimeType);
  }
}

async function requestDiagnosis(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<GeminiDiagnosisResponse> {
  const prompt = buildPrompt();

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.1,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Gemini API error (${response.status}):`, errorBody);
    throw new Error('AI diagnosis service returned an error');
  }

  const data: GeminiApiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new RetryableDiagnosisError('Gemini returned no text content');
  }

  try {
    return parseGeminiDiagnosis(text);
  } catch (parseError) {
    throw new RetryableDiagnosisError(
      parseError instanceof Error ? parseError.message : String(parseError)
    );
  }
}
