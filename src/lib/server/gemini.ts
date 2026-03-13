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

function buildPrompt(locale: string): string {
  const lang = locale === 'ja' ? '日本語' : 'English';

  return `You are a personal color analyst for Final Fantasy XIV characters.

Analyze this FF14 character screenshot and determine their personal color season.

## Rules
- Spring: Warm + Bright/Clear
- Summer: Cool + Muted/Soft
- Autumn: Warm + Deep/Rich
- Winter: Cool + Vivid/High-contrast

## Output
- result: season, confidence (0-1), reasoning (1-2 sentences)
- palette: base (6 hex colors for main glamour), accent (3 hex colors for highlights)
- colorsToAvoid: 3 hex color values that don't suit this character

Respond in ${lang}. Keep text concise.`;
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    result: {
      type: 'OBJECT',
      properties: {
        season: { type: 'STRING', enum: ['spring', 'summer', 'autumn', 'winter'] },
        confidence: { type: 'NUMBER' },
        reasoning: { type: 'STRING' },
      },
      required: ['season', 'confidence', 'reasoning'],
    },
    palette: {
      type: 'OBJECT',
      properties: {
        base: { type: 'ARRAY', items: { type: 'STRING' } },
        accent: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['base', 'accent'],
    },
    colorsToAvoid: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['result', 'palette', 'colorsToAvoid'],
};

export async function diagnoseWithGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  locale: string
): Promise<GeminiDiagnosisResponse> {
  const prompt = buildPrompt(locale);

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
