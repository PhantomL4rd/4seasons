import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getFallbackDyes, matchAvoidDyes, matchDyes } from '$lib/server/dye-matcher';
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
    throw error(500, 'GEMINI_API_KEY is not configured');
  }

  // レートリミットチェック（devモードではDOが未起動のためスキップ）
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const rateLimiter = dev ? undefined : platform?.env?.IP_RATE_LIMITER;
  const rateLimit = await checkRateLimit(rateLimiter, ip);

  if (!rateLimit.allowed) {
    return json(
      { error: 'rateLimitExceeded', remaining: 0 },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' },
      }
    );
  }

  const body = await request.json();
  const { image, mimeType } = body as {
    image?: string;
    mimeType?: string;
  };

  if (!image) {
    throw error(400, 'image (base64) is required');
  }

  if (!mimeType) {
    throw error(400, 'mimeType is required');
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

    let recommendedDyes = matchDyes(geminiResult.palette.base, geminiResult.palette.accent);

    // マッチング結果が少なすぎる場合はフォールバック
    if (recommendedDyes.length < 3) {
      recommendedDyes = getFallbackDyes(geminiResult.result.season);
    }

    // 推奨カララントのIDを除外して苦手カララントをマッチング
    const usedIds = new Set(recommendedDyes.map((d) => d.dye.id));
    const dyesToAvoid = matchAvoidDyes(geminiResult.colorsToAvoid, usedIds);

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
