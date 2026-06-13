interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * DOを使ったレートリミットチェック。
 * DOが未設定の場合（ローカル開発など）はレートリミットをスキップする。
 */
export async function checkRateLimit(
  ns: DurableObjectNamespace | undefined,
  ip: string,
  limit: number
): Promise<RateLimitResult> {
  if (!ns) {
    // DOが未設定の場合はレートリミットをスキップ
    return { allowed: true, remaining: 99, limit };
  }

  try {
    const id = ns.idFromName(ip);
    const stub = ns.get(id);
    const response = await stub.fetch('https://rate-limiter/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
    return (await response.json()) as RateLimitResult;
  } catch (err) {
    // wrangler dev では別 Worker (fourseasons-rate-limiter) への service binding が
    // [not connected] になりがちで fetch が例外を投げる。診断機能まで巻き添えで
    // 落ちないよう、ここでは warn しつつスキップする。本番では service binding が
    // 接続済みなので通常パスを通る。
    console.warn('Rate limiter unavailable, skipping check.', err);
    return { allowed: true, remaining: 99, limit };
  }
}
