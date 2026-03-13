<script lang="ts">
import '../app.css';
import favicon from '$lib/assets/favicon.svg';
import { locale, t } from '$lib/translations';

let { children } = $props();

function toggleLocale() {
  const next = $locale === 'ja' ? 'en' : 'ja';
  $locale = next;
}
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
  <header class="border-b">
    <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold tracking-tight">{$t('common.title')}</h1>
        <span class="text-sm text-muted-foreground">| {$t('common.subtitle')}</span>
      </div>
      <button
        class="rounded-md border px-3 py-1 text-sm transition-colors hover:bg-accent"
        onclick={toggleLocale}
      >
        {$locale === 'ja' ? 'EN' : 'JA'}
      </button>
    </div>
  </header>

  <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
    {@render children()}
  </main>

  <footer class="border-t">
    <div class="mx-auto max-w-3xl px-4 py-4 text-center text-xs text-muted-foreground">
      <p>{$t('common.footer.disclaimer')}</p>
      <p class="mt-1">{$t('common.footer.copyright')}</p>
    </div>
  </footer>
</div>
