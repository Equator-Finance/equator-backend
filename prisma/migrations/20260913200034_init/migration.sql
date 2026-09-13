-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('CREATED', 'FUNDED', 'ACTIVE', 'SETTLED', 'DEFAULTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL,
    "importerId" TEXT NOT NULL,
    "currencyPair" TEXT NOT NULL,
    "notionalUsd" DECIMAL(65,30) NOT NULL,
    "maturityDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "deskId" TEXT NOT NULL,
    "strikeRate" DECIMAL(65,30) NOT NULL,
    "premiumPercent" DECIMAL(65,30) NOT NULL,
    "deskMarginUsd" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnChainContract" (
    "contractId" BIGINT NOT NULL,
    "stellarTxHash" TEXT NOT NULL,
    "currencyPair" TEXT NOT NULL,
    "notionalUsd" DECIMAL(65,30) NOT NULL,
    "strikeRate" DECIMAL(65,30) NOT NULL,
    "maturityTimestamp" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL,
    "lastIndexedBlock" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnChainContract_pkey" PRIMARY KEY ("contractId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "OnChainContract_stellarTxHash_key" ON "OnChainContract"("stellarTxHash");

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_importerId_fkey" FOREIGN KEY ("importerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_deskId_fkey" FOREIGN KEY ("deskId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
