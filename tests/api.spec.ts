import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';

import type { ApiResult } from '../src/api/api-result.ts';
import { cardHandlerFor } from '../src/api/handler.ts';
import type { HandlerConfig } from '../src/api/handler.ts';
import {
  booleanParam,
  commonParams,
  describeParams,
  enumListParam,
  enumParam,
  intParam,
  listParam,
  numberParam,
  readBoolean,
  resolveEmpty,
  safeListParam,
  safeParam,
  statRowParams,
  titleParams,
} from '../src/api/params.ts';
import { CardError } from '../src/error.ts';

type Kind = 'account' | 'package';

interface TestConfig extends HandlerConfig {
  isAllowed: (id: string, kind: Kind) => boolean;
}

/** A config guarding accounts by one list, as a package's own config would. */
const configOf = (
  allowed?: ReadonlyArray<string>,
  hints: HandlerConfig['hints'] = {},
): TestConfig => ({
  hints,
  isAllowed: (id, kind) => kind !== 'account' || allowed === undefined || allowed.includes(id),
});

const render = vi.fn<(params: Record<string, unknown>) => Promise<string>>();

const endpoint = cardHandlerFor<TestConfig>()(
  z.object({
    account: safeParam,
    show: enumListParam(['stars', 'forks', 'secret'], ['stars', 'forks']),
    layout: enumParam(['normal', 'compact']),
    card_width: intParam({ max: 900, px: true }),
    ratio: numberParam({ max: 1 }),
    count_private: booleanParam,
    tags: listParam,
    exclude: safeListParam,
    ...commonParams,
    ...titleParams,
    ...statRowParams,
  }),
  { account: 'account' },
  async (params) => render(params),
);

const draw = async (query: Record<string, string>, config = configOf()): Promise<ApiResult> =>
  endpoint(query, config);

/** @returns The error a query drew, failing when it drew a card. */
const failureOf = async (
  query: Record<string, string>,
  config = configOf(),
): Promise<Extract<ApiResult, { status: 'error' }>> => {
  const result = await draw(query, config);
  if (result.status !== 'error') {
    throw new Error('the query drew a card');
  }
  return result;
};

describe(cardHandlerFor, () => {
  it('hands the renderer the parsed params', async () => {
    render.mockResolvedValueOnce('<svg>card</svg>');

    await expect(
      draw({
        account: 'octocat',
        show: 'Stars,FORKS',
        layout: 'COMPACT',
        card_width: '500px',
        ratio: '.5',
        count_private: 'on',
        tags: 'a, b,',
        hide_border: '',
        locale: 'kr',
      }),
    ).resolves.toStrictEqual({ status: 'success', content: '<svg>card</svg>' });
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'octocat',
        show: ['stars', 'forks'],
        layout: 'compact',
        card_width: 500,
        ratio: 0.5,
        count_private: true,
        tags: ['a', 'b'],
        hide_border: true,
        locale: 'ko',
      }),
    );
  });

  it.each([
    [{ card_width: '1e3' }, 'card_width', 'Invalid number input for parameter "card_width"'],
    [{ card_width: '0' }, 'card_width', 'Invalid number input for parameter "card_width"'],
    [{ ratio: '2' }, 'ratio', 'Invalid number input for parameter "ratio"'],
    [
      { count_private: 'yes' },
      'count_private',
      'Invalid boolean input for parameter "count_private"',
    ],
    [{ layout: 'grid' }, 'layout', 'Incorrect layout input'],
    [{ show: 'stars,nope' }, 'show', 'Incorrect show input'],
    [{ account: 'a b' }, 'account', 'Parameter "account" contains unsafe characters'],
    [{ exclude: 'a,<b>' }, 'exclude', 'Parameter "exclude" contains unsafe characters'],
    [{ locale: 'xx' }, 'locale', 'Locale not found'],
    [{ theme: 'nope' }, 'theme', 'Incorrect theme input'],
    [{ theme: ',' }, 'theme', 'Incorrect theme input'],
  ])('refuses %j, naming the param', async (query, param, secondaryMessage) => {
    const { error, retryable } = await failureOf(query);

    expect(error).toMatchObject({ code: 'invalid_param', param, secondaryMessage });
    expect(retryable).toBe(false);
  });

  it('draws the error in the theme it was asked for, unless that was what failed', async () => {
    const themed = await failureOf({ theme: 'ember_dark', card_width: 'x' });
    const unthemed = await failureOf({ theme: 'nope' });

    expect(themed.content).toContain('<svg');
    expect(unthemed.content).toContain('<svg');
    expect(themed.content).not.toBe(unthemed.content);
  });

  it('refuses an identity the deployment does not serve, before the render', async () => {
    const { error } = await failureOf({ account: 'stranger' }, configOf(['octocat']));

    expect(error).toMatchObject({ code: 'not_allowed', reason: 'not_allowed', param: 'account' });
    expect(render).not.toHaveBeenCalled();
  });

  it('reports a render-time throw as a retryable upstream failure', async () => {
    render.mockRejectedValueOnce(new Error('boom'));
    const result = await failureOf({ account: 'octocat' });

    expect(result).toMatchObject({ retryable: true, error: { code: 'upstream', message: 'boom' } });
  });

  it("puts the host's hint in place of the failure's own second line", async () => {
    render.mockRejectedValueOnce(CardError.because('missing_param', { params: ['account'] }));
    const { error } = await failureOf({}, configOf(undefined, { missing_param: 'See the docs' }));

    expect(error).toMatchObject({
      code: 'missing_param',
      secondaryMessage: 'See the docs',
      text: 'Missing params "account" make sure you pass the parameters in URL. See the docs.',
    });
  });

  it('carries how a form asks for each param, the theme first', () => {
    const [first] = Object.keys(endpoint.PARAMS);

    expect(first).toBe('theme');
    expect(endpoint.PARAMS['show']).toStrictEqual({ kind: 'list', choices: ['stars', 'forks'] });
    expect(endpoint.PARAMS['locale']?.aliases?.get('kr')).toBe('ko');
    expect(endpoint.IDENTITIES).toStrictEqual({ account: 'account' });
  });
});

describe(describeParams, () => {
  it('refuses a param built without a kind', () => {
    expect(() => describeParams({ raw: z.string() })).toThrow(
      'Param "raw" was built without a kind',
    );
  });
});

describe(resolveEmpty, () => {
  it('reads an empty boolean as set, and any other empty param as absent', () => {
    expect(
      resolveEmpty(
        { hide_border: '', title: '', layout: 'compact' },
        { hide_border: { kind: 'boolean' }, title: { kind: 'text' } },
      ),
    ).toStrictEqual({ hide_border: 'true', layout: 'compact' });
  });
});

describe(readBoolean, () => {
  it.each([
    ['', true],
    ['ON', true],
    ['0', false],
    ['maybe', undefined],
  ])('reads %j as %j', (value, expected) => {
    expect(readBoolean(value)).toBe(expected);
  });
});
