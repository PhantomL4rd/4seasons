import { afterEach, describe, expect, it, vi } from 'vitest';
import { dyes } from '$lib/data/dyes';
import { isCatalogDye } from './dye-matcher';
import {
  buildDyeCatalog,
  diagnoseWithGemini,
  parseGeminiDiagnosis,
  screenDiagnosis,
} from './gemini';

function validPayload() {
  return {
    isFaceVisible: true,
    isRealHuman: false,
    characterCount: 1,
    analysis: {
      undertone: 'warm',
      contrast: 'high',
      chroma: 'clear',
      secondarySeason: 'autumn',
    },
    result: { season: 'spring' },
    recommendedDyeIds: {
      primary: ['dye_008', 'dye_065'],
      secondary: ['dye_025'],
    },
    avoidDyeIds: ['dye_010'],
  };
}

describe('parseGeminiDiagnosis', () => {
  it('スキーマ準拠のレスポンスをそのまま返す', () => {
    const payload = validPayload();
    expect(parseGeminiDiagnosis(JSON.stringify(payload))).toEqual(payload);
  });

  it('JSONとして壊れていれば例外を投げる', () => {
    expect(() => parseGeminiDiagnosis('not json')).toThrow();
  });

  it('season が enum 外なら例外を投げる', () => {
    const payload = { ...validPayload(), result: { season: 'sprong' } };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('analysis が欠落していれば例外を投げる', () => {
    const { analysis: _analysis, ...payload } = validPayload();
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('undertone が enum 外なら例外を投げる', () => {
    const payload = validPayload();
    const broken = { ...payload, analysis: { ...payload.analysis, undertone: 'neutral' } };
    expect(() => parseGeminiDiagnosis(JSON.stringify(broken))).toThrow();
  });

  it('secondarySeason が enum 外なら例外を投げる', () => {
    const payload = validPayload();
    const broken = { ...payload, analysis: { ...payload.analysis, secondarySeason: 'rainy' } };
    expect(() => parseGeminiDiagnosis(JSON.stringify(broken))).toThrow();
  });

  it('recommendedDyeIds.primary が文字列配列でなければ例外を投げる', () => {
    const payload = {
      ...validPayload(),
      recommendedDyeIds: { primary: [1, 2, 3], secondary: ['dye_025'] },
    };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('recommendedDyeIds.secondary が欠落していれば例外を投げる', () => {
    const payload = {
      ...validPayload(),
      recommendedDyeIds: { primary: ['dye_008'] },
    };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('recommendedDyeIds が旧形式（配列）なら例外を投げる（互換性なし）', () => {
    const payload = { ...validPayload(), recommendedDyeIds: ['dye_008'] };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('characterCount が数値でなければ例外を投げる', () => {
    const payload = { ...validPayload(), characterCount: 'one' };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('characterCount が整数でなければ例外を投げる', () => {
    const payload = { ...validPayload(), characterCount: 1.5 };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('characterCount が負数なら例外を投げる', () => {
    const payload = { ...validPayload(), characterCount: -1 };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });

  it('isFaceVisible が boolean でなければ例外を投げる', () => {
    const payload = { ...validPayload(), isFaceVisible: 'yes' };
    expect(() => parseGeminiDiagnosis(JSON.stringify(payload))).toThrow();
  });
});

describe('buildDyeCatalog', () => {
  const catalogIds = () => dyes.filter(isCatalogDye).map((d) => d.id);
  const extractIds = (catalog: string) => catalog.split('\n').map((line) => line.split(':')[0]);

  it('カタログ対象の全染料IDを保持する（シャッフルしても欠落しない）', () => {
    const catalog = buildDyeCatalog(() => 0.5);
    expect(extractIds(catalog).sort()).toEqual(catalogIds().sort());
  });

  it('乱数源が異なれば出力順が変わる（位置バイアス緩和）', () => {
    // 同じ乱数列を先頭から返すシード関数
    const seeded = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const catalogA = buildDyeCatalog(seeded(1));
    const catalogB = buildDyeCatalog(seeded(42));
    expect(catalogA).not.toBe(catalogB);
    // 集合としては同じ（IDの欠落・重複がない）
    expect(extractIds(catalogA).sort()).toEqual(extractIds(catalogB).sort());
  });
});

describe('screenDiagnosis', () => {
  const parse = (payload: unknown) => parseGeminiDiagnosis(JSON.stringify(payload));

  it('正常な単独キャラは通過する', () => {
    expect(screenDiagnosis(parse(validPayload()))).toBeNull();
  });

  it('顔が見えなければ noFaceDetected', () => {
    expect(screenDiagnosis(parse({ ...validPayload(), isFaceVisible: false }))).toBe(
      'noFaceDetected'
    );
  });

  it('characterCount 0 は noFaceDetected（矛盾出力の破棄）', () => {
    expect(screenDiagnosis(parse({ ...validPayload(), characterCount: 0 }))).toBe('noFaceDetected');
  });

  it('実写なら realHumanDetected', () => {
    expect(screenDiagnosis(parse({ ...validPayload(), isRealHuman: true }))).toBe(
      'realHumanDetected'
    );
  });

  it('2人以上なら multipleCharacters', () => {
    expect(screenDiagnosis(parse({ ...validPayload(), characterCount: 2 }))).toBe(
      'multipleCharacters'
    );
  });
});

function geminiApiResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  };
}

describe('diagnoseWithGemini のリトライ', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('スキーマ逸脱は1回だけリトライして復帰する', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = { ...validPayload(), result: { season: 'sprong' } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiApiResponse(broken))
      .mockResolvedValueOnce(geminiApiResponse(validPayload()));
    vi.stubGlobal('fetch', fetchMock);

    const result = await diagnoseWithGemini('key', 'img', 'image/png');
    expect(result.result.season).toBe('spring');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('season矛盾（analysisと自己申告の不一致）は1回だけリトライする', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // analysis は warm+clear → spring のはずが winter を自己申告
    const inconsistent = { ...validPayload(), result: { season: 'winter' } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiApiResponse(inconsistent))
      .mockResolvedValueOnce(geminiApiResponse(validPayload()));
    vi.stubGlobal('fetch', fetchMock);

    const result = await diagnoseWithGemini('key', 'img', 'image/png');
    expect(result.result.season).toBe('spring');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('APIエラー（HTTP非OK）はリトライせずそのまま失敗する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'quota exceeded',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(diagnoseWithGemini('key', 'img', 'image/png')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
