import type { DiagnosisResponse, MatchedDye, TranslateFn } from '$lib/types';
import { getDyeName } from '$lib/utils/dye';
import { encodeShareData, getShareUrl } from '$lib/utils/share-url';

const MAX_SHARE_DYE_COUNT = 4;

export function buildDyeNamesText(dyes: MatchedDye[], t: TranslateFn): string {
  return dyes
    .slice(0, MAX_SHARE_DYE_COUNT)
    .map((d) => getDyeName(d.dye, t))
    .join('、');
}

// Reuses the server-rendered OG image as the Web Share API payload, so the
// shared file matches what crawlers/embed previews show for the same URL.
// Returns null if the endpoint is unavailable (e.g. running under `vite dev`,
// which can't load workers-og's wasm) so the share still succeeds with text.
async function fetchShareImage(diagnosis: DiagnosisResponse): Promise<Blob | null> {
  try {
    const path = `/share/${encodeShareData(diagnosis)}/og.png`;
    const url = new URL(path, window.location.origin).toString();
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Share image fetch returned ${res.status}; sharing text only.`);
      return null;
    }
    return await res.blob();
  } catch (err) {
    console.warn('Share image fetch failed; sharing text only.', err);
    return null;
  }
}

export async function shareDiagnosis(diagnosis: DiagnosisResponse, t: TranslateFn): Promise<void> {
  const seasonLabel = t(`common.season.${diagnosis.result.season}`);
  const dyeNames = buildDyeNamesText(diagnosis.recommendedDyes, t);
  const shareUrl = getShareUrl(diagnosis);
  const text = [
    t('common.share.result').replace('{season}', seasonLabel),
    t('common.share.dyeList').replace('{dyes}', dyeNames),
    t('common.share.hashtags'),
    shareUrl,
  ].join('\n');

  const blob = await fetchShareImage(diagnosis);
  await shareResult(text, blob);
}

export async function shareResult(text: string, imageBlob: Blob | null): Promise<void> {
  const file = imageBlob
    ? new File([imageBlob], '4seasons-result.png', { type: 'image/png' })
    : null;

  try {
    if (file && navigator.canShare?.({ text, files: [file] })) {
      await navigator.share({ text, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
  }

  // Fallback: copy text + download image (if we have one).
  await navigator.clipboard.writeText(text);

  if (imageBlob) {
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '4seasons-result.png';
    a.click();
    URL.revokeObjectURL(url);
  }
}
