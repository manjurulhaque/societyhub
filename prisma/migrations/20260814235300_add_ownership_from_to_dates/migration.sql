-- AlterTable
ALTER TABLE "FlatOwnershipHistory" ADD COLUMN     "fromDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCurrentOwner" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "toDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Society" ALTER COLUMN "currencySymbol" SET DEFAULT 'Γé╣';

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_fromDate_idx" ON "FlatOwnershipHistory"("fromDate");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_toDate_idx" ON "FlatOwnershipHistory"("toDate");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_isCurrentOwner_idx" ON "FlatOwnershipHistory"("isCurrentOwner");

