import LZString from 'lz-string';
import { getDyeById } from '$lib/data/dyes';
import type { DiagnosisResponse, MatchedDye, Season } from '$lib/types';

interface ShareData {
  s: Season;
  r: string[];
  a: string[];
}

export const VALID_SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const MAX_COMPRESSED_LENGTH = 2048;
const MAX_JSON_LENGTH = 5000;
const MAX_ID_LENGTH = 20;

const SHARE_BASE_URL = 'https://4seasons.pl4rd.com/share';

export function getShareUrl(result: DiagnosisResponse): string {
  return `${SHARE_BASE_URL}/${encodeShareData(result)}`;
}

export function encodeShareData(result: DiagnosisResponse): string {
  const data: ShareData = {
    s: result.result.season,
    r: result.recommendedDyes.map((d) => d.dye.id),
    a: result.dyesToAvoid.map((d) => d.dye.id),
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeShareData(compressed: string): ShareData | null {
  if (!compressed || compressed.length > MAX_COMPRESSED_LENGTH) return null;

  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json || json.length > MAX_JSON_LENGTH) return null;

    const data = JSON.parse(json) as ShareData;

    if (!VALID_SEASONS.includes(data.s)) return null;
    if (!Array.isArray(data.r) || !Array.isArray(data.a)) return null;
    if ([...data.r, ...data.a].some((id) => typeof id !== 'string' || id.length > MAX_ID_LENGTH))
      return null;

    return data;
  } catch {
    return null;
  }
}

function buildMatchedDye(id: string, role: 'base' | 'avoid'): MatchedDye | null {
  const dye = getDyeById(id);
  if (!dye) return null;

  const { r, g, b } = dye.rgb;
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  return { dye, hex, deltaE: 0, role };
}

export function restoreDiagnosis(shareData: ShareData): DiagnosisResponse | null {
  const recommendedDyes = shareData.r
    .map((id) => buildMatchedDye(id, 'base'))
    .filter((d): d is MatchedDye => d !== null);
  const dyesToAvoid = shareData.a
    .map((id) => buildMatchedDye(id, 'avoid'))
    .filter((d): d is MatchedDye => d !== null);

  if (recommendedDyes.length === 0) return null;

  return {
    result: { season: shareData.s },
    recommendedDyes,
    dyesToAvoid,
  };
}
