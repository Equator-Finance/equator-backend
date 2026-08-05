import { Injectable } from '@nestjs/common';

export interface RFQPayload {
  importerAddress: string;
  currencyPair: string;
  notionalUsd: number;
  maturityDays: number;
}

@Injectable()
export class RfqService {
  private activeRfqs: Map<string, RFQPayload> = new Map();

  createRfq(id: string, payload: RFQPayload) {
    this.activeRfqs.set(id, payload);
    return { id, ...payload, status: 'OPEN', createdAt: new Date() };
  }

  getOpenRfqs() {
    return Array.from(this.activeRfqs.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
  }
}
