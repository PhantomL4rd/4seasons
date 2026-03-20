import { readFileSync, writeFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY required');

interface DyeInput {
  id: string;
  name: string;
  category: string;
  rgb: { r: number; g: number; b: number };
  tags: string[];
}

const dyesData = JSON.parse(readFileSync('src/lib/data/dyes.json', 'utf-8'));
const allDyes: DyeInput[] = dyesData.dyes.map((d: any) => ({
  id: d.id,
  name: d.name,
  category: d.category,
  rgb: d.rgb,
  tags: d.tags,
}));

const categories = [...new Set(allDyes.map((d) => d.category))];

function buildPrompt(category: string, dyesInCategory: DyeInput[]): string {
  return `You are a personal color analysis expert. I will show you dyes from the "${category}" category. For each dye, determine which personal color seasons it suits.

Personal color theory:
- Spring: warm undertone, bright, vivid/clear colors (coral, peach, warm pastels, golden tones)
- Summer: cool undertone, bright, muted/soft colors (lavender, rose, dusty blue, soft pastels, grayish/taupe tones)
- Autumn: warm undertone, dark, muted/deep colors (terracotta, olive, mustard, rust, earth tones)
- Winter: cool undertone, dark, vivid/clear colors (pure white, jet black, royal blue, wine red, jewel tones)

Rules:
- A dye CAN belong to multiple seasons if it genuinely suits them
- Consider RGB values for warmth/coolness, brightness, saturation
- Consider tags like "metallic" (often Winter/Autumn), "pastel" (often Spring/Summer)
- Even in warm categories (like brown/yellow), some dyes may have cool or muted undertones that suit Summer or Winter
- Even in cool categories (like blue/purple), some dyes may have warm undertones that suit Spring or Autumn
- IMPORTANT: Every season MUST have at least 1 dye from this category. Look carefully — there is always at least one dye that can work, even if it's not a perfect match. Pick the best candidate.

Here are the ${category} dyes:
${JSON.stringify(dyesInCategory, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "spring": ["dye_001", ...],
  "summer": ["dye_002", ...],
  "autumn": ["dye_003", ...],
  "winter": ["dye_004", ...]
}

Only include dye IDs from the list above. Empty arrays are OK if truly no dye fits a season.`;
}

async function main() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const seasonDyes: Record<string, Set<string>> = {
    spring: new Set(),
    summer: new Set(),
    autumn: new Set(),
    winter: new Set(),
  };

  const validIds = new Set(allDyes.map((d) => d.id));

  for (const category of categories) {
    const dyesInCategory = allDyes.filter((d) => d.category === category);
    console.log(`Processing category: ${category} (${dyesInCategory.length} dyes)...`);

    const prompt = buildPrompt(category, dyesInCategory);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`  ERROR: No JSON found for category ${category}`);
      continue;
    }

    const categoryResult = JSON.parse(jsonMatch[0]);

    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const ids = categoryResult[season];
      if (!Array.isArray(ids)) {
        console.warn(`  WARNING: Missing ${season} array for category ${category}`);
        continue;
      }
      for (const id of ids) {
        if (!validIds.has(id)) {
          console.warn(`  WARNING: Unknown dye ID ${id} in ${category}/${season}`);
          continue;
        }
        seasonDyes[season].add(id);
      }
    }

    // Show per-category results
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const ids = categoryResult[season] ?? [];
      if (ids.length > 0) {
        console.log(`  ${season}: ${ids.length} dyes`);
      }
    }
  }

  // Convert Sets to sorted arrays
  const output: Record<string, string[]> = {};
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    output[season] = [...seasonDyes[season]].sort();
  }

  writeFileSync('src/lib/data/season-dyes.json', JSON.stringify(output, null, 2) + '\n');
  console.log('\nGenerated season-dyes.json');
  for (const [season, ids] of Object.entries(output)) {
    console.log(`  ${season}: ${ids.length} dyes`);
  }
}

main().catch(console.error);
