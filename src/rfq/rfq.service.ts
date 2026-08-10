import { Injectable } from '@nestjs/common';

export interface RFQPayload {
  importerAddress: string;
  currencyPair: string;
  notionalUsd: number;
  maturityDays: number;
}

export interface QuotePayload {
  rfqId: string;
  deskAddress: string;
  strikeRate: number;
  premiumPercent: number;
  deskMarginUsd: number;
}

export interface QuoteRecord extends QuotePayload {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

export interface RFQRecord extends RFQPayload {
  id: string;
  status: 'OPEN' | 'QUOTED' | 'ACCEPTED' | 'CANCELLED';
  createdAt: Date;
  quotes: QuoteRecord[];
}

@Injectable()
export class RfqService {
  private rfqs: Map<string, RFQRecord> = new Map();

  createRfq(id: string, payload: RFQPayload): RFQRecord {
    const record: RFQRecord = {
      id,
      ...payload,
      status: 'OPEN',
      createdAt: new Date(),
      quotes: [],
    };
    this.rfqs.set(id, record);
    return record;
  }

  submitQuote(quoteId: string, payload: QuotePayload) {
    const rfq = this.rfqs.get(payload.rfqId);
    if (!rfq) throw new Error('RFQ not found');

    const quoteRecord: QuoteRecord = {
      id: quoteId,
      ...payload,
      status: 'PENDING',
      createdAt: new Date(),
    };

    rfq.quotes.push(quoteRecord);
    rfq.status = 'QUOTED';
    return { rfq, quote: quoteRecord };
  }

  acceptQuote(rfqId: string, quoteId: string) {
    const rfq = this.rfqs.get(rfqId);
    if (!rfq) throw new Error('RFQ not found');

    const quote = rfq.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error('Quote not found');

    quote.status = 'ACCEPTED';
    rfq.status = 'ACCEPTED';
    return { rfq, acceptedQuote: quote };
  }

  getOpenRfqs(): RFQRecord[] {
    return Array.from(this.rfqs.values());
  }

  getRfq(id: string): RFQRecord | undefined {
    return this.rfqs.get(id);
  }
}
