export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: any) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      if (options.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout (${options.timeoutMs}ms)`)),
            options.timeoutMs,
          ),
        );
        return await Promise.race([operation(), timeoutPromise]);
      }
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxRetries) {
        options.onRetry?.(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }

  throw lastError;
}
