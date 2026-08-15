-- DropIndex
DROP INDEX IF EXISTS "Bill_flatId_billType_year_month_key";

-- AlterTable Bill
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "societyId" TEXT;

-- Backfill Bill.societyId from Flat -> Block -> Society
UPDATE "Bill" SET "societyId" = "Block"."societyId"
FROM "Flat"
JOIN "Block" ON "Flat"."blockId" = "Block"."id"
WHERE "Bill"."flatId" = "Flat"."id"
AND "Bill"."societyId" IS NULL;

-- If any Bill remains without societyId, assign fallback
UPDATE "Bill" SET "societyId" = (SELECT "id" FROM "Society" LIMIT 1) WHERE "societyId" IS NULL;

ALTER TABLE "Bill" ALTER COLUMN "societyId" SET NOT NULL;

-- AlterTable Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "societyId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill Payment.societyId from Bill
UPDATE "Payment" SET "societyId" = "Bill"."societyId"
FROM "Bill"
WHERE "Payment"."billId" = "Bill"."id"
AND "Payment"."societyId" IS NULL;

-- If any Payment remains without societyId, assign fallback
UPDATE "Payment" SET "societyId" = (SELECT "id" FROM "Society" LIMIT 1) WHERE "societyId" IS NULL;

ALTER TABLE "Payment" ALTER COLUMN "societyId" SET NOT NULL;

-- AlterTable Expense
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;

-- CreateTable Amenity
CREATE TABLE IF NOT EXISTS "Amenity" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AmenityType" NOT NULL DEFAULT 'CLUBHOUSE',
    "description" TEXT,
    "defaultRent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "defaultDeposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- Create Unique & Search Indexes on Amenity FIRST before INSERT ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS "Amenity_societyId_name_key" ON "Amenity"("societyId", "name");
CREATE INDEX IF NOT EXISTS "Amenity_societyId_idx" ON "Amenity"("societyId");
CREATE INDEX IF NOT EXISTS "Amenity_isActive_idx" ON "Amenity"("isActive");

-- Seed default clubhouse amenity per society
INSERT INTO "Amenity" ("id", "societyId", "name", "type", "updatedAt")
SELECT gen_random_uuid(), "id", 'Clubhouse', 'CLUBHOUSE', CURRENT_TIMESTAMP
FROM "Society"
ON CONFLICT ("societyId", "name") DO NOTHING;

-- AlterTable FacilityBooking
ALTER TABLE "FacilityBooking" ADD COLUMN IF NOT EXISTS "amenityId" TEXT;
UPDATE "FacilityBooking" SET "amenityId" = "Amenity"."id"
FROM "Amenity"
WHERE "FacilityBooking"."societyId" = "Amenity"."societyId"
AND "FacilityBooking"."amenityId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "FacilityBooking" WHERE "amenityId" IS NULL) THEN
    INSERT INTO "Amenity" ("id", "societyId", "name", "type", "updatedAt")
    SELECT DISTINCT gen_random_uuid(), "societyId", 'General Facility', 'OTHER', CURRENT_TIMESTAMP
    FROM "FacilityBooking" WHERE "amenityId" IS NULL
    ON CONFLICT ("societyId", "name") DO NOTHING;

    UPDATE "FacilityBooking" SET "amenityId" = "Amenity"."id"
    FROM "Amenity"
    WHERE "FacilityBooking"."societyId" = "Amenity"."societyId"
    AND "FacilityBooking"."amenityId" IS NULL;
  END IF;
END $$;

ALTER TABLE "FacilityBooking" DROP COLUMN IF EXISTS "amenity";
ALTER TABLE "FacilityBooking" ALTER COLUMN "amenityId" SET NOT NULL;

-- Convert FacilityBooking startTime/endTime to TIMESTAMP if needed
ALTER TABLE "FacilityBooking" ALTER COLUMN "startTime" TYPE TIMESTAMP(3) USING NULL;
ALTER TABLE "FacilityBooking" ALTER COLUMN "endTime" TYPE TIMESTAMP(3) USING NULL;

-- AlterTable MaintenanceRegister
ALTER TABLE "MaintenanceRegister" ADD COLUMN IF NOT EXISTS "billId" TEXT;

-- AlterTable Society
ALTER TABLE "Society" ALTER COLUMN "currencySymbol" SET DEFAULT '₹';

-- AlterTable SocietyMember (safely rename role to designation)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'SocietyMember' AND column_name = 'role'
  ) THEN
    ALTER TABLE "SocietyMember" RENAME COLUMN "role" TO "designation";
  END IF;
END $$;

-- AlterTable Vendor (safely rename pan to panNumber)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Vendor' AND column_name = 'pan'
  ) THEN
    ALTER TABLE "Vendor" RENAME COLUMN "pan" TO "panNumber";
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Bill_societyId_idx" ON "Bill"("societyId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bill_flatId_billType_year_month_sequence_key" ON "Bill"("flatId", "billType", "year", "month", "sequence");

CREATE INDEX IF NOT EXISTS "Expense_vendorId_idx" ON "Expense"("vendorId");
CREATE INDEX IF NOT EXISTS "FacilityBooking_amenityId_idx" ON "FacilityBooking"("amenityId");
CREATE INDEX IF NOT EXISTS "MaintenanceRegister_billId_idx" ON "MaintenanceRegister"("billId");
CREATE INDEX IF NOT EXISTS "Payment_societyId_idx" ON "Payment"("societyId");

-- Foreign Keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Bill_societyId_fkey') THEN
    ALTER TABLE "Bill" ADD CONSTRAINT "Bill_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payment_societyId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MaintenanceRegister_billId_fkey') THEN
    ALTER TABLE "MaintenanceRegister" ADD CONSTRAINT "MaintenanceRegister_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Expense_vendorId_fkey') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Amenity_societyId_fkey') THEN
    ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FacilityBooking_amenityId_fkey') THEN
    ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
