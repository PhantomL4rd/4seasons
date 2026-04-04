import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getFallbackDyes, resolveDyeIds } from '$lib/server/dye-matcher';
import { diagnoseWithGemini } from '$lib/server/gemini';
import { checkRateLimit } from '$lib/server/rate-limiter';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
  // Cloudflare Workers上ではplatform.envから、ローカルdevでは.dev.varsから取得
  let apiKey: string | undefined;
  if (dev) {
    const { GEMINI_API_KEY } = await import('$env/static/private');
    apiKey = GEMINI_API_KEY;
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

  const rateLimiter = dev ? undefined : platform?.env?.IP_RATE_LIMITER;
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

    if (!geminiResult.isFaceVisible) {
      return json({ error: 'noFaceDetected' }, { status: 422 });
    }

    if (geminiResult.isRealHuman) {
      return json({ error: 'realHumanDetected' }, { status: 422 });
    }

    if (geminiResult.characterCount >= 2) {
      return json({ error: 'multipleCharacters' }, { status: 422 });
    }

    let recommendedDyes = resolveDyeIds(geminiResult.recommendedDyeIds, 'base');

    // Geminiが返したIDが不正で結果が少ない場合はフォールバック
    if (recommendedDyes.length < 3) {
      recommendedDyes = getFallbackDyes(geminiResult.result.season);
    }

    const dyesToAvoid = resolveDyeIds(geminiResult.avoidDyeIds, 'avoid');

    return json(
      {
        result: geminiResult.result,
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
