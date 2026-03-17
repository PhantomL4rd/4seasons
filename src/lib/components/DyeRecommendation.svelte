<script lang="ts">
import { PaintBucket } from '@lucide/svelte';
import * as Card from '$lib/components/ui/card';
import { t } from '$lib/translations';
import type { MatchedDye } from '$lib/types';
import { getDyeName } from '$lib/utils/dye';

interface Props {
  dyes: MatchedDye[];
  dyesToAvoid?: MatchedDye[];
}

let { dyes: matchedDyes, dyesToAvoid = [] }: Props = $props();

let baseDyes = $derived(matchedDyes.filter((d) => d.role === 'base'));

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
</script>

{#snippet dyeCard(matched: MatchedDye)}
  <a
    href="https://colorant-picker.pl4rd.com/?dye={matched.dye.id}"
    target="_blank"
    rel="noopener noreferrer"
    class="group overflow-hidden rounded-lg border transition-colors hover:bg-accent"
  >
    <div
      class="h-12 w-full"
      style="background-color: {rgbToHex(matched.dye.rgb.r, matched.dye.rgb.g, matched.dye.rgb.b)}"
    ></div>
    <div class="flex items-center gap-2 px-3 py-2">
      <p class="min-w-0 flex-1 truncate text-sm font-medium">{getDyeName(matched, $t)}</p>
      <svg xmlns="http://www.w3.org/2000/svg" class="size-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </div>
  </a>
{/snippet}

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
          {@render dyeCard(matched)}
        {/each}
      </div>
    {/if}

    {#if dyesToAvoid.length > 0}
      <h4 class="mb-3 text-sm font-medium text-red-600 dark:text-red-400">{$t('common.recommendation.colorsToAvoid')}</h4>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each dyesToAvoid as matched}
          <div class="overflow-hidden rounded-lg border border-destructive/20">
            <div
              class="h-12 w-full"
              style="background-color: {rgbToHex(matched.dye.rgb.r, matched.dye.rgb.g, matched.dye.rgb.b)}"
            ></div>
            <div class="bg-destructive/5 px-3 py-2">
              <p class="truncate text-sm font-medium">{getDyeName(matched, $t)}</p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
