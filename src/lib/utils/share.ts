import type { MatchedDye } from '$lib/types';

const CANVAS_SIZE = 400;

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob from canvas'));
    }, 'image/png');
  });
}

export async function generateShareImage(recommendedDyes: MatchedDye[]): Promise<Blob> {
  const colors = recommendedDyes
    .slice(0, 4)
    .map((d) => rgbToHex(d.dye.rgb.r, d.dye.rgb.g, d.dye.rgb.b));

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;

  // 2x2 grid, no gaps
  const half = CANVAS_SIZE / 2;
  for (let i = 0; i < colors.length; i++) {
    const x = (i % 2) * half;
    const y = Math.floor(i / 2) * half;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y, half, half);
  }

  // Branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('4seasons', CANVAS_SIZE / 2, CANVAS_SIZE - 12);

  return canvasToBlob(canvas);
}

export async function shareResult(text: string, imageBlob: Blob): Promise<void> {
  const file = new File([imageBlob], '4seasons-result.png', { type: 'image/png' });

  try {
    if (navigator.canShare?.({ text, files: [file] })) {
      await navigator.share({ text, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
  }

  // Fallback: copy text + download image
  await navigator.clipboard.writeText(text);

  const url = URL.createObjectURL(imageBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '4seasons-result.png';
  a.click();
  URL.revokeObjectURL(url);
}
