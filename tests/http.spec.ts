import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultFetch, httpRequest, withTimeout } from '../src/http.ts';
import type { FetchLike } from '../src/http.ts';
import { consoleLogger } from '../src/log.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe(httpRequest, () => {
  it('parses a JSON body, keeping the status', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        new Response('{"name":"card-kit"}', { status: 201, statusText: 'Created' }),
      );

    await expect(httpRequest(fetchImpl, 'https://example.com')).resolves.toStrictEqual({
      status: 201,
      statusText: 'Created',
      data: { name: 'card-kit' },
    });
  });

  it('leaves a body that is no JSON as text', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response('<html>', { status: 502 }));

    await expect(httpRequest(fetchImpl, 'https://example.com')).resolves.toMatchObject({
      status: 502,
      data: '<html>',
    });
  });
});

describe(withTimeout, () => {
  it('hands the transport over untouched without a timeout', () => {
    expect(withTimeout(defaultFetch, undefined)).toBe(defaultFetch);
  });

  it('adds a deadline, keeping what the request carried', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response(''));
    await withTimeout(fetchImpl, 1000)('https://example.com', { method: 'POST' });

    const [, init] = fetchImpl.mock.calls[0] ?? [];

    expect(init).toHaveProperty('method', 'POST');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('the default transport', () => {
  it('reads the global fetch at call time', async () => {
    const patched = vi.fn<typeof fetch>().mockResolvedValue(new Response('patched'));
    vi.stubGlobal('fetch', patched);
    const response = await defaultFetch('https://example.com');

    await expect(response.text()).resolves.toBe('patched');
  });
});

describe('the console logger', () => {
  it('writes to the console as it stands when called', () => {
    // silenced: the spies only record what reached the console
    const log = vi.spyOn(console, 'log').mockReturnValue();
    const error = vi.spyOn(console, 'error').mockReturnValue();
    consoleLogger.log('note');
    consoleLogger.error('failure');

    expect(log).toHaveBeenCalledWith('note');
    expect(error).toHaveBeenCalledWith('failure');
  });
});
