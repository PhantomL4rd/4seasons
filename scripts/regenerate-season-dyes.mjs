import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const docsPath = path.join(root, 'docs', 'season-dyes-gemini-prompt.md');
const dyesPath = path.join(root, 'src', 'lib', 'data', 'dyes.json');
const outputPath = path.join(root, 'src', 'lib', 'data', 'season-dyes.json');

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const CATEGORIES = ['white', 'red', 'brown', 'yellow', 'green', 'blue', 'purple', 'rare'];

function loadEnvFile(filePath) {
  const raw = fs.readFile(filePath, 'utf8').catch(() => '');
  return raw.then((text) => {
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  });
}

function dyeToHex(dye) {
  return `#${[dye.rgb.r, dye.rgb.g, dye.rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function buildCatalog(dyes) {
  return dyes.map((dye) => `${dye.id}:${dyeToHex(dye)} [${dye.category}] ${dye.name}`).join('\n');
}

function extractPromptTemplate(markdown) {
  const match = markdown.match(/```text\n([\s\S]*?)\n```/);
  if (!match) throw new Error('Prompt template block not found');
  return match[1];
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function flattenGroupedSeasonMap(grouped) {
  return Object.fromEntries(
    SEASONS.map((season) => [
      season,
      CATEGORIES.flatMap((category) => grouped[season][category]),
    ])
  );
}

function validateGroupedSeasonMap(result, dyeMap) {
  if (!isRecord(result)) throw new Error('Gemini output is not an object');

  for (const season of SEASONS) {
    if (!isRecord(result[season])) throw new Error(`${season} is not an object`);
    const ids = [];

    for (const category of CATEGORIES) {
      const categoryIds = result[season][category];
      if (!Array.isArray(categoryIds)) throw new Error(`${season}.${category} is not an array`);
      if (categoryIds.length === 1) {
        throw new Error(`${season}.${category} has only 1 dyes`);
      }
      for (const id of categoryIds) {
        const dye = dyeMap.get(id);
        if (!dye) throw new Error(`${season}.${category} includes unknown dye ID: ${id}`);
        if (dye.category !== category) {
          throw new Error(`${season}.${category} includes ${id} from ${dye.category}`);
        }
        ids.push(id);
      }
    }

    const unique = new Set(ids);
    if (unique.size !== ids.length) throw new Error(`${season} has duplicate IDs`);
    if (ids.length < 30 || ids.length > 40) {
      throw new Error(`${season} has ${ids.length} dyes; expected 30-40`);
    }
  }
}

async function main() {
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.dev.vars'));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const [docsRaw, dyesRaw] = await Promise.all([
    fs.readFile(docsPath, 'utf8'),
    fs.readFile(dyesPath, 'utf8'),
  ]);

  const dyes = JSON.parse(dyesRaw).dyes;
  const promptTemplate = extractPromptTemplate(docsRaw);
  const basePrompt = promptTemplate.replace('PASTE THE FULL DYE CATALOG HERE', buildCatalog(dyes));

  const categorySchema = Object.fromEntries(
    CATEGORIES.map((category) => [category, { type: 'ARRAY', items: { type: 'STRING' } }])
  );

  const responseSchema = {
    type: 'OBJECT',
    properties: Object.fromEntries(
      SEASONS.map((season) => [
        season,
        {
          type: 'OBJECT',
          properties: categorySchema,
          required: CATEGORIES,
          propertyOrdering: CATEGORIES,
        },
      ])
    ),
    required: SEASONS,
    propertyOrdering: SEASONS,
  };

  const dyeMap = new Map(dyes.map((dye) => [dye.id, dye]));
  let lastError = null;
  let lastText = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const retryNote =
      lastError === null
        ? ''
        : `\n\nPrevious attempt failed validation:\n- ${lastError.message}\n\nPrevious JSON:\n${lastText}\n\nFix that JSON or regenerate it completely, but satisfy every rule exactly.`;
    const groupedOutputNote = `\n\nReturn grouped output first: each season must be an object with category keys ${CATEGORIES.join(', ')}. Each category value must be an array of dye IDs. Use [] for unused categories. Never return a single dye in a category array. Category keys must match the exact [category] label from the catalog. Do not place rare dyes into white, or brown dyes into yellow, etc. If you cannot find at least 2 valid IDs whose catalog category is exactly that key, return [] for that category. Each season must total 30 to 40 dye IDs across all categories.`;
    const prompt = `${basePrompt}${groupedOutputNote}${retryNote}`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no text content');
    lastText = text;

    try {
      const grouped = JSON.parse(text);
      validateGroupedSeasonMap(grouped, dyeMap);
      const result = flattenGroupedSeasonMap(grouped);
      await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
      console.log(`Updated ${path.relative(root, outputPath)} on attempt ${attempt}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Gemini generation failed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
