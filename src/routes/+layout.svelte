<script lang="ts">
import '../app.css';
import { Info, LayoutGrid } from '@lucide/svelte';
import { ModeWatcher } from 'mode-watcher';
import favicon from '$lib/assets/favicon.svg';
import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
import SideDrawer from '$lib/components/ui/SideDrawer.svelte';
import { t } from '$lib/translations';

let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta property="og:title" content="4seasons" />
  <meta property="og:description" content={$t('common.description')} />
  <meta property="og:image" content="https://4seasons.pl4rd.com/ogp.png" />
  <meta property="og:url" content="https://4seasons.pl4rd.com" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<ModeWatcher />

<div class="min-h-dvh bg-background">
  <div class="bg-info text-info-foreground">
    <div class="container mx-auto flex items-start gap-2 px-4 py-1.5 text-[11px] sm:text-xs">
      <Info class="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <p class="text-pretty whitespace-pre-line">{$t('common.footer.disclaimer')}</p>
    </div>
  </div>

  <header class="bg-primary text-primary-foreground mb-8">
    <div class="container mx-auto flex items-center h-14 px-4">
      <div class="flex-1">
        <h1 class="text-xl font-bold">
          <a href="/" data-sveltekit-reload class="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LayoutGrid class="size-5" />
            {$t('common.title')}
            <span class="text-sm font-normal opacity-75">{$t('common.subtitle')}</span>
          </a>
        </h1>
      </div>
      <div class="flex items-center gap-1">
        <LanguageSwitcher />
        <SideDrawer />
      </div>
    </div>
  </header>

  <div class="container mx-auto px-4 pb-8">
    <main>
      {@render children()}
    </main>
  </div>

  <footer class="py-4 text-center text-xs text-muted-foreground">
    <p>{$t('common.footer.copyright')}</p>
  </footer>
</div>
