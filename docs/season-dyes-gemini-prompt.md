Use this prompt to regenerate `src/lib/data/season-dyes.json`.

Paste the full dye catalog after the prompt where indicated.

```text
You are selecting FFXIV dye candidates for a season catalog page.

Goal:
- Rebuild `season-dyes.json` for the four personal color seasons:
  - spring
  - summer
  - autumn
  - winter
- Output only JSON.

Season rules:
- warm + clear -> spring
- cool + soft -> summer
- warm + soft -> autumn
- cool + clear -> winter

Available input:
- A dye catalog where each line is:
  `dye_id:#RRGGBB [category] English Name`

Selection rules:
- Use only dye IDs that exist in the provided catalog.
- A dye may appear in multiple seasons if it genuinely fits.
- Choose enough dyes for each season to make a useful browse page, not a tiny fallback list.
- Each season should contain 30 to 40 dye IDs in total.
- Every category that appears in a season must contain at least 2 dyes for that season.
- Prefer broad variety across categories and tones, but keep the season coherent.
- Judge by actual color impression from hex first, name second.

Season guidance:
- spring: warm, clear, light to medium, fresh, bright, lively
- summer: cool, soft, light to medium, muted, powdery, elegant
- autumn: warm, soft, medium to deep, earthy, rich, subdued
- winter: cool, clear, high-contrast, deep or icy, vivid, sharp

Output format:
- Return one JSON object with keys `spring`, `summer`, `autumn`, `winter`.
- Each season must be an object with these category keys:
  `white`, `red`, `brown`, `yellow`, `green`, `blue`, `purple`, `rare`
- Each category value must be an array of dye IDs.
- If a category should not be used for that season, return an empty array for that category.
- No comments.
- No markdown.
- No explanation.

Validation checklist before finalizing:
- JSON is valid.
- Every dye ID exists in the catalog.
- Each season contains 30 to 40 dye IDs in total.
- Every season has no duplicate IDs across all categories.
- Every category array is either empty or contains at least 2 dyes.
- The result is suitable for a public catalog page, not only for diagnosis fallback.

Catalog:
PASTE THE FULL DYE CATALOG HERE
```

Suggested source material when running it:
- [src/lib/server/gemini.ts](/Users/hikaru/Develop/Hobby/4season/src/lib/server/gemini.ts)
- [src/lib/server/season.ts](/Users/hikaru/Develop/Hobby/4season/src/lib/server/season.ts)
- [src/lib/data/dyes.json](/Users/hikaru/Develop/Hobby/4season/src/lib/data/dyes.json)
