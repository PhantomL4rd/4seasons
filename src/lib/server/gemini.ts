import { dyes } from '$lib/data/dyes';
import type { GeminiDiagnosisResponse } from '$lib/types';

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

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** メタリック以外の全染料をコンパクトなカタログ形式で生成 */
function buildDyeCatalog(): string {
  return dyes
    .filter((dye) => !dye.tags.includes('metallic') && !dye.tags.includes('vivid'))
    .map((dye) => {
      const hex =
        `#${dye.rgb.r.toString(16).padStart(2, '0')}${dye.rgb.g.toString(16).padStart(2, '0')}${dye.rgb.b.toString(16).padStart(2, '0')}`.toUpperCase();
      return `${dye.id}:${hex} [${dye.category}] ${dye.name}`;
    })
    .join('\n');
}

function buildPrompt(): string {
  const catalog = buildDyeCatalog();
  return `Analyze game character screenshot for personal color season and select dyes from catalog.

# Validation
Check in order. On fail → defaults: season="spring", characterCount=0, empty recommendedDyeIds/avoidDyeIds.
- isFaceVisible: false if eyes, hair, OR skin/fur hidden (helmets, masks, back of head). Includes non-human races.
- isRealHuman: true if real photograph, not CG/game/illustration.
- characterCount: >=2 → defaults.

# Analysis
From SKIN and EYES only (ignore hair color & CG lighting), determine:
- undertone: Warm (yellow/peach/olive) vs Cool (pink/rosy/blueish)
- contrast: High (skin/eyes differ in value) vs Low (similar value)
- chroma: Clear (vivid/intense) vs Soft (muted/grayish)

Set result.season (primary) and analysis.secondarySeason (second-best, must differ) using the matrix below.
Primary season MUST be consistent with analysis (warm → spring/autumn, cool → summer/winter).
Output "analysis" BEFORE "result".

Game notes: ignore CG lighting/shadows for undertone. Hair may inspire dye choices but not season.

Season matrix & dye selection guide:
| Season | Undertone | Contrast | Chroma | Recommend profile | Avoid profile |
| Spring | Warm | High | Clear | warm, light-medium, saturated, clean, fresh | cool, dusty/muted, very dark |
| Summer | Cool | Low | Soft | cool, light-medium, low-saturation, powdery | warm, high-chroma, harsh contrast |
| Autumn | Warm | Low | Soft | warm, medium-deep, mid-saturation, earthy, rich | icy-cool, pastel, neon, stark contrast |
| Winter | Cool | High | Clear | cool, deep/icy, high-saturation, sharp, dramatic | muddy, earthy-warm, soft/dull |

# Dye Catalog (id:hex [category] name)
${catalog}

# Output
recommendedDyeIds: 6 dye IDs, visually distinct (vary hue, lightness, saturation). Judge by hex, not name.
- Max 1 dye per [category]. Never pick 2+ dyes from the same category.
- 1-4: match primary season's Recommend profile.
- 5-6: bridge toward secondary season's Recommend profile.

avoidDyeIds: 3 dye IDs matching primary season's Avoid profile. No overlap with recommendedDyeIds.`;
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
};

export async function diagnoseWithGemini(
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

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data: GeminiApiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned no text content');
  }

  const parsed: GeminiDiagnosisResponse = JSON.parse(text);
  return parsed;
}
