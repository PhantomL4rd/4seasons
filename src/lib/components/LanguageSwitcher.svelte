<script lang="ts">
import { Globe } from 'lucide-svelte';
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { locale, t } from '$lib/translations';

const LOCALE_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
};

const SUPPORTED_LOCALES = ['ja', 'en'] as const;

const currentLocale = $derived($locale);
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon" aria-label={$t('common.aria.languageSwitch')}>
        <Globe class="size-5" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-36">
    {#each SUPPORTED_LOCALES as loc}
      <DropdownMenu.Item
        class={currentLocale === loc ? 'bg-accent' : ''}
        onSelect={() => { $locale = loc; }}
      >
        {LOCALE_NAMES[loc]}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
