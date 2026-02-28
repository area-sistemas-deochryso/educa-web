import { MonoTypeOperatorFunction, pipe, retry, throwError, timer } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { logger } from '@core/helpers/logs/logger';

/**
 * Configuration for the withRetry operator.
 */
interface WithRetryConfig {
  /** Max number of retry attempts. */
  retryCount?: number;
  /** Timeout per attempt in milliseconds. */
  timeoutMs?: number;
  /** Log tag for retry warnings. */
  tag?: string;
}

const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_TIMEOUT_MS = 15_000;
const BASE_DELAY_MS = 1_000;

/**
 * RxJS operator: timeout + retry with exponential backoff.
 *
 * Does NOT catchError. The caller decides what to do with the error.
 * Skips retry for 4xx client errors except 408 and 429.
 *
 * @param config Optional retry configuration.
 * @returns Operator function.
 * @example
 * http.get(url).pipe(withRetry({ retryCount: 3, timeoutMs: 10000 }));
 */
export function withRetry<T>(config?: WithRetryConfig): MonoTypeOperatorFunction<T> {
  const retryCount = config?.retryCount ?? DEFAULT_RETRY_COUNT;
  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const tag = config?.tag ?? 'HTTP';

  return pipe(
    timeout(timeoutMs),
    retry({
      count: retryCount,
      delay: (error, attempt) => {
        if (isNonRetryableError(error)) {
          return throwError(() => error);
        }

        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`[${tag}] Retry ${attempt}/${retryCount} in ${delayMs}ms`);
        return timer(delayMs);
      },
    }),
  );
}

/**
 * Check if an error is a non retryable client error.
 */
function isNonRetryableError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (!status) return false;

  const isClientError = status >= 400 && status < 500;
  const isRetryableClientError = status === 408 || status === 429;

  return isClientError && !isRetryableClientError;
}
