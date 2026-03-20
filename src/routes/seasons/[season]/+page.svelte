<script lang="ts">
import DyeCard from '$lib/components/DyeCard.svelte';
import SeasonBadge from '$lib/components/SeasonBadge.svelte';
import { getDyesBySeason } from '$lib/data/dyes';
import { t } from '$lib/translations';
import type { DyeCategory, Season } from '$lib/types';

let { data } = $props();

const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const categoryOrder: DyeCategory[] = [
  'white',
  'red',
  'brown',
  'yellow',
  'green',
  'blue',
  'purple',
  'rare',
];

let seasonDyes = $derived(getDyesBySeason(data.season));

let availableCategories = $derived(
  categoryOrder.filter((cat) => seasonDyes.some((d) => d.category === cat))
);

let activeCategory: DyeCategory = $state('white');

// Reset active category when season changes and current tab is no longer available
$effect(() => {
  if (!availableCategories.includes(activeCategory)) {
    activeCategory = availableCategories[0] ?? 'white';
  }
});

let filteredDyes = $derived(seasonDyes.filter((d) => d.category === activeCategory));

let seasonLabel = $derived($t(`common.season.${data.season}`));
let pageTitle = $derived($t('common.season.catalog.title').replace('{{season}}', seasonLabel));
let pageDescription = $derived(
  $t('common.season.catalog.description').replace('{{season}}', seasonLabel)
);
</script>

<svelte:head>
  <title>{pageTitle} - {$t('common.title')}</title>
  <meta name="description" content={pageDescription} />
</svelte:head>

<div class="flex flex-col items-center gap-6">
  <SeasonBadge season={data.season} />

  <!-- Season switcher -->
  <nav class="flex gap-2">
    {#each seasons as s}
      <a
        href="/seasons/{s}"
        class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors {s === data.season
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:bg-accent'}"
      >
        {$t(`common.season.${s}`)}
      </a>
    {/each}
  </nav>

  <!-- Category tabs -->
  <div class="flex flex-wrap justify-center gap-2">
    {#each availableCategories as cat}
      <button
        onclick={() => (activeCategory = cat)}
        class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {cat === activeCategory
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent'}"
      >
        {$t(`common.season.catalog.category.${cat}`)}
      </button>
    {/each}
  </div>

  <!-- Dye grid -->
  <div class="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each filteredDyes as dye (dye.id)}
      <DyeCard {dye} />
    {/each}
  </div>
</div>
