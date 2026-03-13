<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import { t } from '$lib/translations';
import type { MatchedDye } from '$lib/types';

interface Props {
  dyes: MatchedDye[];
  dyesToAvoid?: MatchedDye[];
}

let { dyes: matchedDyes, dyesToAvoid = [] }: Props = $props();

let baseDyes = $derived(matchedDyes.filter((d) => d.role === 'base'));
let accentDyes = $derived(matchedDyes.filter((d) => d.role === 'accent'));

function getDyeName(dye: MatchedDye): string {
  const translated = $t(`dye.names.${dye.dye.id}`);
  return translated.startsWith('dye.names.') ? dye.dye.name : translated;
}

function getCategoryName(category: string): string {
  const translated = $t(`dye.categories.${category}`);
  return translated.startsWith('dye.categories.') ? category : translated;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
</script>

{#snippet dyeCard(matched: MatchedDye)}
  <div class="flex items-center gap-3 rounded-lg border p-3">
    <div class="flex shrink-0 flex-col items-center gap-1">
      <div
        class="h-10 w-10 rounded-md border shadow-sm"
        style="background-color: {rgbToHex(matched.dye.rgb.r, matched.dye.rgb.g, matched.dye.rgb.b)}"
      ></div>
      <div
        class="h-2 w-10 rounded-full opacity-50"
        style="background-color: {matched.hex}"
      ></div>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">{getDyeName(matched)}</p>
      <Badge variant="outline" class="mt-1 text-xs">{getCategoryName(matched.dye.category)}</Badge>
    </div>
  </div>
{/snippet}

<Card.Root>
  <Card.Header>
    <Card.Title>{$t('common.recommendation.title')}</Card.Title>
  </Card.Header>
  <Card.Content>
    {#if baseDyes.length > 0}
      <h4 class="mb-3 text-sm font-medium text-muted-foreground">{$t('common.recommendation.baseColors')}</h4>
      <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each baseDyes as matched}
          {@render dyeCard(matched)}
        {/each}
      </div>
    {/if}

    {#if accentDyes.length > 0}
      <h4 class="mb-3 text-sm font-medium text-muted-foreground">{$t('common.recommendation.accentColors')}</h4>
      <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each accentDyes as matched}
          {@render dyeCard(matched)}
        {/each}
      </div>
    {/if}

    {#if dyesToAvoid.length > 0}
      <h4 class="mb-3 text-sm font-medium text-destructive/70">{$t('common.recommendation.colorsToAvoid')}</h4>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each dyesToAvoid as matched}
          <div class="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div
              class="h-10 w-10 shrink-0 rounded-md border shadow-sm"
              style="background-color: {rgbToHex(matched.dye.rgb.r, matched.dye.rgb.g, matched.dye.rgb.b)}"
            ></div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{getDyeName(matched)}</p>
              <Badge variant="outline" class="mt-1 text-xs">{getCategoryName(matched.dye.category)}</Badge>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
