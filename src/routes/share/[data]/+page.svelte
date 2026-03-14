<script lang="ts">
import { Share2 } from '@lucide/svelte';
import DyeRecommendation from '$lib/components/DyeRecommendation.svelte';
import SeasonBadge from '$lib/components/SeasonBadge.svelte';
import { t } from '$lib/translations';
import type { DiagnosisResponse } from '$lib/types';
import { generateShareImage, shareResult } from '$lib/utils/share';
import { decodeShareData, encodeShareData, restoreDiagnosis } from '$lib/utils/share-url';

let { data } = $props();

let diagnosis: DiagnosisResponse | null = $state(null);
let isValid = $state(false);
let isSharing = $state(false);

$effect(() => {
  const shareData = decodeShareData(data.data);
  if (shareData) {
    const restored = restoreDiagnosis(shareData);
    if (restored) {
      diagnosis = restored;
      isValid = true;
      return;
    }
  }
  isValid = false;
});

function getDyeName(dye: import('$lib/types').MatchedDye): string {
  const translated = $t(`dye.names.${dye.dye.id}`);
  return translated.startsWith('dye.names.') ? dye.dye.name : translated;
}

async function handleShare() {
  if (!diagnosis || isSharing) return;
  isSharing = true;
  try {
    const seasonLabel = $t(`common.season.${diagnosis.result.season}`);
    const dyeNames = diagnosis.recommendedDyes.slice(0, 3).map(getDyeName).join('\u3001');
    const shareUrl = `https://4seasons.pl4rd.com/share/${encodeShareData(diagnosis)}`;
    const text = [
      $t('common.share.result').replace('{season}', seasonLabel),
      $t('common.share.dyeList').replace('{dyes}', dyeNames),
      $t('common.share.hashtags'),
      shareUrl,
    ].join('\n');

    const blob = await generateShareImage(diagnosis.recommendedDyes);
    await shareResult(text, blob);
  } finally {
    isSharing = false;
  }
}
</script>

<svelte:head>
	<title>{$t('common.title')} - {$t('common.subtitle')}</title>
	<meta name="description" content={$t('common.description')} />
</svelte:head>

<div class="flex flex-col items-center gap-8">
	<div class="text-center">
		<p class="text-muted-foreground">{$t('common.description')}</p>
	</div>

	{#if isValid && diagnosis}
		<div class="flex w-full flex-col items-center gap-6">
			<SeasonBadge season={diagnosis.result.season} confidence={diagnosis.result.confidence} />
			<DyeRecommendation dyes={diagnosis.recommendedDyes} dyesToAvoid={diagnosis.dyesToAvoid} />
			<div class="flex gap-3">
				<a
					href="/"
					class="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
				>
					{$t('common.share.tryYourself')}
				</a>
				<button
					class="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
					onclick={handleShare}
					disabled={isSharing}
				>
					<Share2 class="size-4" />
					{$t('common.share.button')}
				</button>
			</div>
		</div>
	{:else}
		<div class="w-full rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center">
			<p class="text-destructive">{$t('common.share.invalidLink')}</p>
			<a
				href="/"
				class="mt-4 inline-block rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
			>
				{$t('common.share.tryYourself')}
			</a>
		</div>
	{/if}
</div>
