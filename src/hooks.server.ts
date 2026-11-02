import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';

export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind !== 'unknown') return;
  console.error('[handleError]', event.url.pathname, error);
  return { message: 'Internal Error' };
};

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // TODO: enforce時はhooks.server.tsでの手動管理ではなくvite.config.tsのsveltekit({ csp })に移行し、
  // nonce/hashベースで設計すること（SvelteKitのインラインhydrationスクリプトとの整合性のため）
  response.headers.set(
    'Content-Security-Policy-Report-Only',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  return response;
};
