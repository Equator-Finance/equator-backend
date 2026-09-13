-- RenameColumn
ALTER TABLE "OnChainContract" RENAME COLUMN "stellarTxHash" TO "lastEventId";

-- RenameIndex
ALTER INDEX "OnChainContract_stellarTxHash_key" RENAME TO "OnChainContract_lastEventId_key";

-- AlterTable
ALTER TABLE "OnChainContract" ADD COLUMN "settlementRate" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "IndexerCursor" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastLedger" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("id")
);
