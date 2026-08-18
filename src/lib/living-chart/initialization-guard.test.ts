import { describe, expect, it } from 'vitest';
import { shouldSurfaceLivingChartInitializationFailure } from './initialization-guard';

const GUEST = { kind: 'guest', vaultId: '83000000-0000-4000-8000-000000000001' } as const;
const ACCOUNT = { kind: 'account', accountId: '84000000-0000-4000-8000-000000000001' } as const;

describe('Living Chart sync initialization failure guard', () => {
  it('surfaces cloud-context failure after an initial guest candidate is promoted to the verified account', () => {
    expect(shouldSurfaceLivingChartInitializationFailure({
      requestId: 7,
      currentRequestId: 7,
      expectedOwner: ACCOUNT,
      currentOwner: ACCOUNT,
    })).toBe(true);

    // The pre-promotion guest comparison was the regression: it suppressed
    // the error and left the UI permanently in its checking state.
    expect(shouldSurfaceLivingChartInitializationFailure({
      requestId: 7,
      currentRequestId: 7,
      expectedOwner: GUEST,
      currentOwner: ACCOUNT,
    })).toBe(false);
  });

  it('does not let an obsolete request overwrite a newer auth owner', () => {
    expect(shouldSurfaceLivingChartInitializationFailure({
      requestId: 7,
      currentRequestId: 8,
      expectedOwner: ACCOUNT,
      currentOwner: ACCOUNT,
    })).toBe(false);
  });
});
