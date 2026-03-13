<script lang="ts">
import '../app.css';
import { ModeWatcher } from 'mode-watcher';
import favicon from '$lib/assets/favicon.svg';
import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
import { t } from '$lib/translations';

let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<div class="min-h-dvh bg-background">
  <header class="bg-primary text-primary-foreground mb-8">
    <div class="container mx-auto flex h-14 items-center px-4">
      <div class="flex-1">
        <h1 class="text-xl font-bold">
          {$t('common.title')}
          <span class="text-sm font-normal opacity-75">{$t('common.subtitle')}</span>
        </h1>
      </div>
      <div class="flex items-center gap-1">
        <LanguageSwitcher />
      </div>
    </div>
  </header>

  <div class="container mx-auto px-4 pb-8">
    <main>
      {@render children()}
    </main>
  </div>

  <footer class="py-4 text-center text-xs text-muted-foreground">
    <p>{$t('common.footer.disclaimer')}</p>
    <p class="mt-1">{$t('common.footer.copyright')}</p>
  </footer>
</div>
