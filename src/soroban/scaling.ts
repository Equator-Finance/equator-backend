/** FX rates are stored on-chain as fixed-point u128 with 4 decimal places (e.g. 1550.0000). */
export const RATE_DECIMALS = 4;

/** Stellar/Soroban USDC (SAC) amounts use 7 decimal places, matching classic asset precision. */
export const USDC_DECIMALS = 7;

export function rateToFixedPoint(rate: number): bigint {
  return BigInt(Math.round(rate * 10 ** RATE_DECIMALS));
}

export function fixedPointToRate(value: bigint): number {
  return Number(value) / 10 ** RATE_DECIMALS;
}

export function tokenAmountToUsd(value: bigint): number {
  return Number(value) / 10 ** USDC_DECIMALS;
}
