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

  const id = ns.idFromName(ip);
  const stub = ns.get(id);
  const response = await stub.fetch('https://rate-limiter/consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit }),
  });
  return (await response.json()) as RateLimitResult;
}
