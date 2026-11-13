import type * as z from 'zod/mini';

import type { ThemeParams } from '../color.ts';
import { CardError } from '../error.ts';
import type { FailureReason } from '../error.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery, ParamShape } from './params.ts';
import { describeParams, parseParams, parseThemeParams, resolveEmpty } from './params.ts';

/** Builds an endpoint for one config type; named, so a consumer's emitted types can point at it. */
type CardHandler<TConfig extends HandlerConfig> = <TSchema extends z.ZodMiniObject>(
  schema: TSchema,
  identities: Identities<TSchema, AllowlistKindOf<TConfig>>,
  render: (params: z.output<TSchema>, theme: ThemeParams, config: TConfig) => Promise<string>,
) => CardEndpoint<TSchema, TConfig>;

/** What the handler reads of a deployment's config; a package's own config carries the rest. */
interface HandlerConfig {
  /** A host's own second line for a failure, by reason: its advice in place of the card's. */
  readonly hints: Partial<Record<FailureReason, string>>;
  /** @returns Whether this deployment serves the id, which the list of that kind guards. */
  isAllowed: (id: string, kind: never) => boolean;
}

/** The lists a config guards identities with, as its `isAllowed` names them. */
type AllowlistKindOf<TConfig extends HandlerConfig> = Parameters<TConfig['isAllowed']>[1];

/** Which of an endpoint's params name an identity, and which list guards each. */
type Identities<TSchema extends z.ZodMiniObject, TKind> = Partial<
  Record<Extract<keyof z.output<TSchema>, string>, TKind>
>;

/** An endpoint, the identities a pinned deployment may refuse it, and how a form asks for each param. */
type CardEndpoint<TSchema extends z.ZodMiniObject, TConfig extends HandlerConfig> = ((
  query: ApiQuery<TSchema>,
  config: TConfig,
) => Promise<ApiResult>) & {
  IDENTITIES: Identities<TSchema, AllowlistKindOf<TConfig>>;
  PARAMS: Readonly<Record<string, ParamShape>>;
};

/**
 * An endpoint: the schema it accepts, the identities a pinned deployment may refuse,
 * and what it draws from the parsed params.
 *
 * The theme parses first and on its own, because a rejected theme cannot be used to draw its own error card.
 * Parsing throws, the allowlist throws, fetching throws, and one `catch` turns whatever was thrown into the answer.
 *
 * @returns The handler, taking the query the schema describes.
 */
const cardHandler = <TSchema extends z.ZodMiniObject, TConfig extends HandlerConfig>(
  schema: TSchema,
  identities: Identities<TSchema, AllowlistKindOf<TConfig>>,
  render: (params: z.output<TSchema>, theme: ThemeParams, config: TConfig) => Promise<string>,
): CardEndpoint<TSchema, TConfig> => {
  const PARAMS = describeParams(schema.shape);

  const handler = async (raw: ApiQuery<TSchema>, config: TConfig): Promise<ApiResult> => {
    const query = resolveEmpty(raw, PARAMS);
    let theme: ThemeParams;
    try {
      theme = parseThemeParams(query);
    } catch (error) {
      return errorResult(error, config.hints);
    }

    try {
      const params = parseParams(schema, query);

      // before the render, so a refusal costs no rate-limit point; an absent identity is the
      // fetcher's `missing_param` to report
      for (const [param, kind] of Object.entries(identities) as Array<[string, never]>) {
        const value: unknown = (params as Record<string, unknown>)[param];
        if (typeof value === 'string' && !config.isAllowed(value, kind)) {
          throw CardError.because('not_allowed', { param });
        }
      }

      return { status: 'success', content: await render(params, theme, config) };
    } catch (error) {
      return errorResult(error, config.hints, theme);
    }
  };

  // carried like a renderer's `OPTIONS`, for a host's tests and forms to read
  return Object.assign(handler, { IDENTITIES: identities, PARAMS });
};

/**
 * The handler builder for one config type, which a package names once: the identity lists an
 * endpoint may name are that config's, and a render callback could not infer it.
 *
 * @example
 * const cardHandler = cardHandlerFor<MyConfig>();
 *
 * @returns {@link cardHandler}, bound to the config type.
 */
const cardHandlerFor =
  <TConfig extends HandlerConfig>(): CardHandler<TConfig> =>
  (schema, identities, render) =>
    cardHandler(schema, identities, render);

export { cardHandlerFor };
export type { AllowlistKindOf, CardEndpoint, CardHandler, HandlerConfig, Identities };
