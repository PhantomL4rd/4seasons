import { cormorantSb, shipporiSb } from '$lib/server/og/fonts';
import { renderOg } from '$lib/server/og/template';
import { rgbToHex } from '$lib/utils/color';
import { decodeShareData, restoreDiagnosis } from '$lib/utils/share-url';
import type { RequestHandler } from './$types';

const WIDTH = 1200;
const HEIGHT = 630;

export const GET: RequestHandler = async ({ params }) => {
  const shareData = decodeShareData(params.data);
  const diagnosis = shareData ? restoreDiagnosis(shareData) : null;
  if (!diagnosis) {
    return new Response('Not found', { status: 404 });
  }

  // Show recommended dyes #1-3 plus #5 (skip #4) so the last swatch adds a bit
  // of contrast/variety to the palette instead of feeling like a near-duplicate.
  // Falls back gracefully when fewer dyes are available.
  const swatches = [0, 1, 2, 4]
    .map((i) => diagnosis.recommendedDyes[i])
    .filter((d) => d !== undefined)
    .map((d) => rgbToHex(d.dye.rgb.r, d.dye.rgb.g, d.dye.rgb.b));

  const html = renderOg(diagnosis.result.season, swatches);

  // Dynamic import keeps workers-og (which ships ESM `.wasm` imports) out of
  // Vite's SSR module graph so `npm run build` doesn't try to resolve the wasm
  // files with Node's loader. Resolved at request time on the Worker runtime.
  const { ImageResponse } = await import('workers-og');

  return new ImageResponse(html, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Cormorant Garamond', data: cormorantSb, weight: 600, style: 'normal' },
      { name: 'Shippori Mincho', data: shipporiSb, weight: 600, style: 'normal' },
    ],
    headers: {
      'cache-control': 'public, max-age=604800, immutable',
    },
  });
};
