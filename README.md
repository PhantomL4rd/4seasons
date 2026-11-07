# 4seasons

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Developing

Install dependencies with `bun install`, then start a development server:

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Dependency security

SvelteKit 3 requires Node.js 22.17+, TypeScript 6, Vite 8 and the corresponding Cloudflare adapter. Keep these packages compatible when updating the lockfile. Run `bun run check`, `bun run test` and `bun run build` after dependency changes.

Dependency audits also cover transitive packages. Apply available compatible security patches; record unpatched packages and changes requiring a separate major migration rather than hiding audit results.

The audit still reports deepmerge (no published fix) and satori through workers-og (the fixed version is outside its supported dependency range). Track these separately from the SvelteKit alerts; updating satori requires checking image rendering compatibility.

## Validation

アプリ全体のGitHub Actionsによる自動検証は行いません。染色マスター更新のActionsでは取得処理専用のテストを実行します。変更時はローカルで`bun run lint`、`bun run check`、`bun run test`、`bun run build`を実行します。

## 染色マスターの更新

染料の英語名・日本語名・RGBは [XIVAPI v2](https://v2.xivapi.com/api/sheet/Stain) の Stain シートから取得します。DBは使わず、生成したJSONをGitで管理し、アプリは同梱したデータを読み込みます。

- GitHub Actions の `Update dye master` が毎週水曜19:00（Asia/Tokyo、UTC 10:00）に起動します。Actionsの混雑により開始が遅れる場合があります。
- 手動更新: Actions → Update dye master → Run workflow（デフォルトブランチ）、または `bun run sync:dyes`。
- ローカル検証: `bun run test:dyes`。依存パッケージ不要、Node.js 22以降で実行できます。
- 取得と検証がすべて成功した場合だけ、染料JSONと `src/lib/translations/{en,ja}/dye.json` を更新します。API障害、空データ、既存行の欠落、日英の不一致は失敗とし、旧データを維持します。
- Actionsは変更がある場合だけデフォルトブランチへコミットします。リポジトリのActions書き込み権限と、botのpushを許すブランチ設定が必要です。公開環境への反映は既存のCloudflare Git連携によるビルド・デプロイに依存します。GITHUB_TOKENのpushは別のGitHub Actionsを起動しません。
- `scripts/dye-metadata.json` は既存IDとStain行IDの固定対応、およびアプリ独自のカテゴリ・タグ・Lodestoneリンク・入手元を保持します。既存IDは保存済み配色との互換性のため変更しません。
- 新しい染料は `dye_xivapi_<Stain行ID>` として追加します。カテゴリはShadeから、metallicタグは英語名から生成します。入手元・Lodestoneリンク・vividタグはAPIから推測せず、必要に応じて対応表に追記してください。既存のカテゴリ・タグは維持します。
- 季節別おすすめ・伝統色との対応など、編集方針を含む派生データの再生成は別作業です。
- 3リポジトリの取得スクリプトとテストは同じ仕様を保ち、変更時は合わせて更新してください。
