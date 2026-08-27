import { describe, expect, it } from 'vitest';
import { moveRect, resizeRect } from './crop';

// 座標はすべて表示画像に対する正規化値（0..1）。UIのpx座標は呼び出し側で変換する
describe('moveRect', () => {
  it('デルタ分だけ平行移動する', () => {
    const rect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    expect(moveRect(rect, 0.125, -0.125)).toEqual({ x: 0.375, y: 0.125, width: 0.5, height: 0.5 });
  });

  it('画像の外にはみ出す移動は境界でクランプされる（サイズは不変）', () => {
    const rect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    expect(moveRect(rect, 10, -10)).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
  });
});

describe('resizeRect', () => {
  const rect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };

  it('se（右下）ハンドルのドラッグで左上を固定したままサイズが変わる', () => {
    expect(resizeRect(rect, 'se', 0.125, -0.125)).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.625,
      height: 0.375,
    });
  });

  it('nw（左上）ハンドルのドラッグで右下を固定したままサイズが変わる', () => {
    expect(resizeRect(rect, 'nw', 0.125, 0.125)).toEqual({
      x: 0.375,
      y: 0.375,
      width: 0.375,
      height: 0.375,
    });
  });

  it('最小サイズより小さくは縮められない', () => {
    const result = resizeRect(rect, 'se', -10, -10, 0.125);
    expect(result.width).toBe(0.125);
    expect(result.height).toBe(0.125);
    expect(result.x).toBe(0.25);
    expect(result.y).toBe(0.25);
  });

  it('画像の外側へは広げられない', () => {
    const result = resizeRect(rect, 'se', 10, 10);
    expect(result).toEqual({ x: 0.25, y: 0.25, width: 0.75, height: 0.75 });
  });
});
