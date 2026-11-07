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

GitHub Actionsによる自動検証は行いません。変更時はローカルで`bun run lint`、`bun run check`、`bun run test`、`bun run build`を実行します。
