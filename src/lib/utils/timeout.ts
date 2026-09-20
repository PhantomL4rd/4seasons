export class TimeoutError extends Error {
  constructor() {
    super('Operation timed out');
    this.name = 'TimeoutError';
  }
}

/** Abort network work and also bound operations that do not support AbortSignal. */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  milliseconds: number
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new TimeoutError();
      reject(error);
      controller.abort(error);
    }, milliseconds);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
