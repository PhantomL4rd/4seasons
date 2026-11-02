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

## GitHub Actions lockfile

GitHub Actionsの依存関係は`.github/workflows/actions.lock`で固定します。workflowにはバージョンタグを記載し、実行コミットと推移依存はlockfileで管理します。

`uses:`の追加・変更後はリポジトリ直下で`gh actions-lock`を実行し、workflowとlockfileを一緒にコミットします。生成にはGitHub公式の`github/gh-actions-lock`拡張を使用します。通常の検証は`gh actions-lock --verify-local`（網羅性）と`gh actions-lock --verify`（上流の参照元も確認）で行います。上流更新を取り込む場合は差分を確認して`gh actions-lock --relock`を使います。lockfileは手動編集しません。

CIはlockfileの網羅性と参照元を検証します。既存のトリガー・シークレット・ビルドとデプロイの処理は維持します。
