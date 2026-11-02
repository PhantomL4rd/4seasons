import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleError } from './hooks.server';

afterEach(() => vi.restoreAllMocks());

describe('error responses', () => {
  it.each(['app', 'framework'] as const)(
    'preserves the safe message and status for %s errors',
    async (kind) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = { url: new URL('https://fixture.invalid/missing') } as RequestEvent;
      expect(
        await handleError({ kind, error: { status: 404, message: 'Not found' }, event })
      ).toBeUndefined();
      expect(log).not.toHaveBeenCalled();
    }
  );
});
