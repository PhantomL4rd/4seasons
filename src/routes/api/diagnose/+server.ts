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

  // レートリミットチェック
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const rateLimit = await checkRateLimit(platform?.env?.IP_RATE_LIMITER, ip);

  if (!rateLimit.allowed) {
    return json(
      { error: 'Rate limit exceeded', remaining: 0 },
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

    if (geminiResult.characterCount >= 2) {
      return json({ error: 'multipleCharacters' }, { status: 422 });
    }

    let recommendedDyes = matchDyes(geminiResult.palette.base, geminiResult.palette.accent);

    // マッチング結果が少なすぎる場合はフォールバック
    if (recommendedDyes.length < 3) {
      recommendedDyes = getFallbackDyes(geminiResult.result.season);
    }

    // 推奨染料のIDを除外して苦手染料をマッチング
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
