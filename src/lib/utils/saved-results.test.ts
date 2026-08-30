import { beforeEach, describe, expect, it } from 'vitest';
import type { DiagnosisResponse, SavedResult, Season } from '$lib/types';
import { getSavedResults, saveResult } from './saved-results';
import { encodeShareData } from './share-url';

class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

function makeDiagnosis(season: Season, dyeId: string): DiagnosisResponse {
  return {
    result: { season },
    recommendedDyes: [
      {
        dye: {
          id: dyeId,
          name: dyeId,
          category: 'white',
          rgb: { r: 0, g: 0, b: 0 },
          tags: [],
          lodestone: '',
        },
        hex: '#000000',
        deltaE: 0,
        role: 'base',
      },
    ],
    dyesToAvoid: [],
  };
}

beforeEach(() => {
  globalThis.localStorage = new FakeLocalStorage() as unknown as Storage;
});

describe('saveResult', () => {
  it('保存した結果が一覧から取得できる', () => {
    const diagnosis = makeDiagnosis('spring', 'dye-a');

    saveResult(diagnosis);

    const results = getSavedResults();
    expect(results).toHaveLength(1);
    expect(results[0].season).toBe('spring');
  });

  it('同じ診断結果を再保存すると重複登録されず先頭に来る', () => {
    const diagnosis = makeDiagnosis('spring', 'dye-a');
    const other = makeDiagnosis('winter', 'dye-b');

    saveResult(diagnosis);
    saveResult(other);
    const results = saveResult(diagnosis);

    expect(results).toHaveLength(2);
    expect(results[0].season).toBe('spring');
    expect(results[1].season).toBe('winter');
  });

  it('保存件数が上限（20件）を超えると古いものから切り捨てられる', () => {
    let results: SavedResult[] = [];
    for (let i = 0; i < 21; i++) {
      results = saveResult(makeDiagnosis('spring', `dye-${i}`));
    }

    const newestId = encodeShareData(makeDiagnosis('spring', 'dye-20'));
    const oldestKeptId = encodeShareData(makeDiagnosis('spring', 'dye-1'));

    expect(results).toHaveLength(20);
    expect(results[0].id).toBe(newestId);
    expect(results.at(-1)?.id).toBe(oldestKeptId);
  });
});

describe('getSavedResults', () => {
  it('壊れたJSONが保存されている場合は空配列を返す', () => {
    localStorage.setItem('4seasons:saved-results', '{not valid json');

    expect(getSavedResults()).toEqual([]);
  });

  it('不正な形式のエントリが混在している場合はそれだけ除外する', () => {
    localStorage.setItem(
      '4seasons:saved-results',
      JSON.stringify([
        { id: 'ok', season: 'spring', savedAt: 1 },
        { id: 'broken-season', season: 'unknown', savedAt: 2 },
        { id: 'missing-savedAt' },
        null,
      ])
    );

    expect(getSavedResults()).toEqual([{ id: 'ok', season: 'spring', savedAt: 1 }]);
  });

  it('localStorageへのアクセス自体が例外を投げる場合は空配列を返す', () => {
    globalThis.localStorage = {
      getItem() {
        throw new DOMException('The operation is insecure', 'SecurityError');
      },
    } as unknown as Storage;

    expect(getSavedResults()).toEqual([]);
  });

  it('savedAtが有限数でないエントリは除外する', () => {
    // JSONはNaN/Infinityを直接表現できないが、1e999のような巨大な数値リテラルは
    // JSON.parseでInfinityに丸められる。typeof は 'number' のまま通過してしまう経路。
    localStorage.setItem(
      '4seasons:saved-results',
      '[{"id":"ok","season":"spring","savedAt":1},{"id":"infinity","season":"spring","savedAt":1e999}]'
    );

    expect(getSavedResults()).toEqual([{ id: 'ok', season: 'spring', savedAt: 1 }]);
  });

  it('savedAtが有限だがDateとして表現できない範囲のエントリは除外する', () => {
    localStorage.setItem(
      '4seasons:saved-results',
      JSON.stringify([
        { id: 'ok', season: 'spring', savedAt: 1 },
        { id: 'out-of-range', season: 'spring', savedAt: 1e308 },
      ])
    );

    expect(getSavedResults()).toEqual([{ id: 'ok', season: 'spring', savedAt: 1 }]);
  });
});
