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

# Seasons (by skin undertone, hair color, eye color)
Spring=Warm+Bright, Summer=Cool+Muted, Autumn=Warm+Deep, Winter=Cool+Vivid

# Output
palette.base: 6 hex colors with diverse hues (spread across different parts of the color wheel; avoid clustering similar hues). colorsToAvoid: 3 hex colors.`;
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    isFaceVisible: { type: 'BOOLEAN' },
    isRealHuman: { type: 'BOOLEAN' },
    characterCount: { type: 'INTEGER' },
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
