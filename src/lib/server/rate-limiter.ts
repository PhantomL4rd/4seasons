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
  ip: string
): Promise<RateLimitResult> {
  if (!ns) {
    // DOが未設定の場合はレートリミットをスキップ
    return { allowed: true, remaining: 99, limit: 5 };
  }

  const id = ns.idFromName(ip);
  const stub = ns.get(id);
  const response = await stub.fetch('https://rate-limiter/consume', { method: 'POST' });
  return (await response.json()) as RateLimitResult;
}
