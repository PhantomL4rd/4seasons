import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import {
  fillRecommendedDyes,
  getFallbackDyes,
  sampleAvoidDyes,
  sampleRecommendedDyes,
} from '$lib/server/dye-matcher';
import { diagnoseWithGemini, screenDiagnosis } from '$lib/server/gemini';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { deriveSeason, resolveSecondarySeason } from '$lib/server/season';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
  // Cloudflare Workers上ではplatform.envから、ローカルdevでは.dev.varsから取得
  let apiKey: string | undefined;
  if (dev) {
    apiKey = env.GEMINI_API_KEY;
  } else {
    apiKey = platform?.env?.GEMINI_API_KEY;
  }
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    throw error(500, 'Service configuration error');
  }

  // レートリミットチェック（devモードではDOが未起動のためスキップ）
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const rateLimiter = dev ? undefined : platform?.env?.RATE_LIMITER;
  const rateLimit = await checkRateLimit(rateLimiter, ip, 3);

  if (!rateLimit.allowed) {
    return json(
      { error: 'rateLimitExceeded', remaining: 0 },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON');
  }

  const { image, mimeType } = (body ?? {}) as Record<string, unknown>;

  if (typeof image !== 'string' || !image) {
    throw error(400, 'image (base64 string) is required');
  }

  if (typeof mimeType !== 'string' || !mimeType) {
    throw error(400, 'mimeType (string) is required');
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw error(400, 'Unsupported image type');
  }

  // 2MB相当のbase64文字列長上限（base64は約4/3倍に膨張）
  const MAX_BASE64_LENGTH = 2 * 1024 * 1024 * (4 / 3);
  if (image.length > MAX_BASE64_LENGTH) {
    throw error(400, 'Image too large');
  }

  try {
    const geminiResult = await diagnoseWithGemini(apiKey, image, mimeType);

    const rejection = screenDiagnosis(geminiResult);
    if (rejection) {
      return json({ error: rejection }, { status: 422 });
    }

    // season は観察結果（undertone × chroma）からサーバー側で導出した値を正とする。
    // 不一致（gemini.ts でのリトライ後も矛盾が残ったケース）では、染料選択も
    // 自己申告 season 向けに選ばれていて信頼できないため、診断全体をエラーとする
    const season = deriveSeason(geminiResult.analysis);
    if (geminiResult.result.season !== season) {
      console.warn(
        `Gemini season "${geminiResult.result.season}" contradicts analysis-derived "${season}" after retry (analysis=${JSON.stringify(geminiResult.analysis)})`
      );
      return json({ error: 'diagnosisInconsistent' }, { status: 422 });
    }

    // Geminiが返した候補プール（primary 10 + secondary 5 想定）から
    // ランダムに 4 + 2 をサンプリング。同じ染料ばかり提案される問題への対処。
    let recommendedDyes = sampleRecommendedDyes(geminiResult.recommendedDyeIds);

    // 候補プールが痩せていた等でサンプリング結果が少ない場合はフォールバック
    if (recommendedDyes.length < 3) {
      recommendedDyes = getFallbackDyes(season);
    } else if (recommendedDyes.length < 6) {
      // カテゴリ衝突・候補不足で減った分をサブ季節の候補色から補充する
      console.warn(
        `Sampled recommended dyes reduced to ${recommendedDyes.length}; filling from secondary season "${geminiResult.analysis.secondarySeason}"`
      );
      const secondarySeason = resolveSecondarySeason(season, geminiResult.analysis.secondarySeason);
      recommendedDyes = fillRecommendedDyes(recommendedDyes, season, secondarySeason);
    }

    const recommendedIds = new Set(recommendedDyes.map((matched) => matched.dye.id));
    const dyesToAvoid = sampleAvoidDyes(geminiResult.avoidDyeIds, {
      excludeIds: recommendedIds,
    });

    return json(
      {
        result: { season },
        recommendedDyes,
        dyesToAvoid,
        remaining: rateLimit.remaining,
      },
      {
        headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
      }
    );
  } catch (e) {
    console.error('Diagnosis failed:', e);
    throw error(500, 'Diagnosis failed');
  }
};
