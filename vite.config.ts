import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // workers-og imports .wasm via ESM which Node's resolver chokes on during the
  // SSR build. The Cloudflare adapter wires the package up correctly at deploy
  // time, so keep it external from Vite's perspective.
  ssr: {
    external: ['workers-og'],
  },
  optimizeDeps: {
    exclude: ['workers-og'],
  },
});
