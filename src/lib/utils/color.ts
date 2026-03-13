/**
 * 色変換・色差計算ユーティリティ（最小限）
 * colorant-pickerの colorConversion.ts から必要な部分のみ移植
 */

import type { Oklab, Rgb } from 'culori/fn';
import {
  converter,
  differenceEuclidean,
  modeOklab,
  modeRgb,
  nearest,
  parse,
  useMode,
} from 'culori/fn';
import type { RGBColor255 } from '$lib/types';

useMode(modeRgb);
useMode(modeOklab);

const toRgb = converter('rgb');
const toOklab = converter('oklab');
const deltaEOklabFn = differenceEuclidean('oklab');

const RGB_MAX = 255;

export function rgb255ToOklab(rgb255: RGBColor255): Oklab {
  const rgb: Rgb = {
    mode: 'rgb',
    r: rgb255.r / RGB_MAX,
    g: rgb255.g / RGB_MAX,
    b: rgb255.b / RGB_MAX,
  };
  return toOklab(rgb) as Oklab;
}

export function hexToOklab(hex: string): Oklab {
  const parsed = parse(hex);
  if (!parsed) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return toOklab(toRgb(parsed) as Rgb) as Oklab;
}

export function deltaEOklab(c1: Oklab, c2: Oklab): number {
  return deltaEOklabFn(c1, c2);
}

/**
 * パレットからターゲットに近い順にN個返す
 * culoriのnearest()はT[]を返すため、距離を別途計算して付与する
 */
export function createNearestFinder<T>(palette: T[], accessor: (item: T) => Oklab) {
  const findNearest = nearest(palette, deltaEOklabFn, accessor);
  return (target: Oklab, n?: number): { color: T; distance: number }[] => {
    const results = findNearest(target, n) as T[];
    return results.map((item) => ({
      color: item,
      distance: deltaEOklabFn(target, accessor(item)),
    }));
  };
}
