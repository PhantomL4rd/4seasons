import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeoutError, withTimeout } from './timeout';

afterEach(() => vi.useRealTimers());

describe('withTimeout', () => {
  it('時間切れで通信を中断し、応答しない処理からも復帰する', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = withTimeout((value) => {
      signal = value;
      return new Promise(() => {});
    }, 100);
    const result = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('正常終了後はタイマーを解除する', async () => {
    vi.useFakeTimers();
    expect(await withTimeout(async () => 'result', 100)).toBe('result');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('処理のエラーを維持し、タイマーを解除する', async () => {
    vi.useFakeTimers();
    const error = new Error('network failure');
    await expect(
      withTimeout(async () => {
        throw error;
      }, 100)
    ).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });
});
