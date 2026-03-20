import type { Dye, TranslateFn } from '$lib/types';

export function getDyeName(dye: Dye, t: TranslateFn): string {
  const translated = t(`dye.names.${dye.id}`);
  return translated.startsWith('dye.names.') ? dye.name : translated;
}
