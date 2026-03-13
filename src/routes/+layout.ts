import { loadTranslations } from '$lib/translations';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  const { pathname } = url;

  await loadTranslations('ja', pathname);

  return {};
};
