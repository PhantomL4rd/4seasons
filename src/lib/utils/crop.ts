/** 表示画像に対する正規化座標（0..1）で表すクロップ範囲 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** クロップ枠を平行移動する。画像（0..1）からはみ出さない位置にクランプする */
export function moveRect(rect: CropRect, dx: number, dy: number): CropRect {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, 1 - rect.width),
    y: clamp(rect.y + dy, 0, 1 - rect.height),
  };
}

export type CropHandle = 'nw' | 'ne' | 'sw' | 'se';

/**
 * コーナーハンドルのドラッグでクロップ枠をリサイズする。
 * 対角のコーナーを固定し、最小サイズと画像境界（0..1）の範囲でクランプする。
 */
export function resizeRect(
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  minSize = 0.05
): CropRect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (handle === 'nw' || handle === 'sw') {
    left = clamp(left + dx, 0, right - minSize);
  } else {
    right = clamp(right + dx, left + minSize, 1);
  }
  if (handle === 'nw' || handle === 'ne') {
    top = clamp(top + dy, 0, bottom - minSize);
  } else {
    bottom = clamp(bottom + dy, top + minSize, 1);
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}
