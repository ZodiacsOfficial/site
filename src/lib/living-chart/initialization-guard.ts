import type { LivingChartOwnerScope } from './types';

export function sameLivingChartOwner(
  left: LivingChartOwnerScope | null,
  right: LivingChartOwnerScope | null,
): boolean {
  if (!left || !right || left.kind !== right.kind) return left === right;
  return left.kind === 'guest'
    ? left.vaultId === (right as Extract<LivingChartOwnerScope, { kind: 'guest' }>).vaultId
    : left.accountId === (right as Extract<LivingChartOwnerScope, { kind: 'account' }>).accountId;
}

/** Prevents an obsolete initialization attempt from overwriting newer auth UI. */
export function shouldSurfaceLivingChartInitializationFailure(input: {
  requestId: number;
  currentRequestId: number;
  expectedOwner: LivingChartOwnerScope | null;
  currentOwner: LivingChartOwnerScope | null;
}): boolean {
  return input.requestId === input.currentRequestId
    && sameLivingChartOwner(input.expectedOwner, input.currentOwner);
}
