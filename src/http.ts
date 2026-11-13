/**
 * @file The transport every fetcher sends through, which a host substitutes to mock, cache or proxy.
 */

/**
 * The slice of `fetch` this library calls.
 * A host substitutes it through its config to mock, cache or proxy every request core makes.
 */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Resolves the global `fetch` at call time rather than capturing it on import,
 * so a host that patches the global afterwards is still picked up.
 */
const defaultFetch: FetchLike = async (input, init) => fetch(input, init);

/**
 * @returns `fetchImpl`, giving up on each request after `timeoutMs`; `fetchImpl` itself without one.
 */
const withTimeout = (fetchImpl: FetchLike, timeoutMs: number | undefined): FetchLike => {
  if (timeoutMs === undefined) {
    return fetchImpl;
  }
  return async (input, init) =>
    fetchImpl(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
};

/**
 * A response, parsed.
 * A non-2xx is a value here rather than a throw:
 * the retryer reads the body of a rejected request to tell a spent token from a rate limit.
 */
interface HttpResponse<TData> {
  status: number;
  /** Reason phrase, which HTTP/2 omits — only ever used to annotate an error. */
  statusText: string;
  data: TData;
}

/**
 * @returns The response; a JSON body parsed, anything else left as text.
 */
const httpRequest = async <TData>(
  fetchImpl: FetchLike,
  url: string,
  init?: RequestInit,
): Promise<HttpResponse<TData>> => {
  const response = await fetchImpl(url, init);
  const body = await response.text();

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    // an empty or non-JSON body reads as text, so callers still get a defined `data`
    data = body;
  }

  return {
    status: response.status,
    statusText: response.statusText,
    data: data as TData,
  };
};

export { defaultFetch, httpRequest, withTimeout };
export type { FetchLike, HttpResponse };
