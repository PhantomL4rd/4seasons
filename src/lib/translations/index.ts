import type { Config } from 'sveltekit-i18n';
import i18n from 'sveltekit-i18n';

const config: Config = {
  fallbackLocale: 'ja',
  loaders: [
    {
      locale: 'ja',
      key: 'common',
      loader: async () => (await import('./ja/common.json')).default,
    },
    {
      locale: 'ja',
      key: 'dye',
      loader: async () => (await import('./ja/dye.json')).default,
    },
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'en',
      key: 'dye',
      loader: async () => (await import('./en/dye.json')).default,
    },
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
