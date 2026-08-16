-- AlterTable
ALTER TABLE "Amenity" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "excessAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "updatedAt" DROP DEFAULT;
