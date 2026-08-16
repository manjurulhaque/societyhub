-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "flatId" TEXT,
ADD COLUMN     "isAdvance" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "billId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_flatId_idx" ON "Payment"("flatId");

-- CreateIndex
CREATE INDEX "Payment_isAdvance_idx" ON "Payment"("isAdvance");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
