/**
 * Mocks that resolve instantly and never fail produce a UI with no
 * loading states and no error handling. So these lie realistically.
 *
 * Tune with NEXT_PUBLIC_MOCK_LATENCY_MS and NEXT_PUBLIC_MOCK_ERROR_RATE.
 */
const LATENCY = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 600);
const ERROR_RATE = Number(process.env.NEXT_PUBLIC_MOCK_ERROR_RATE ?? 0);

export class MockApiError extends Error {
  constructor(message = "The network is having a moment. Try again.") {
    super(message);
    this.name = "MockApiError";
  }
}

export async function simulate<T>(value: T, opts?: { latency?: number }): Promise<T> {
  const jitter = Math.random() * 0.4 + 0.8; // 0.8x–1.2x
  const ms = (opts?.latency ?? LATENCY) * jitter;
  await new Promise((r) => setTimeout(r, ms));
  if (ERROR_RATE > 0 && Math.random() < ERROR_RATE) throw new MockApiError();
  return value;
}
