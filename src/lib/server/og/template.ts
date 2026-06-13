import type { Season } from '$lib/types';

const SEASON_META: Record<Season, { en: string; jp: string; color: string }> = {
  spring: { en: 'Spring', jp: '春', color: '#FE640B' },
  summer: { en: 'Summer', jp: '夏', color: '#04A5E5' },
  autumn: { en: 'Autumn', jp: '秋', color: '#DF8E1D' },
  winter: { en: 'Winter', jp: '冬', color: '#1E66F5' },
};

const BG = '#FCFBF8';
const INK = '#3B3540';
const MUTED = '#8C8C96';

// Brand mark (transparent background). Source: src/lib/assets/4seasons-mark.svg.
// Inlined so the OG endpoint has no runtime fetches; keep the two in sync if the
// supplied logo changes.
// viewBox cropped to the visible glyph bounds (the original 100x100 SVG has
// substantial empty padding around the petals). Each rotated ellipse's axis-
// aligned bbox extends to roughly 18..82 in both dimensions (sqrt(rx^2 + ry^2)
// at 45deg), so use 18..82 to keep the petals' rounded sides from being clipped.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 64 64" width="100" height="100"><defs><linearGradient id="g-spring" gradientUnits="userSpaceOnUse" x1="50" y1="10" x2="50" y2="54"><stop offset="0" stop-color="#FE9254"/><stop offset="1" stop-color="#FE640B"/></linearGradient><linearGradient id="g-summer" gradientUnits="userSpaceOnUse" x1="50" y1="10" x2="50" y2="54"><stop offset="0" stop-color="#4FC0ED"/><stop offset="1" stop-color="#04A5E5"/></linearGradient><linearGradient id="g-autumn" gradientUnits="userSpaceOnUse" x1="50" y1="10" x2="50" y2="54"><stop offset="0" stop-color="#E9B061"/><stop offset="1" stop-color="#DF8E1D"/></linearGradient><linearGradient id="g-winter" gradientUnits="userSpaceOnUse" x1="50" y1="10" x2="50" y2="54"><stop offset="0" stop-color="#6294F8"/><stop offset="1" stop-color="#1E66F5"/></linearGradient></defs><ellipse cx="50" cy="32" rx="15" ry="22" fill="url(#g-spring)" transform="rotate(45 50 50)"/><ellipse cx="50" cy="32" rx="15" ry="22" fill="url(#g-summer)" transform="rotate(135 50 50)"/><ellipse cx="50" cy="32" rx="15" ry="22" fill="url(#g-autumn)" transform="rotate(225 50 50)"/><ellipse cx="50" cy="32" rx="15" ry="22" fill="url(#g-winter)" transform="rotate(315 50 50)"/><circle cx="50" cy="50" r="6.2" fill="#FCFBF8"/></svg>`;

const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

// satori parses HTML into a virtual DOM, and whitespace text nodes count as
// children. Keep the template on a single line so we don't have to add
// `display: flex` to nodes that conceptually only hold text.
export function renderOg(season: Season, swatchHexes: string[]): string {
  const meta = SEASON_META[season];
  const tint = hexToRgb(meta.color);
  const wash = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.14)`;

  const tiles = [...swatchHexes.slice(0, 4)];
  while (tiles.length < 4) tiles.push(BG);

  const swatchEls = tiles
    .map(
      (hex) =>
        `<div style="display:flex;width:220px;height:220px;border-radius:26px;background-color:${hex}"></div>`
    )
    .join('');

  const rootStyle = [
    'display:flex',
    'position:relative',
    'width:1200px',
    'height:630px',
    `background-color:${BG}`,
    `background-image:radial-gradient(circle at 150px 250px, ${wash}, rgba(0,0,0,0) 60%)`,
    `color:${INK}`,
  ].join(';');

  const leftColStyle = 'display:flex;flex-direction:column;padding:64px 0 0 90px';
  const headerStyle = 'display:flex;align-items:center';
  const wordmarkStyle =
    "display:flex;font-family:'Cormorant Garamond';font-weight:600;font-size:40px;line-height:1;margin-left:12px;" +
    `color:${INK}`;
  const eyebrowStyle =
    "display:flex;margin-top:72px;font-family:'Cormorant Garamond';font-weight:600;font-size:21px;letter-spacing:0.18em;line-height:1;" +
    `color:${MUTED}`;
  const seasonEnStyle = `display:flex;margin-top:16px;font-family:'Cormorant Garamond';font-weight:600;font-size:120px;line-height:1;color:${meta.color}`;
  const seasonJpStyle =
    "display:flex;margin-top:20px;font-family:'Shippori Mincho';font-weight:600;font-size:44px;line-height:1;" +
    `color:${INK}`;
  const gridStyle =
    'display:flex;flex-wrap:wrap;gap:20px;position:absolute;top:135px;left:720px;width:460px';

  return (
    `<div style="${rootStyle}">` +
    `<div style="${leftColStyle}">` +
    `<div style="${headerStyle}"><img src="${MARK_DATA_URI}" width="48" height="48" /><span style="${wordmarkStyle}">4seasons</span></div>` +
    `<div style="${eyebrowStyle}">PERSONAL COLOR</div>` +
    `<div style="${seasonEnStyle}">${meta.en}</div>` +
    `<div style="${seasonJpStyle}">${meta.jp}タイプ</div>` +
    `</div>` +
    `<div style="${gridStyle}">${swatchEls}</div>` +
    `</div>`
  );
}
