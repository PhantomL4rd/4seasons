import { loadTranslations } from '#lib/translations/index.js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  const { pathname } = url;

  await loadTranslations('ja', pathname);

  return {};
};
