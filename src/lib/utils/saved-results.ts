import type { DiagnosisResponse, SavedResult, Season } from '$lib/types';
import { encodeShareData, VALID_SEASONS } from './share-url';

const STORAGE_KEY = '4seasons:saved-results';
const MAX_SAVED_RESULTS = 20;

function isSavedResult(value: unknown): value is SavedResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.savedAt === 'number' &&
    !Number.isNaN(new Date(v.savedAt).getTime()) &&
    VALID_SEASONS.includes(v.season as Season)
  );
}

export function getSavedResults(): SavedResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedResult);
  } catch {
    return [];
  }
}

export function saveResult(diagnosis: DiagnosisResponse): SavedResult[] {
  const entry: SavedResult = {
    id: encodeShareData(diagnosis),
    season: diagnosis.result.season,
    savedAt: Date.now(),
  };
  const existing = getSavedResults().filter((r) => r.id !== entry.id);
  const next = [entry, ...existing].slice(0, MAX_SAVED_RESULTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
