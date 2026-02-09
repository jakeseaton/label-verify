/**
 * Process items in parallel with a concurrency limit.
 * Returns when all items are processed (or failed).
 */
export async function parallelProcess<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrency: number = 5
): Promise<void> {
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < items.length) {
      const current = index++;
      try {
        await processor(items[current]);
      } catch {
        // Errors handled by processor; continue with next item
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext()
  );
  await Promise.all(workers);
}
