import type { Dye, DyesData } from '$lib/types';
import dyesJson from '../../../static/data/dyes.json';

const data = dyesJson as DyesData;

export const dyes: Dye[] = data.dyes;

export function getDyeById(id: string): Dye | undefined {
  return dyes.find((d) => d.id === id);
}
