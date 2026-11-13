/**
 * @file One error type for everything a card render can fail on.
 *
 * A failure carries a `code` a host can branch on, the two lines the error card
 * draws, and whether repeating the request could help.
 * The fetchers throw this rather than a bare `Error`, so a host is told what failed.
 * Anything else that escapes is wrapped as `upstream` by `from`, which is retryable —
 * so a permanent failure has to throw a `CardError` to be reported as one.
 * A failure is thrown by its reason. The kit words the boundary's own; a package of cards adds its
 * reasons to {@link Failures} and words them once, through {@link registerFailures}.
 */

/** Why a request failed. */
type ErrorCode =
  /** The token may not read a stat the query asked for. */
  | 'forbidden'
  /** The query is wrong: a param is malformed, unsafe, or not renderable. */
  | 'invalid_param'
  /** The query is missing a param the endpoint cannot render without. */
  | 'missing_param'
  /** The query is well-formed, but this deployment is pinned to identities it does not name. */
  | 'not_allowed'
  /** The account, repository or package does not exist. */
  | 'not_found'
  /** No token is set, or upstream rejected every one — retryable, the fix being a token on the next start. */
  | 'no_tokens'
  /** Every token is rate limited. */
  | 'rate_limited'
  /** Upstream answered with something unusable, or could not be reached at all. */
  | 'upstream';

/** What a failure is, once it reaches the api layer. */
interface CardErrorInit {
  /** Why it failed. */
  code: ErrorCode;
  /** Second line of the error card. */
  secondaryMessage?: string | undefined;
  /** The first param at fault, when the failure names one. */
  param?: string | undefined;
  /** What this failure was raised from. Kept for logs; the card never draws it. */
  cause?: unknown;
  /** Whether filing an issue could help; `true` when omitted, and never for `not_found`. */
  reportable?: boolean | undefined;
  /**
   * Whether repeating the request could produce a different answer; `false` when omitted.
   * A `forbidden` is, as the retryer starts at a random token and the next may be permitted.
   */
  retryable?: boolean | undefined;
}

/** One failure, worded: the first line of its card, and everything else it carries. */
interface Failure extends CardErrorInit {
  message: string;
}

/** The second line of upstream's own outage, which no issue could fix. */
const TRY_AGAIN_LATER = 'Please try again later';

/** The failures the api boundary throws itself, by reason. */
const KIT_FAILURES = {
  /** The param a check rejected, and the check's own wording of why. */
  invalid_param: ({ param, detail }: { param: string; detail: string }): Failure => ({
    code: 'invalid_param',
    message: 'Something went wrong',
    secondaryMessage: detail,
    param,
  }),
  // the caller's to fix, so the card links its docs instead of asking for an issue
  /** Every param missing, first the one at fault, and where to read how to pass them. */
  missing_param: ({
    params,
    hint,
  }: {
    params: Array<string>;
    hint?: string | undefined;
  }): Failure => ({
    code: 'missing_param',
    message: `Missing params ${params.map((param) => `"${param}"`).join(', ')} make sure you pass the parameters in URL`,
    secondaryMessage: hint,
    param: params[0],
    reportable: false,
  }),
  // names neither the value nor the list: one is the caller's, the other the operator's
  /** The identity param the deployment refused. */
  not_allowed: ({ param }: { param: string }): Failure => ({
    code: 'not_allowed',
    message: 'Not allowed',
    secondaryMessage: 'This deployment does not serve that account',
    param,
  }),
};

type KitFailures = typeof KIT_FAILURES;

/**
 * Every failure a `CardError` is thrown for, by reason: the kit's own, and those a package of
 * cards adds by augmenting this interface with its table's type.
 *
 * @example
 * declare module '@stats-forge/card-kit' {
 *   interface Failures extends MyFailures {}
 * }
 */
// oxlint-disable-next-line typescript/no-empty-object-type -- a consumer augments it
interface Failures extends KitFailures {}

/** The name of a failure, as `CardError.because` takes it. */
type FailureReason = Extract<keyof Failures, string>;

/** One reason's wording, called with the data its throw site gave. */
type Wording = (...data: Array<never>) => Failure;

/** Every wording `because` can reach: the kit's own, and each package's once registered. */
const WORDINGS = new Map<string, Wording>(Object.entries(KIT_FAILURES));

/**
 * Words a package's failures, each reason once: a second wording would make a thrown error read
 * differently depending on what was imported first.
 *
 * @throws {Error} When a reason already has a wording.
 */
const registerFailures = (table: Partial<Failures>): void => {
  for (const [reason, word] of Object.entries(table)) {
    if (WORDINGS.has(reason)) {
      throw new Error(`Failure "${reason}" already has a wording`);
    }
    WORDINGS.set(reason, word);
  }
};

/** Everything a card render throws. */
class CardError extends Error {
  readonly code: ErrorCode;
  readonly secondaryMessage: string | undefined;
  readonly param: string | undefined;
  /** Whether filing an issue could help, which decides the card's report line. */
  readonly reportable: boolean;
  /**
   * Whether repeating the request could produce a different answer.
   * A host reads this to decide between caching the failure and retrying it.
   */
  readonly retryable: boolean;
  #reason: FailureReason | undefined;

  // only `because` and `from` build one, so every failure has a reason or is wrapped
  private constructor(message: string, init: CardErrorInit) {
    // `cause` is installed by its presence, so an absent one must not be passed as undefined
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'CardError';
    this.code = init.code;
    this.secondaryMessage = init.secondaryMessage;
    this.param = init.param;
    // a name nothing answers to is the visitor's to fix, never a bug
    this.reportable = init.code !== 'not_found' && (init.reportable ?? true);
    this.retryable = init.retryable ?? false;
  }

  /** Which failure this is; absent for one wrapped by `from`. */
  get reason(): FailureReason | undefined {
    return this.#reason;
  }

  /**
   * The failure `reason` names, worded from `data` when the reason needs any.
   *
   * @throws {Error} When the reason was declared but its table never registered.
   *
   * @returns The error.
   */
  static because<TReason extends FailureReason>(
    reason: TReason,
    ...data: Parameters<Failures[TReason]>
  ): CardError {
    const word = WORDINGS.get(reason);
    if (word === undefined) {
      throw new Error(`Failure "${reason}" has no wording; register its table`);
    }
    // one entry's own signature, which `data` was checked against at the call site
    const { message, ...init } = (word as (...args: typeof data) => Failure)(...data);
    const error = new CardError(message, init);
    error.#reason = reason;
    return error;
  }

  /**
   * Anything thrown that is not already a `CardError`:
   * an upstream failure, since the query itself got this far.
   *
   * @returns The error, unchanged when it already was one.
   */
  static from(err: unknown): CardError {
    if (err instanceof CardError) {
      return err;
    }
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return new CardError(message, {
      code: 'upstream',
      secondaryMessage: TRY_AGAIN_LATER,
      reportable: false,
      retryable: true,
    });
  }
}

export type { ErrorCode, Failure, FailureReason, Failures };

export { CardError, registerFailures, TRY_AGAIN_LATER };
