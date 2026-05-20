/** Serializes Semantic Scholar API calls to stay under the 1 req/s account limit. */
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;
let chain: Promise<unknown> = Promise.resolve();

export function withSemanticScholarRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();
    return fn();
  };

  const scheduled = chain.then(run, run);
  chain = scheduled.catch(() => undefined);
  return scheduled;
}
