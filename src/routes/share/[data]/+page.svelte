<script lang="ts">
import { Share2 } from '@lucide/svelte';
import DyeRecommendation from '$lib/components/DyeRecommendation.svelte';
import LoadingState from '$lib/components/LoadingState.svelte';
import SeasonBadge from '$lib/components/SeasonBadge.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/translations';
import type { DiagnosisResponse } from '$lib/types';
import { shareDiagnosis } from '$lib/utils/share';
import { decodeShareData, restoreDiagnosis } from '$lib/utils/share-url';

let { data } = $props();

let diagnosis: DiagnosisResponse | null = $state(null);
let isLoading = $state(true);
let isSharing = $state(false);

$effect(() => {
  const shareData = decodeShareData(data.data);
  if (shareData) {
    const restored = restoreDiagnosis(shareData);
    if (restored) {
      diagnosis = restored;
      isLoading = false;
      return;
    }
  }
  isLoading = false;
});

async function handleShare() {
  if (!diagnosis || isSharing) return;
  isSharing = true;
  try {
    await shareDiagnosis(diagnosis, $t);
  } finally {
    isSharing = false;
  }
}
</script>

<svelte:head>
	<title>{$t('common.title')} - {$t('common.subtitle')}</title>
	<meta name="description" content={$t('common.description')} />
	{#if diagnosis}
		{@const seasonJp = $t(`common.season.${diagnosis.result.season}`)}
		<meta property="og:title" content={`${seasonJp}タイプ / 4seasons`} />
		<meta property="og:description" content={$t('common.description')} />
		<meta property="og:image" content={`https://4seasons.pl4rd.com/share/${data.data}/og.png`} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:url" content={`https://4seasons.pl4rd.com/share/${data.data}`} />
		<meta property="og:type" content="website" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={`https://4seasons.pl4rd.com/share/${data.data}/og.png`} />
	{/if}
</svelte:head>

<div class="flex flex-col items-center gap-8">
	<div class="text-center">
		<p class="text-pretty text-muted-foreground">{$t('common.description')}</p>
	</div>

	{#if isLoading}
		<LoadingState />
	{:else if diagnosis}
		<div class="flex w-full flex-col items-center gap-6">
			<SeasonBadge season={diagnosis.result.season} />
			<DyeRecommendation dyes={diagnosis.recommendedDyes} dyesToAvoid={diagnosis.dyesToAvoid} season={diagnosis.result.season} />
			<div class="flex gap-3">
				<Button variant="outline" href="/">
					{$t('common.share.tryYourself')}
				</Button>
				<Button variant="outline" onclick={handleShare} disabled={isSharing}>
					<Share2 class="size-4" />
					{$t('common.share.button')}
				</Button>
			</div>
		</div>
	{:else}
		<div class="w-full rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center">
			<p class="text-destructive">{$t('common.share.invalidLink')}</p>
			<Button variant="outline" href="/" class="mt-4">
				{$t('common.share.tryYourself')}
			</Button>
		</div>
	{/if}
</div>
