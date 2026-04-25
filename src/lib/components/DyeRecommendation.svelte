<script lang="ts">
import { PaintBucket } from '@lucide/svelte';
import DyeCard from '$lib/components/DyeCard.svelte';
import * as Card from '$lib/components/ui/card';
import { t } from '$lib/translations';
import type { MatchedDye, Season } from '$lib/types';
import { rgbToHex } from '$lib/utils/color';
import { getDyeName } from '$lib/utils/dye';

interface Props {
  dyes: MatchedDye[];
  dyesToAvoid?: MatchedDye[];
  season: Season;
}

let { dyes: matchedDyes, dyesToAvoid = [], season }: Props = $props();

let baseDyes = $derived(matchedDyes.filter((d) => d.role === 'base'));
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <PaintBucket class="size-5" />
      {$t('common.recommendation.title')}
    </Card.Title>
  </Card.Header>
  <Card.Content>
    {#if baseDyes.length > 0}
      <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each baseDyes as matched}
          <DyeCard dye={matched.dye} />
        {/each}
      </div>
    {/if}

    <a
      href="/seasons/{season}"
      target="_blank"
      rel="noopener noreferrer"
      class="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {$t('common.season.youMightAlsoLike')}
      <svg xmlns="http://www.w3.org/2000/svg" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </a>

    {#if dyesToAvoid.length > 0}
      <h4 class="mb-3 text-sm font-medium text-warning">{$t('common.recommendation.colorsToAvoid')}</h4>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each dyesToAvoid as matched}
          <div class="overflow-hidden rounded-lg border border-destructive/20">
            <div
              class="h-12 w-full"
              style="background-color: {rgbToHex(matched.dye.rgb.r, matched.dye.rgb.g, matched.dye.rgb.b)}"
            ></div>
            <div class="bg-destructive/5 px-3 py-2">
              <p class="truncate text-sm font-medium">{getDyeName(matched.dye, $t)}</p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
