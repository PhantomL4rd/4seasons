import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const categories = {
  2: 'white',
  4: 'red',
  5: 'brown',
  6: 'yellow',
  7: 'green',
  8: 'blue',
  9: 'purple',
  10: 'rare',
};

export async function fetchRows(language, fetcher = fetch, version, limit = 500) {
  const rows = [];
  let after = -1;
  for (;;) {
    const url = new URL('https://v2.xivapi.com/api/sheet/Stain');
    url.search = new URLSearchParams({
      language,
      fields: 'Name,Color,Shade',
      limit: String(limit),
      ...(version ? { version } : {}),
      ...(after >= 0 ? { after: String(after) } : {}),
    });
    const response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`XIVAPI ${language}: HTTP ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page.rows) || !page.version || (version && version !== page.version))
      throw new Error('Invalid XIVAPI page/version');
    version = page.version;
    for (const row of page.rows) {
      if (!Number.isInteger(row.row_id) || row.row_id <= after)
        throw new Error('Invalid XIVAPI row order');
      after = row.row_id;
      rows.push(row);
    }
    if (page.rows.length < limit) return { rows, version };
  }
}

function activeRows(rows) {
  const result = new Map();
  for (const row of rows) {
    if (
      !Number.isInteger(row.row_id) ||
      row.row_id < 0 ||
      !row.fields ||
      typeof row.fields.Name !== 'string'
    )
      throw new Error('Invalid Stain row');
    if (row.row_id === 0 || (!row.fields.Name.trim() && row.fields.Shade === 0)) continue;
    if (!row.fields.Name.trim() || result.has(row.row_id)) throw new Error('Empty/duplicate Stain');
    result.set(row.row_id, row.fields);
  }
  if (!result.size) throw new Error('Empty Stain master');
  return result;
}

export function buildMaster(enRows, jaRows, metadata, previousIds = []) {
  const en = activeRows(enRows);
  const ja = activeRows(jaRows);
  if (en.size !== ja.size || [...en.keys()].some((id) => !ja.has(id)))
    throw new Error('Stain languages do not match');
  for (const id of Object.keys(metadata)) {
    if (!en.has(Number(id))) throw new Error(`Missing existing Stain ${id}`);
  }
  const names = { en: {}, ja: {} };
  const dyes = [];
  const ids = new Set();
  for (const [stainId, fields] of en) {
    const { Color: color, Shade: shade } = fields;
    if (!Number.isInteger(color) || color < 0 || color > 0xffffff || !categories[shade])
      throw new Error(`Invalid color/category: ${stainId}`);
    const name = fields.Name.trim();
    const extra = metadata[stainId] ?? {
      id: `dye_xivapi_${stainId}`,
      category: categories[shade],
      tags: name.startsWith('Metallic ') ? ['metallic'] : [],
      lodestone: '',
    };
    if (
      !extra.id ||
      ids.has(extra.id) ||
      !Object.values(categories).includes(extra.category) ||
      !Array.isArray(extra.tags)
    )
      throw new Error('Invalid dye metadata');
    ids.add(extra.id);
    dyes.push({
      id: extra.id,
      name,
      category: extra.category,
      rgb: { r: (color >> 16) & 255, g: (color >> 8) & 255, b: color & 255 },
      tags: extra.tags,
      lodestone: extra.lodestone ?? '',
      ...(extra.source ? { source: extra.source } : {}),
    });
    names.en[extra.id] = name;
    names.ja[extra.id] = ja.get(stainId).Name.trim();
  }
  if (previousIds.some((id) => !ids.has(id))) throw new Error('Existing dye disappeared');
  dyes.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  for (const locale of ['en', 'ja'])
    names[locale] = Object.fromEntries(dyes.map(({ id }) => [id, names[locale][id]]));
  return { dyes, names };
}

export async function syncDyes(root = new URL('../', import.meta.url), fetcher = fetch) {
  const config = JSON.parse(await readFile(new URL('scripts/dye-sync-config.json', root), 'utf8'));
  const masterPath = new URL(config.master, root);
  const metadata = JSON.parse(await readFile(new URL('scripts/dye-metadata.json', root), 'utf8'));
  const previous = JSON.parse(await readFile(masterPath, 'utf8'));
  const en = await fetchRows('en', fetcher);
  const ja = await fetchRows('ja', fetcher, en.version);
  const result = buildMaster(
    en.rows,
    ja.rows,
    metadata,
    previous.dyes.map((dye) => dye.id),
  );
  const files = [[masterPath, { dyes: result.dyes }]];
  for (const locale of ['en', 'ja']) {
    const path = new URL(`src/lib/translations/${locale}/dye.json`, root);
    const translation = JSON.parse(await readFile(path, 'utf8'));
    files.push([path, { ...translation, names: result.names[locale] }]);
  }
  for (const [path, data] of files) {
    const existing = JSON.parse(await readFile(path, 'utf8'));
    if (JSON.stringify(existing) !== JSON.stringify(data)) {
      await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
    }
  }
  console.log(`Updated ${result.dyes.length} dyes (XIVAPI ${en.version})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncDyes().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
