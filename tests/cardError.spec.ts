import { beforeAll, describe, expect, it } from 'vitest';

import { CardError, registerFailures } from '../src/error.ts';
import type { Failure } from '../src/error.ts';

const TEST_FAILURES = {
  test_gone: (): Failure => ({ code: 'not_found', message: 'Gone' }),
  test_down: ({ host }: { host: string }): Failure => ({
    code: 'upstream',
    retryable: true,
    message: `${host} is down`,
  }),
  test_unregistered: (): Failure => ({ code: 'upstream', message: 'Never registered' }),
};

type TestFailures = typeof TEST_FAILURES;

declare module '../src/error.ts' {
  // oxlint-disable-next-line typescript/no-empty-object-type -- the augmentation under test
  interface Failures extends TestFailures {}
}

beforeAll(() => {
  const { test_unregistered: _unregistered, ...registered } = TEST_FAILURES;
  registerFailures(registered);
});

// never called: `tsc` checks the expectations inside
const typed = (): CardError => {
  // @ts-expect-error `not_allowed` needs the param it refused
  CardError.because('not_allowed');
  // @ts-expect-error `test_gone` is worded without data
  CardError.because('test_gone', {});
  // @ts-expect-error no table declares it
  CardError.because('never_declared');
  CardError.because('test_down', { host: 'registry' });
  // @ts-expect-error only the class builds one
  return new CardError('Nope', { code: 'upstream' });
};

describe('CardError.because', () => {
  it('words a failure from the data its reason needs', () => {
    expect(CardError.because('not_allowed', { param: 'username' })).toMatchObject({
      code: 'not_allowed',
      param: 'username',
      reason: 'not_allowed',
    });
  });

  it('takes data exactly where a reason needs it', () => {
    expect(typed).toBeTypeOf('function');
  });

  it('words a registered failure', () => {
    expect(CardError.because('test_down', { host: 'registry' })).toMatchObject({
      code: 'upstream',
      message: 'registry is down',
      reason: 'test_down',
      retryable: true,
    });
  });

  it('refuses a declared reason whose table was never registered', () => {
    expect(() => CardError.because('test_unregistered')).toThrow(
      'Failure "test_unregistered" has no wording; register its table',
    );
  });

  it('refuses a second wording for a reason', () => {
    expect(() => {
      registerFailures({ test_gone: TEST_FAILURES.test_gone });
    }).toThrow('Failure "test_gone" already has a wording');
  });

  it('offers no report for a not_found, which no bug caused', () => {
    expect(CardError.because('test_gone').reportable).toBe(false);
  });

  it.each([
    CardError.because('invalid_param', { param: 'width', detail: 'Too wide' }),
    CardError.because('missing_param', { params: ['id'] }),
    CardError.because('not_allowed', { param: 'username' }),
  ])('leaves $message not retryable, by default', (error) => {
    expect(error.retryable).toBe(false);
  });

  it('marks a wrapped failure retryable, as a repeat could answer differently', () => {
    expect(CardError.from(new Error('Nope')).retryable).toBe(true);
  });

  it('carries no reason for a failure it only wrapped', () => {
    expect(CardError.from(new Error('Nope')).reason).toBeUndefined();
  });

  it('wraps a thrown value that is not an error as upstream', () => {
    expect(CardError.from('nope')).toMatchObject({
      code: 'upstream',
      message: 'An unknown error occurred',
    });
  });
});
