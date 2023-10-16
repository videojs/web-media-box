interface AttemptDiagnosticInfo {
  attemptNumber: number;
  currentDelaySec: number;
  expectedFuzzedDelayRangeSec: { from: number; to: number };
  retryReason: string | null;
}

type WrappedWithRetry<T> = {
  (...args: unknown[]): Promise<T>;
  attempts: Array<AttemptDiagnosticInfo>;
};

interface RetryWrapperOptions {
  maxAttempts: number;
  delay: number;
  delayFactor: number;
  fuzzFactor: number;
}

interface RetryWrapperHooks {
  onAttempt?: (diagnosticInfo: AttemptDiagnosticInfo) => void;
}

class MaxAttemptsExceeded extends Error {
  public constructor() {
    super(`Max attempts number is exceeded.`);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class RetryWrapper {
  private readonly maxAttempts: number;
  private readonly delay: number;
  private readonly delayFactor: number;
  private readonly fuzzFactor: number;

  public constructor(options: RetryWrapperOptions) {
    this.maxAttempts = options.maxAttempts;
    this.delay = options.delay;
    this.delayFactor = options.delayFactor;
    this.fuzzFactor = options.fuzzFactor;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public wrap<T>(fn: Function, hooks: RetryWrapperHooks = {}, waitFn = wait): WrappedWithRetry<T> {
    let attemptNumber = 1;
    let delay = this.delay;
    let lastError: Error | null = null;

    const attempts: Array<AttemptDiagnosticInfo> = [];

    const wrapped = async (...args: unknown[]): Promise<T> => {
      if (attemptNumber > this.maxAttempts) {
        if (lastError) {
          throw lastError;
        }

        throw new MaxAttemptsExceeded();
      }

      try {
        const attemptDiagnosticInfo = this.createDiagnosticInfoForAttempt(attemptNumber, delay, lastError);
        attempts.push(attemptDiagnosticInfo);
        hooks.onAttempt?.call(null, attemptDiagnosticInfo);
        return await fn(...args);
      } catch (e) {
        lastError = e as Error;
        await waitFn(this.applyFuzzFactor(delay));
        attemptNumber++;
        delay = this.applyDelayFactor(delay);
        return wrapped(...args);
      }
    };

    wrapped.attempts = attempts;

    return wrapped;
  }

  /**
   * For example fuzzFactor is 0.1
   * This means ±10% deviation
   * So if we have delay as 1000
   * This function can generate any value from 900 to 1100
   * @param delay
   * @private
   */
  private applyFuzzFactor(delay: number): number {
    const lowValue = (1 - this.fuzzFactor) * delay;
    const highValue = (1 + this.fuzzFactor) * delay;

    return lowValue + Math.random() * (highValue - lowValue);
  }

  private applyDelayFactor(delay: number): number {
    const delta = delay * this.delayFactor;

    return delay + delta;
  }

  private createDiagnosticInfoForAttempt(
    attemptNumber: number,
    delay: number,
    lastError: Error | null
  ): AttemptDiagnosticInfo {
    const fuzzedDelayFrom = delay - delay * this.fuzzFactor;
    const fuzzedDelayTo = delay + delay * this.fuzzFactor;

    return {
      attemptNumber,
      currentDelaySec: delay / 1000,
      retryReason: lastError?.message ?? null,
      expectedFuzzedDelayRangeSec: { from: fuzzedDelayFrom / 1000, to: fuzzedDelayTo / 1000 },
    };
  }
}
