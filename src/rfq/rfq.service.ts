import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

export interface QuoteRecord {
  id: string;
  rfqId: string;
  deskAddress: string;
  strikeRate: number;
  premiumPercent: number;
  deskMarginUsd: number;
  status: string;
  createdAt: Date;
}

export interface RFQRecord {
  id: string;
  importerAddress: string;
  currencyPair: string;
  notionalUsd: number;
  maturityDays: number;
  status: string;
  createdAt: Date;
  quotes: QuoteRecord[];
}

const rfqWithRelations = Prisma.validator<Prisma.RfqDefaultArgs>()({
  include: { importer: true, quotes: { include: { desk: true } } },
});
type RfqWithRelations = Prisma.RfqGetPayload<typeof rfqWithRelations>;

const quoteWithRelations = Prisma.validator<Prisma.QuoteDefaultArgs>()({
  include: { desk: true },
});
type QuoteWithRelations = Prisma.QuoteGetPayload<typeof quoteWithRelations>;

function toQuoteRecord(quote: QuoteWithRelations): QuoteRecord {
  return {
    id: quote.id,
    rfqId: quote.rfqId,
    deskAddress: quote.desk.walletAddress,
    strikeRate: quote.strikeRate.toNumber(),
    premiumPercent: quote.premiumPercent.toNumber(),
    deskMarginUsd: quote.deskMarginUsd.toNumber(),
    status: quote.status,
    createdAt: quote.createdAt,
  };
}

function toRfqRecord(rfq: RfqWithRelations): RFQRecord {
  return {
    id: rfq.id,
    importerAddress: rfq.importer.walletAddress,
    currencyPair: rfq.currencyPair,
    notionalUsd: rfq.notionalUsd.toNumber(),
    maturityDays: rfq.maturityDays,
    status: rfq.status,
    createdAt: rfq.createdAt,
    quotes: rfq.quotes.map(toQuoteRecord),
  };
}

@Injectable()
export class RfqService {
  constructor(private readonly prisma: PrismaService) {}

  private upsertUser(walletAddress: string, role: 'IMPORTER' | 'MARKET_MAKER') {
    return this.prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress, role },
    });
  }

  async createRfq(payload: RFQPayload): Promise<RFQRecord> {
    const importer = await this.upsertUser(payload.importerAddress, 'IMPORTER');

    const rfq = await this.prisma.rfq.create({
      data: {
        importerId: importer.id,
        currencyPair: payload.currencyPair,
        notionalUsd: payload.notionalUsd,
        maturityDays: payload.maturityDays,
        status: 'OPEN',
      },
      ...rfqWithRelations,
    });

    return toRfqRecord(rfq);
  }

  async submitQuote(payload: QuotePayload): Promise<{ rfq: RFQRecord; quote: QuoteRecord }> {
    const existingRfq = await this.prisma.rfq.findUnique({ where: { id: payload.rfqId } });
    if (!existingRfq) throw new Error(`RFQ ${payload.rfqId} not found`);

    const desk = await this.upsertUser(payload.deskAddress, 'MARKET_MAKER');

    const quote = await this.prisma.quote.create({
      data: {
        rfqId: payload.rfqId,
        deskId: desk.id,
        strikeRate: payload.strikeRate,
        premiumPercent: payload.premiumPercent,
        deskMarginUsd: payload.deskMarginUsd,
        status: 'PENDING',
      },
      ...quoteWithRelations,
    });

    const rfq = await this.prisma.rfq.update({
      where: { id: payload.rfqId },
      data: { status: 'QUOTED' },
      ...rfqWithRelations,
    });

    return { rfq: toRfqRecord(rfq), quote: toQuoteRecord(quote) };
  }

  async acceptQuote(
    rfqId: string,
    quoteId: string,
  ): Promise<{ rfq: RFQRecord; acceptedQuote: QuoteRecord }> {
    const existingQuote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!existingQuote || existingQuote.rfqId !== rfqId) {
      throw new Error(`Quote ${quoteId} not found for RFQ ${rfqId}`);
    }

    const acceptedQuote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'ACCEPTED' },
      ...quoteWithRelations,
    });

    const rfq = await this.prisma.rfq.update({
      where: { id: rfqId },
      data: { status: 'ACCEPTED' },
      ...rfqWithRelations,
    });

    return { rfq: toRfqRecord(rfq), acceptedQuote: toQuoteRecord(acceptedQuote) };
  }

  async getOpenRfqs(): Promise<RFQRecord[]> {
    const rfqs = await this.prisma.rfq.findMany({
      ...rfqWithRelations,
      orderBy: { createdAt: 'desc' },
    });
    return rfqs.map(toRfqRecord);
  }

  async getRfq(id: string): Promise<RFQRecord | null> {
    const rfq = await this.prisma.rfq.findUnique({ where: { id }, ...rfqWithRelations });
    return rfq ? toRfqRecord(rfq) : null;
  }
}
