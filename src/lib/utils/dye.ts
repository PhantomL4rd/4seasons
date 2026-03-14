import type { MatchedDye, TranslateFn } from '$lib/types';

export function getDyeName(dye: MatchedDye, t: TranslateFn): string {
  const translated = t(`dye.names.${dye.dye.id}`);
  return translated.startsWith('dye.names.') ? dye.dye.name : translated;
}
