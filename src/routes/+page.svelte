<script lang="ts">
import { Bookmark, Share2 } from '@lucide/svelte';
import DyeRecommendation from '$lib/components/DyeRecommendation.svelte';
import ImagePreview from '$lib/components/ImagePreview.svelte';
import LoadingState from '$lib/components/LoadingState.svelte';
import SeasonBadge from '$lib/components/SeasonBadge.svelte';
import UploadArea from '$lib/components/UploadArea.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/translations';
import type { DiagnosisResponse, Phase } from '$lib/types';
import { createObjectUrl, resizeAndConvertToBase64, revokeObjectUrl } from '$lib/utils/image';
import { shareDiagnosis } from '$lib/utils/share';
import { getShareUrl } from '$lib/utils/share-url';

let phase: Phase = $state('upload');
let selectedFile: File | null = $state(null);
let previewUrl: string = $state('');
let errorTitle: string = $state('');
let errorMessage: string = $state('');
let diagnosisResult: DiagnosisResponse | null = $state(null);
let isSharing = $state(false);
let isSaving = $state(false);
let showCopiedToast = $state(false);

const TITLED_ERRORS = new Set([
  'noFaceDetected',
  'realHumanDetected',
  'multipleCharacters',
  'rateLimitExceeded',
  'diagnosisInconsistent',
]);

function handleFileSelect(file: File) {
  selectedFile = file;
  previewUrl = createObjectUrl(file);
  phase = 'preview';
}

function handleError(errorKey: string) {
  errorTitle = TITLED_ERRORS.has(errorKey) ? $t('common.error.oops') : '';
  errorMessage = $t(`common.error.${errorKey}`);
  phase = 'error';
}

function handleReset() {
  if (previewUrl) revokeObjectUrl(previewUrl);
  selectedFile = null;
  previewUrl = '';
  errorTitle = '';
  errorMessage = '';
  diagnosisResult = null;
  phase = 'upload';
}

async function handleShare() {
  if (!diagnosisResult || isSharing) return;
  isSharing = true;
  try {
    await shareDiagnosis(diagnosisResult, $t);
  } finally {
    isSharing = false;
  }
}

async function handleSave() {
  if (!diagnosisResult || isSaving) return;
  isSaving = true;
  try {
    const shareUrl = getShareUrl(diagnosisResult);
    await navigator.clipboard.writeText(shareUrl);
    showCopiedToast = true;
    setTimeout(() => {
      showCopiedToast = false;
    }, 3000);
  } finally {
    isSaving = false;
  }
}

async function handleDiagnose() {
  if (!selectedFile) return;

  phase = 'loading';

  try {
    const { base64, mimeType } = await resizeAndConvertToBase64(selectedFile);

    const response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        mimeType,
      }),
    });

    if (response.status === 429) {
      handleError('rateLimitExceeded');
      return;
    }

    if (response.status === 422) {
      const body = (await response.json()) as { error?: string };
      // 未知のキー（デプロイ世代ズレ等）は翻訳が空になるため汎用メッセージに落とす
      const errorKey = body.error && TITLED_ERRORS.has(body.error) ? body.error : 'analysisFailed';
      handleError(errorKey);
      return;
    }

    if (!response.ok) {
      handleError('analysisFailed');
      return;
    }

    diagnosisResult = await response.json();
    phase = 'result';
  } catch {
    handleError('networkError');
  }
}
</script>

<svelte:head>
  <title>{$t('common.title')} - {$t('common.subtitle')}</title>
  <meta name="description" content={$t('common.description')} />
  <link rel="canonical" href="https://4seasons.pl4rd.com/" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': 'https://4seasons.pl4rd.com/#app',
    name: '4seasons',
    url: 'https://4seasons.pl4rd.com/',
    description: $t('common.about.p1'),
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    inLanguage: ['ja', 'en'],
  })}</script>`}
</svelte:head>

<div class="flex flex-col items-center gap-8">
  <div class="text-center">
    <p class="text-pretty text-muted-foreground">{$t('common.description')}</p>
  </div>

  {#if phase === 'upload'}
    <div class="w-full">
      <UploadArea onFileSelect={handleFileSelect} onError={handleError} />
    </div>
  {:else if phase === 'preview'}
    <ImagePreview
      {previewUrl}
      onDiagnose={handleDiagnose}
      onReset={handleReset}
    />
  {:else if phase === 'loading'}
    <LoadingState message={$t('common.loading.analyzing')} submessage={$t('common.loading.tip')} />
  {:else if phase === 'result' && diagnosisResult}
    <div class="flex w-full flex-col items-center gap-6">
      <SeasonBadge season={diagnosisResult.result.season} />

      <DyeRecommendation dyes={diagnosisResult.recommendedDyes} dyesToAvoid={diagnosisResult.dyesToAvoid} season={diagnosisResult.result.season} />
      <div class="flex gap-3">
        <Button variant="outline" onclick={handleShare} disabled={isSharing}>
          <Share2 class="size-4" />
          {$t('common.share.button')}
        </Button>
        <Button variant="outline" onclick={handleSave} disabled={isSaving}>
          <Bookmark class="size-4" />
          {$t('common.share.save')}
        </Button>
      </div>
      {#if showCopiedToast}
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg transition-opacity">
          {$t('common.share.copied')}
        </div>
      {/if}
    </div>
  {:else if phase === 'error'}
    {@const isWarning = !!errorTitle}
    <div
      class="w-full rounded-xl border p-8 text-center {isWarning
        ? 'border-warning/30 bg-warning/10'
        : 'border-destructive/50 bg-destructive/5'}"
    >
      {#if errorTitle}
        <p class="text-lg font-bold text-warning">{errorTitle}</p>
      {/if}
      <p class="{isWarning ? 'mt-2 text-warning/90' : 'text-destructive'}">{errorMessage}</p>
      <Button variant="outline" class="mt-4" onclick={handleReset}>
        {$t('common.error.tryAgain')}
      </Button>
    </div>
  {/if}
</div>
