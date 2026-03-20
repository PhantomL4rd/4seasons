import type { Dye, DyesData, Season } from '$lib/types';
import dyesJson from './dyes.json';
import seasonDyesJson from './season-dyes.json';

const data = dyesJson as DyesData;

export const dyes: Dye[] = data.dyes;

export function getDyeById(id: string): Dye | undefined {
  return dyes.find((d) => d.id === id);
}

const seasonDyeIds: Record<Season, string[]> = seasonDyesJson as Record<Season, string[]>;

export function getDyesBySeason(season: Season): Dye[] {
  const ids = seasonDyeIds[season] ?? [];
  return ids.map((id) => getDyeById(id)).filter((d): d is Dye => d !== undefined);
}
