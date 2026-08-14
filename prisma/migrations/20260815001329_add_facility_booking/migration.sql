-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('CLUBHOUSE', 'COMMUNITY_HALL', 'PARTY_LAWN', 'SWIMMING_POOL', 'GUEST_ROOM', 'TENNIS_COURT', 'TERRACE', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Society" ALTER COLUMN "currencySymbol" SET DEFAULT 'Γé╣';

-- CreateTable
CREATE TABLE "FacilityBooking" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amenity" "AmenityType" NOT NULL DEFAULT 'CLUBHOUSE',
    "eventTitle" TEXT,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "rentAmount" DECIMAL(10,2) NOT NULL,
    "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDepositRefunded" BOOLEAN NOT NULL DEFAULT false,
    "depositRefundedOn" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "receiptNumber" TEXT,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'BANK',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityBooking_societyId_bookingDate_idx" ON "FacilityBooking"("societyId", "bookingDate");

-- CreateIndex
CREATE INDEX "FacilityBooking_flatId_idx" ON "FacilityBooking"("flatId");

-- CreateIndex
CREATE INDEX "FacilityBooking_personId_idx" ON "FacilityBooking"("personId");

-- CreateIndex
CREATE INDEX "FacilityBooking_status_idx" ON "FacilityBooking"("status");

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

