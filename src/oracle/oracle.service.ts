import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OracleRateResponse {
  rate?: number;
}

/**
 * Fetches spot FX rates for settlement. Pluggable via ORACLE_RATE_SOURCE_URL
 * rather than hardcoding a specific price feed, since the settlement authority
 * is whichever address holds ORACLE_SECRET_KEY (see SorobanService) — the rate
 * source just needs to return a number that party is willing to attest to.
 */
@Injectable()
export class OracleService {
  private readonly rateSourceUrl?: string;

  constructor(private readonly config: ConfigService) {
    this.rateSourceUrl = this.config.get<string>('ORACLE_RATE_SOURCE_URL') || undefined;
  }

  get isConfigured(): boolean {
    return Boolean(this.rateSourceUrl);
  }

  /** Fetches the current spot rate for a currency pair, e.g. "NGN/USD". */
  async getSpotRate(currencyPair: string): Promise<number> {
    if (!this.rateSourceUrl) {
      throw new Error('ORACLE_RATE_SOURCE_URL is not configured.');
    }

    const url = this.rateSourceUrl.replace('{PAIR}', currencyPair.replace('/', '-'));
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Oracle rate source responded with ${response.status} for ${currencyPair}`);
    }

    const body = (await response.json()) as OracleRateResponse;
    if (typeof body.rate !== 'number' || !Number.isFinite(body.rate) || body.rate <= 0) {
      throw new Error(`Oracle rate source returned an invalid rate for ${currencyPair}`);
    }

    return body.rate;
  }
}
