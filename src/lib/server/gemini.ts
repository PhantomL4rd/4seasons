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

function buildPrompt(): string {
  return `Personal color analyst for game characters. Analyze the screenshot and determine the character's color season.

# Validation (check in order, return defaults on fail)
Defaults: season="spring", characterCount=0, empty palette/colorsToAvoid.
1. isFaceVisible: Are eyes, hair, AND skin/scales/fur ALL visible? Includes beast races. false if any is hidden (helmets, masks, hoods, back-of-head, no character). false → defaults.
2. isRealHuman: Real photograph? (not CG/illustration/game screenshot) true → defaults.
3. characterCount: Number of characters. >=2 → defaults.

# Season Analysis (follow these steps strictly, using SKIN and EYES only — ignore hair color)
Step 1 — Skin undertone (primary factor, ignore CG lighting/shadows):
  Warm = yellow, golden, peach, or olive cast → Spring or Autumn
  Cool = pink, rosy, blueish, or porcelain cast → Summer or Winter

Step 2 — Value contrast (difference between skin and eyes):
  High contrast (e.g. pale skin + vivid/dark eyes) → Spring or Winter
  Low contrast (skin and eyes are close in lightness) → Summer or Autumn

Step 3 — Chroma (color intensity of skin and eyes):
  Clear/vivid features → Spring (warm) or Winter (cool)
  Soft/muted features → Summer (cool) or Autumn (warm)

Season matrix (analysis fields → season):
  Warm + High contrast + Clear → Spring (bright, lively, warm colors)
  Cool + Low contrast + Soft → Summer (muted, elegant, cool colors)
  Warm + Low contrast + Soft → Autumn (deep, rich, earthy colors)
  Cool + High contrast + Clear → Winter (vivid, bold, icy colors)

Determine TWO seasons:
- Primary season (result.season): the best match from the matrix above.
- Secondary season (analysis.secondarySeason): the second-best fit. Must differ from primary.

IMPORTANT: Output "analysis" (undertone, contrast, chroma, secondarySeason) BEFORE "result". The primary season MUST be consistent with your analysis. If undertone=warm, season must be spring or autumn.

Game character notes:
- Do NOT let CG rendering or scene lighting bias your undertone analysis. Focus on the character's inherent skin and eye colors.
- Hair color should NOT influence season analysis, but may still inspire palette choices.

# Output
palette.base: 6 hex colors that flatter this character.
Colors 1-4 reflect the PRIMARY season. Colors 5-6 bridge toward the SECONDARY season.

Season color directions:
  Spring: warm, clear, bright (coral, peach, warm green, golden yellow)
  Summer: cool, soft, muted (lavender, dusty rose, sage, powder blue)
  Autumn: warm, deep, rich (terracotta, olive, burgundy, mustard)
  Winter: cool, clear (royal blue, emerald, fuchsia, icy pink, icy lavender)

Palette quality rules:
- All 6 colors must be distinctly different hues.
colorsToAvoid: 3 hex colors.`;
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
    palette: {
      type: 'OBJECT',
      properties: {
        base: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['base'],
    },
    colorsToAvoid: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'isFaceVisible',
    'isRealHuman',
    'characterCount',
    'analysis',
    'result',
    'palette',
    'colorsToAvoid',
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
      temperature: 0.25,
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
