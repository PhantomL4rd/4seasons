<script lang="ts">
import DyeRecommendation from '$lib/components/DyeRecommendation.svelte';
import ImagePreview from '$lib/components/ImagePreview.svelte';
import LoadingState from '$lib/components/LoadingState.svelte';
import SeasonBadge from '$lib/components/SeasonBadge.svelte';
import UploadArea from '$lib/components/UploadArea.svelte';
import { t } from '$lib/translations';
import type { DiagnosisResponse, Phase } from '$lib/types';
import { createObjectUrl, resizeAndConvertToBase64, revokeObjectUrl } from '$lib/utils/image';

let phase: Phase = $state('upload');
let selectedFile: File | null = $state(null);
let previewUrl: string = $state('');
let errorTitle: string = $state('');
let errorMessage: string = $state('');
let diagnosisResult: DiagnosisResponse | null = $state(null);

const TITLED_ERRORS = new Set(['realHumanDetected', 'multipleCharacters', 'rateLimitExceeded']);

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
      handleError(body.error === 'realHumanDetected' ? 'realHumanDetected' : 'multipleCharacters');
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
</svelte:head>

<div class="flex flex-col items-center gap-8">
  <div class="text-center">
    <p class="text-muted-foreground">{$t('common.description')}</p>
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
    <LoadingState />
  {:else if phase === 'result' && diagnosisResult}
    <div class="flex w-full flex-col items-center gap-6">
      <SeasonBadge season={diagnosisResult.result.season} confidence={diagnosisResult.result.confidence} />

      <DyeRecommendation dyes={diagnosisResult.recommendedDyes} dyesToAvoid={diagnosisResult.dyesToAvoid} />
      <button
        class="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
        onclick={handleReset}
      >
        {$t('common.preview.retry')}
      </button>
    </div>
  {:else if phase === 'error'}
    {@const isWarning = !!errorTitle}
    <div
      class="w-full rounded-xl border p-8 text-center {isWarning
        ? 'border-amber-400/50 bg-amber-50 dark:bg-amber-950/20'
        : 'border-destructive/50 bg-destructive/5'}"
    >
      {#if errorTitle}
        <p class="text-lg font-bold text-amber-600 dark:text-amber-400">{errorTitle}</p>
      {/if}
      <p class="{isWarning ? 'mt-2 text-amber-700 dark:text-amber-300' : 'text-destructive'}">{errorMessage}</p>
      <button
        class="mt-4 rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
        onclick={handleReset}
      >
        {$t('common.error.tryAgain')}
      </button>
    </div>
  {/if}
</div>
