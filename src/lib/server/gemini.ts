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
  return `You are a personal color analyst for game characters.

Analyze this game character screenshot and determine their personal color season.

## Rules
- Determine if the character's eyes, hair, and skin (or scales/fur for beast races) are ALL visible in the image. Set isFaceVisible accordingly.
  - true: All three — eyes, hair, and skin/scales/fur — are clearly visible. This includes beast races (animal-like, dragon-like, lion-like faces).
  - false: Any of the three is hidden or not visible — e.g. full-face helmets, masks covering the eyes, hoods hiding the hair, back-of-head only, landscapes, items, or screenshots without a character.
- If isFaceVisible is false, set season to "spring", confidence to 0, characterCount to 0, isRealHuman to false, and return empty palette/colorsToAvoid.
- First, determine if the image is a real human photograph. Set isRealHuman accordingly.
  - true: A photograph of a real, living person. Natural skin texture, photographic lighting, real-world backgrounds.
  - false: Illustrations, anime, manga, 3D CG renders, game screenshots, digital art, or any non-photographic depiction, even if highly realistic.
- If isRealHuman is true, set season to "spring", confidence to 0, characterCount to 0, and return empty palette/colorsToAvoid.
- Count how many characters are visible in the screenshot. Set characterCount to the number.
- If characterCount >= 2, set season to "spring", confidence to 0, and return empty palette/colorsToAvoid.
- Spring: Warm + Bright/Clear
- Summer: Cool + Muted/Soft
- Autumn: Warm + Deep/Rich
- Winter: Cool + Vivid/High-contrast

## Output
- isFaceVisible: whether a character's face/head is visible in the image
- isRealHuman: whether the image is a real human photograph
- characterCount: number of characters detected in the screenshot
- result: season, confidence (0-1)
- palette: base (6 hex colors for main glamour)
- colorsToAvoid: 3 hex color values that don't suit this character`;
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
        confidence: { type: 'NUMBER' },
      },
      required: ['season', 'confidence'],
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
