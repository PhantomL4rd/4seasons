import type { CropRect } from './crop';

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.8;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'invalidFileType';
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 画像を（必要ならクロップして）リサイズ+JPEG圧縮し、base64に変換する。
 * 元サイズに関わらず常にCanvas経由でJPEG圧縮をかけるため、
 * 大きなPNG/WebPも安全にサイズ削減される。
 * crop は元画像に対する正規化座標（0..1）。省略時は全体を使う。
 */
export async function resizeAndConvertToBase64(
  file: File,
  crop?: CropRect
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const sourceX = Math.round((crop?.x ?? 0) * img.width);
  const sourceY = Math.round((crop?.y ?? 0) * img.height);
  const sourceWidth = Math.max(1, Math.round((crop?.width ?? 1) * img.width));
  const sourceHeight = Math.max(1, Math.round((crop?.height ?? 1) * img.height));

  let width = sourceWidth;
  let height = sourceHeight;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height / width) * MAX_DIMENSION);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width / height) * MAX_DIMENSION);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  const resizedDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = resizedDataUrl.split(',')[1];

  return { base64, mimeType: 'image/jpeg' };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}
