import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMaster, fetchRows } from './sync-dyes.mjs';

const row = (id, name = 'Snow White', color = 0xe4dfd0, shade = 2) => ({
  row_id: id,
  fields: { Name: name, Color: color, Shade: shade },
});
const metadata = {
  1: { id: 'dye_002', category: 'white', tags: ['vivid'], lodestone: '/existing' },
};
const en = [
  row(0, 'No Color'),
  row(1),
  row(126, '', 0, 0),
  row(129, 'Metallic Test ', 0x010203, 10),
];
const ja = [row(1, 'スノウホワイト'), row(129, '新色')];

test('既存ID・独自情報を維持し、API色と日英名を更新して新規染料を追加する', () => {
  const result = buildMaster(en, ja, metadata);
  assert.deepEqual(result.dyes[0], {
    ...metadata[1],
    name: 'Snow White',
    rgb: { r: 228, g: 223, b: 208 },
  });
  assert.equal(result.dyes[1].id, 'dye_xivapi_129');
  assert.equal(result.dyes[1].category, 'rare');
  assert.deepEqual(result.dyes[1].tags, ['metallic']);
  assert.deepEqual(result.dyes[1].rgb, { r: 1, g: 2, b: 3 });
  assert.equal(result.names.en.dye_xivapi_129, 'Metallic Test');
  assert.equal(result.names.ja.dye_002, 'スノウホワイト');
});

test('欠落・空レスポンス・重複・不正色・未知カテゴリを拒否する', () => {
  for (const rows of [
    [],
    [row(2)],
    [row(1), row(1)],
    [row(1, 'x', -1)],
    [row(1, 'x', 1.5)],
    [row(1), row(129, 'new', 1, 99)],
  ]) {
    assert.throws(() => buildMaster(rows, ja, metadata));
  }
  assert.throws(() => buildMaster(en, [], metadata));
  assert.throws(() => buildMaster(en, [...ja, row(130)], metadata));
  assert.throws(() => buildMaster(en, ja, metadata, ['dye_002', 'dye_xivapi_130']));
});

test('ページを最後まで取得し、APIのバージョンを固定する', async () => {
  const urls = [];
  const fetcher = async (url) => {
    urls.push(new URL(url));
    return {
      ok: true,
      json: async () => ({ version: 'fixed', rows: urls.length === 1 ? [row(1), row(2)] : [] }),
    };
  };
  assert.equal((await fetchRows('en', fetcher, undefined, 2)).rows.length, 2);
  assert.equal(urls[1].searchParams.get('after'), '2');
  assert.equal(urls[1].searchParams.get('version'), 'fixed');
});

test('HTTP失敗・不正レスポンス・進まないページを拒否する', async () => {
  await assert.rejects(fetchRows('en', async () => ({ ok: false, status: 503 })));
  await assert.rejects(fetchRows('en', async () => ({ ok: true, json: async () => ({}) })));
  await assert.rejects(
    fetchRows(
      'en',
      async () => ({ ok: true, json: async () => ({ version: 'v', rows: [row(1)] }) }),
      undefined,
      1,
    ),
  );
});

test('取得失敗時にファイルを変更せず、成功時は翻訳の他キーを残し、再実行結果を同一にする', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { syncDyes } = await import('./sync-dyes.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'dye-sync-test-'));
  const files = {
    'scripts/dye-sync-config.json': { master: 'dyes.json' },
    'scripts/dye-metadata.json': metadata,
    'dyes.json': { dyes: [{ id: 'dye_002' }] },
    'src/lib/translations/en/dye.json': { categories: { white: 'White' } },
    'src/lib/translations/ja/dye.json': { categories: { white: '白' } },
  };
  try {
    for (const [file, data] of Object.entries(files)) {
      await mkdir(join(dir, file, '..'), { recursive: true });
      await writeFile(join(dir, file), JSON.stringify(data));
    }
    const root = pathToFileURL(`${dir}/`);
    const snapshot = () =>
      Promise.all(Object.keys(files).map((file) => readFile(join(dir, file), 'utf8')));
    const before = await snapshot();
    await assert.rejects(
      syncDyes(root, async (url) => ({
        ok: true,
        json: async () => ({
          version: 'v',
          rows: url.searchParams.get('language') === 'en' ? en : [],
        }),
      })),
    );
    assert.deepEqual(await snapshot(), before);
    const fetcher = async (url) => ({
      ok: true,
      json: async () => ({
        version: 'v',
        rows: url.searchParams.get('language') === 'en' ? en : ja,
      }),
    });
    await syncDyes(root, fetcher);
    const after = await snapshot();
    assert.equal(JSON.parse(after[3]).categories.white, 'White');
    await syncDyes(root, fetcher);
    assert.deepEqual(await snapshot(), after);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
