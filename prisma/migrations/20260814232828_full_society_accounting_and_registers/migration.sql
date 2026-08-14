-- CreateEnum
CREATE TYPE "SocietyType" AS ENUM ('COOPERATIVE_HOUSING_SOCIETY', 'APARTMENT_OWNERS_ASSOCIATION', 'RESIDENT_WELFARE_ASSOCIATION', 'COMMERCIAL_COMPLEX', 'PLOTTED_COMMUNITY');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('BUILDER_ALLOTMENT', 'RESALE_PURCHASE', 'INHERITANCE', 'GIFT_DEED', 'TRANSMISSION', 'COURT_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('OCCUPIED', 'VACANT', 'UNDER_RENOVATION');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'BI_MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "LateFeeType" AS ENUM ('PERCENTAGE_PER_ANNUM', 'PERCENTAGE_PER_MONTH', 'FLAT_MONTHLY', 'FLAT_DAILY');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('ONE_TIME_ONLY', 'INSTALLMENTS');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('MAINTENANCE', 'BUILDING_PAINTING', 'WATER', 'ELECTRICITY', 'PENALTY', 'SPECIAL_ASSESSMENT', 'EVENT');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'CASH', 'PETTY_CASH', 'FIXED_DEPOSIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "LedgerGroup" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('JOURNAL', 'RECEIPT', 'PAYMENT', 'CONTRA', 'INVOICE', 'DEBIT_NOTE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "FdStatus" AS ENUM ('ACTIVE', 'MATURED', 'REINVESTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayoutFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ON_MATURITY');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('SECURITY', 'FIT_OUT', 'CORPUS', 'OTHER');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'REFUNDED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "ReconStatus" AS ENUM ('DRAFT', 'RECONCILED');

-- CreateEnum
CREATE TYPE "PettyCashType" AS ENUM ('EXPENSE', 'TOPUP_RECEIPT', 'REFUND');

-- CreateEnum
CREATE TYPE "ChequeDirection" AS ENUM ('INWARD', 'OUTWARD');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('RECEIVED', 'ISSUED', 'IN_CLEARING', 'CLEARED', 'BOUNCED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'DISPOSED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'SURRENDERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NominationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "LienStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('AGM', 'SGM', 'MANAGING_COMMITTEE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'PAYMENT_COLLECTED', 'BILL_GENERATED', 'EXPORT');

-- AlterEnum
ALTER TYPE "FlatRole" ADD VALUE 'JOINT_OWNER';

-- AlterEnum
ALTER TYPE "MaintenanceType" ADD VALUE 'CUSTOM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UnitType" ADD VALUE 'BHK5';
ALTER TYPE "UnitType" ADD VALUE 'VILLA';
ALTER TYPE "UnitType" ADD VALUE 'ROW_HOUSE';
ALTER TYPE "UnitType" ADD VALUE 'COMMERCIAL';
ALTER TYPE "UnitType" ADD VALUE 'PLOT';

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_flatId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_billId_fkey";

-- DropIndex
DROP INDEX "Bill_flatId_year_month_key";

-- DropIndex
DROP INDEX "FlatPerson_flatId_idx";

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "billNumber" TEXT,
ADD COLUMN     "billType" "BillType" NOT NULL DEFAULT 'MAINTENANCE',
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gracePeriodDate" TIMESTAMP(3),
ADD COLUMN     "lateFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidDate" TIMESTAMP(3),
ADD COLUMN     "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Flat" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "intercomNumber" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parkingSlot" TEXT,
ADD COLUMN     "status" "OccupancyStatus" NOT NULL DEFAULT 'VACANT';

-- AlterTable
ALTER TABLE "FlatPerson" ALTER COLUMN "fromDate" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "chequeRegisterId" TEXT,
ADD COLUMN     "discountApplied" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeePaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS';

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "aadhaarNumber" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "kycVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kycVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "voterId" TEXT;

-- AlterTable
ALTER TABLE "Society" ADD COLUMN     "billGenerationDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "billingFrequency" "BillingFrequency" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'India',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "currencySymbol" TEXT NOT NULL DEFAULT 'Γé╣',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "dueDayOfMonth" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fixedRate" DECIMAL(10,2),
ADD COLUMN     "fyStartDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fyStartMonth" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "invoicePrefix" TEXT DEFAULT 'INV',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lateFeeRate" DECIMAL(6,2) NOT NULL DEFAULT 21.00,
ADD COLUMN     "lateFeeType" "LateFeeType" NOT NULL DEFAULT 'PERCENTAGE_PER_ANNUM',
ADD COLUMN     "maintenanceEffectiveFrom" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maintenanceEffectiveUpto" TIMESTAMP(3),
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "receiptPrefix" TEXT DEFAULT 'RCPT',
ADD COLUMN     "registrationDate" TIMESTAMP(3),
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "societyType" "SocietyType" NOT NULL DEFAULT 'COOPERATIVE_HOUSING_SOCIETY',
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tanNumber" TEXT,
ALTER COLUMN "code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "MaintenanceRate" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "maintenanceType" "MaintenanceType" NOT NULL DEFAULT 'FIXED',
    "ratePerSqft" DECIMAL(10,2),
    "fixedRate" DECIMAL(10,2),
    "unitType" "UnitType",
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUpto" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "approvedInMeeting" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeCollection" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalTargetAmount" DECIMAL(14,2),
    "calculationType" "MaintenanceType" NOT NULL DEFAULT 'FIXED',
    "ratePerSqft" DECIMAL(10,2),
    "fixedAmountPerFlat" DECIMAL(10,2),
    "paymentPlan" "PaymentPlan" NOT NULL DEFAULT 'ONE_TIME_ONLY',
    "numberOfInstallments" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvedInMeeting" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneTimeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAllocation" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(10,2) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentInstallment" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "paidOn" TIMESTAMP(3),
    "billId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlatOwnershipHistory" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "fromPersonId" TEXT,
    "toPersonId" TEXT NOT NULL,
    "transferType" "TransferType" NOT NULL DEFAULT 'RESALE_PURCHASE',
    "transferDate" TIMESTAMP(3) NOT NULL,
    "registeredDocNumber" TEXT,
    "registrationDate" TIMESTAMP(3),
    "transferFeePaid" DECIMAL(10,2) DEFAULT 0,
    "nocIssuedDate" TIMESTAMP(3),
    "nocReference" TEXT,
    "committeeApprovalDate" TIMESTAMP(3),
    "resolutionNumber" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlatOwnershipHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRegister" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "financialYearId" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "openingDues" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sinkingFund" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "repairFund" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "waterCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "parkingCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nonOccupancyCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "interestOrLateFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "specialAssessment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDemand" DECIMAL(10,2) NOT NULL,
    "amountCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountRebate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "advanceAdjusted" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(10,2) NOT NULL,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'BANK',
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "branch" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "statementBalance" DECIMAL(12,2) NOT NULL,
    "ledgerBalance" DECIMAL(12,2) NOT NULL,
    "difference" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ReconStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashEntry" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "voucherNumber" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PettyCashType" NOT NULL DEFAULT 'EXPENSE',
    "amount" DECIMAL(10,2) NOT NULL,
    "runningBalance" DECIMAL(10,2),
    "payee" TEXT,
    "categoryName" TEXT,
    "purpose" TEXT NOT NULL,
    "billReference" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashClosingLog" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "closingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingBalance" DECIMAL(12,2) NOT NULL,
    "totalReceipts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "calculatedBalance" DECIMAL(12,2) NOT NULL,
    "actualPhysicalCash" DECIMAL(12,2) NOT NULL,
    "difference" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note500" INTEGER NOT NULL DEFAULT 0,
    "note200" INTEGER NOT NULL DEFAULT 0,
    "note100" INTEGER NOT NULL DEFAULT 0,
    "note50" INTEGER NOT NULL DEFAULT 0,
    "note20" INTEGER NOT NULL DEFAULT 0,
    "note10" INTEGER NOT NULL DEFAULT 0,
    "coins" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashClosingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChequeRegister" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "billId" TEXT,
    "expenseId" TEXT,
    "vendorBillId" TEXT,
    "chequeNumber" TEXT NOT NULL,
    "chequeDate" TIMESTAMP(3) NOT NULL,
    "direction" "ChequeDirection" NOT NULL DEFAULT 'INWARD',
    "partyName" TEXT NOT NULL,
    "bankName" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'RECEIVED',
    "depositDate" TIMESTAMP(3),
    "clearedOn" TIMESTAMP(3),
    "bouncedOn" TIMESTAMP(3),
    "bouncedReason" TEXT,
    "bounceCharges" DECIMAL(8,2) DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChequeRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "pan" TEXT,
    "gstin" TEXT,
    "bankAccount" TEXT,
    "ifscCode" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL,
    "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tdsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT,
    "vendorBillId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vendorName" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tdsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "PaymentMode" NOT NULL DEFAULT 'BANK',
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID',
    "invoiceNumber" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedDeposit" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "fdNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branch" TEXT,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "maturityAmount" DECIMAL(12,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "status" "FdStatus" NOT NULL DEFAULT 'ACTIVE',
    "interestPayout" "PayoutFrequency" NOT NULL DEFAULT 'ON_MATURITY',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberDeposit" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "personId" TEXT,
    "depositType" "DepositType" NOT NULL DEFAULT 'SECURITY',
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "receivedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedOn" TIMESTAMP(3),
    "reference" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(12,2) NOT NULL,
    "utilizedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "group" "LedgerGroup" NOT NULL,
    "description" TEXT,
    "parentLedgerId" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceType" "BalanceType" NOT NULL DEFAULT 'DEBIT',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "financialYearId" TEXT,
    "voucherNumber" TEXT,
    "voucherType" "VoucherType" NOT NULL DEFAULT 'JOURNAL',
    "status" "VoucherStatus" NOT NULL DEFAULT 'POSTED',
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "narration" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depreciationRate" DECIMAL(5,2),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetCode" TEXT,
    "location" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(12,2),
    "currentBookValue" DECIMAL(12,2),
    "warrantyExpiresAt" TIMESTAMP(3),
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "amcVendorId" TEXT,
    "amcStartDate" TIMESTAMP(3),
    "amcEndDate" TIMESTAMP(3),
    "amcAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetServiceLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vendorId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nextDueDate" TIMESTAMP(3),
    "servicedBy" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetServiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareCertificate" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "sharesCount" INTEGER NOT NULL DEFAULT 5,
    "shareDistinctFrom" INTEGER,
    "shareDistinctTo" INTEGER,
    "faceValuePerShare" DECIMAL(8,2) NOT NULL DEFAULT 50,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "transferDate" TIMESTAMP(3),
    "transferredTo" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "nomineeName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "percentageShare" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "nomineeDob" TIMESTAMP(3),
    "nomineeAddress" TEXT,
    "guardianName" TEXT,
    "nominationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NominationStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLien" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "loanAccountNumber" TEXT,
    "sanctionAmount" DECIMAL(14,2),
    "nocIssuedDate" TIMESTAMP(3),
    "nocReference" TEXT,
    "status" "LienStatus" NOT NULL DEFAULT 'ACTIVE',
    "isCleared" BOOLEAN NOT NULL DEFAULT false,
    "clearanceDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyLien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingType" "MeetingType" NOT NULL DEFAULT 'MANAGING_COMMITTEE',
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "agenda" TEXT,
    "quorumMet" BOOLEAN NOT NULL DEFAULT true,
    "attendeeCount" INTEGER,
    "minutesNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "resolutionNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposedBy" TEXT,
    "secondedBy" TEXT,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "passedUnanimously" BOOLEAN NOT NULL DEFAULT false,
    "votesInFavor" INTEGER,
    "votesAgainst" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "societyId" TEXT,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceRate_societyId_isCurrent_idx" ON "MaintenanceRate"("societyId", "isCurrent");

-- CreateIndex
CREATE INDEX "MaintenanceRate_societyId_effectiveFrom_idx" ON "MaintenanceRate"("societyId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "OneTimeCollection_societyId_idx" ON "OneTimeCollection"("societyId");

-- CreateIndex
CREATE INDEX "OneTimeCollection_status_idx" ON "OneTimeCollection"("status");

-- CreateIndex
CREATE INDEX "AssessmentAllocation_collectionId_idx" ON "AssessmentAllocation"("collectionId");

-- CreateIndex
CREATE INDEX "AssessmentAllocation_flatId_idx" ON "AssessmentAllocation"("flatId");

-- CreateIndex
CREATE INDEX "AssessmentAllocation_status_idx" ON "AssessmentAllocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAllocation_collectionId_flatId_key" ON "AssessmentAllocation"("collectionId", "flatId");

-- CreateIndex
CREATE INDEX "AssessmentInstallment_allocationId_idx" ON "AssessmentInstallment"("allocationId");

-- CreateIndex
CREATE INDEX "AssessmentInstallment_status_idx" ON "AssessmentInstallment"("status");

-- CreateIndex
CREATE INDEX "AssessmentInstallment_dueDate_idx" ON "AssessmentInstallment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentInstallment_allocationId_installmentNumber_key" ON "AssessmentInstallment"("allocationId", "installmentNumber");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_societyId_idx" ON "FlatOwnershipHistory"("societyId");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_flatId_idx" ON "FlatOwnershipHistory"("flatId");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_toPersonId_idx" ON "FlatOwnershipHistory"("toPersonId");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_fromPersonId_idx" ON "FlatOwnershipHistory"("fromPersonId");

-- CreateIndex
CREATE INDEX "FlatOwnershipHistory_transferDate_idx" ON "FlatOwnershipHistory"("transferDate");

-- CreateIndex
CREATE INDEX "MaintenanceRegister_societyId_year_month_idx" ON "MaintenanceRegister"("societyId", "year", "month");

-- CreateIndex
CREATE INDEX "MaintenanceRegister_flatId_idx" ON "MaintenanceRegister"("flatId");

-- CreateIndex
CREATE INDEX "MaintenanceRegister_isSettled_idx" ON "MaintenanceRegister"("isSettled");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRegister_flatId_year_month_key" ON "MaintenanceRegister"("flatId", "year", "month");

-- CreateIndex
CREATE INDEX "FinancialYear_societyId_isCurrent_idx" ON "FinancialYear"("societyId", "isCurrent");

-- CreateIndex
CREATE INDEX "FinancialYear_isLocked_idx" ON "FinancialYear"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_societyId_name_key" ON "FinancialYear"("societyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_societyId_startYear_key" ON "FinancialYear"("societyId", "startYear");

-- CreateIndex
CREATE INDEX "Account_societyId_idx" ON "Account"("societyId");

-- CreateIndex
CREATE INDEX "Account_isActive_idx" ON "Account"("isActive");

-- CreateIndex
CREATE INDEX "Account_deletedAt_idx" ON "Account"("deletedAt");

-- CreateIndex
CREATE INDEX "BankReconciliation_accountId_idx" ON "BankReconciliation"("accountId");

-- CreateIndex
CREATE INDEX "PettyCashEntry_societyId_idx" ON "PettyCashEntry"("societyId");

-- CreateIndex
CREATE INDEX "PettyCashEntry_accountId_idx" ON "PettyCashEntry"("accountId");

-- CreateIndex
CREATE INDEX "PettyCashEntry_entryDate_idx" ON "PettyCashEntry"("entryDate");

-- CreateIndex
CREATE INDEX "PettyCashEntry_type_idx" ON "PettyCashEntry"("type");

-- CreateIndex
CREATE INDEX "CashClosingLog_societyId_idx" ON "CashClosingLog"("societyId");

-- CreateIndex
CREATE INDEX "CashClosingLog_accountId_idx" ON "CashClosingLog"("accountId");

-- CreateIndex
CREATE INDEX "CashClosingLog_closingDate_idx" ON "CashClosingLog"("closingDate");

-- CreateIndex
CREATE INDEX "ChequeRegister_societyId_idx" ON "ChequeRegister"("societyId");

-- CreateIndex
CREATE INDEX "ChequeRegister_accountId_idx" ON "ChequeRegister"("accountId");

-- CreateIndex
CREATE INDEX "ChequeRegister_chequeNumber_idx" ON "ChequeRegister"("chequeNumber");

-- CreateIndex
CREATE INDEX "ChequeRegister_status_idx" ON "ChequeRegister"("status");

-- CreateIndex
CREATE INDEX "ChequeRegister_chequeDate_idx" ON "ChequeRegister"("chequeDate");

-- CreateIndex
CREATE INDEX "ChequeRegister_expenseId_idx" ON "ChequeRegister"("expenseId");

-- CreateIndex
CREATE INDEX "ChequeRegister_vendorBillId_idx" ON "ChequeRegister"("vendorBillId");

-- CreateIndex
CREATE INDEX "Vendor_societyId_idx" ON "Vendor"("societyId");

-- CreateIndex
CREATE INDEX "Vendor_isActive_idx" ON "Vendor"("isActive");

-- CreateIndex
CREATE INDEX "Vendor_deletedAt_idx" ON "Vendor"("deletedAt");

-- CreateIndex
CREATE INDEX "VendorBill_societyId_idx" ON "VendorBill"("societyId");

-- CreateIndex
CREATE INDEX "VendorBill_vendorId_idx" ON "VendorBill"("vendorId");

-- CreateIndex
CREATE INDEX "VendorBill_status_idx" ON "VendorBill"("status");

-- CreateIndex
CREATE INDEX "ExpenseCategory_societyId_idx" ON "ExpenseCategory"("societyId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_isActive_idx" ON "ExpenseCategory"("isActive");

-- CreateIndex
CREATE INDEX "ExpenseCategory_deletedAt_idx" ON "ExpenseCategory"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_societyId_name_key" ON "ExpenseCategory"("societyId", "name");

-- CreateIndex
CREATE INDEX "Expense_societyId_idx" ON "Expense"("societyId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

-- CreateIndex
CREATE INDEX "Expense_vendorBillId_idx" ON "Expense"("vendorBillId");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "FixedDeposit_societyId_idx" ON "FixedDeposit"("societyId");

-- CreateIndex
CREATE INDEX "FixedDeposit_status_idx" ON "FixedDeposit"("status");

-- CreateIndex
CREATE INDEX "FixedDeposit_maturityDate_idx" ON "FixedDeposit"("maturityDate");

-- CreateIndex
CREATE UNIQUE INDEX "FixedDeposit_societyId_fdNumber_key" ON "FixedDeposit"("societyId", "fdNumber");

-- CreateIndex
CREATE INDEX "MemberDeposit_societyId_idx" ON "MemberDeposit"("societyId");

-- CreateIndex
CREATE INDEX "MemberDeposit_flatId_idx" ON "MemberDeposit"("flatId");

-- CreateIndex
CREATE INDEX "MemberDeposit_status_idx" ON "MemberDeposit"("status");

-- CreateIndex
CREATE INDEX "Budget_societyId_idx" ON "Budget"("societyId");

-- CreateIndex
CREATE INDEX "Budget_financialYearId_idx" ON "Budget"("financialYearId");

-- CreateIndex
CREATE INDEX "BudgetItem_budgetId_idx" ON "BudgetItem"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetItem_ledgerId_idx" ON "BudgetItem"("ledgerId");

-- CreateIndex
CREATE INDEX "Ledger_societyId_idx" ON "Ledger"("societyId");

-- CreateIndex
CREATE INDEX "Ledger_group_idx" ON "Ledger"("group");

-- CreateIndex
CREATE INDEX "Ledger_parentLedgerId_idx" ON "Ledger"("parentLedgerId");

-- CreateIndex
CREATE INDEX "Ledger_isActive_idx" ON "Ledger"("isActive");

-- CreateIndex
CREATE INDEX "Ledger_deletedAt_idx" ON "Ledger"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_societyId_name_key" ON "Ledger"("societyId", "name");

-- CreateIndex
CREATE INDEX "JournalEntry_societyId_idx" ON "JournalEntry"("societyId");

-- CreateIndex
CREATE INDEX "JournalEntry_financialYearId_idx" ON "JournalEntry"("financialYearId");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_voucherType_idx" ON "JournalEntry"("voucherType");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- CreateIndex
CREATE INDEX "LedgerEntry_journalEntryId_idx" ON "LedgerEntry"("journalEntryId");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerId_idx" ON "LedgerEntry"("ledgerId");

-- CreateIndex
CREATE INDEX "AssetCategory_societyId_idx" ON "AssetCategory"("societyId");

-- CreateIndex
CREATE INDEX "AssetCategory_isActive_idx" ON "AssetCategory"("isActive");

-- CreateIndex
CREATE INDEX "AssetCategory_deletedAt_idx" ON "AssetCategory"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_societyId_name_key" ON "AssetCategory"("societyId", "name");

-- CreateIndex
CREATE INDEX "FixedAsset_societyId_idx" ON "FixedAsset"("societyId");

-- CreateIndex
CREATE INDEX "FixedAsset_categoryId_idx" ON "FixedAsset"("categoryId");

-- CreateIndex
CREATE INDEX "FixedAsset_status_idx" ON "FixedAsset"("status");

-- CreateIndex
CREATE INDEX "FixedAsset_isActive_idx" ON "FixedAsset"("isActive");

-- CreateIndex
CREATE INDEX "FixedAsset_deletedAt_idx" ON "FixedAsset"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_societyId_assetCode_key" ON "FixedAsset"("societyId", "assetCode");

-- CreateIndex
CREATE INDEX "AssetServiceLog_assetId_idx" ON "AssetServiceLog"("assetId");

-- CreateIndex
CREATE INDEX "AssetServiceLog_vendorId_idx" ON "AssetServiceLog"("vendorId");

-- CreateIndex
CREATE INDEX "AssetServiceLog_serviceDate_idx" ON "AssetServiceLog"("serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "ShareCertificate_flatId_key" ON "ShareCertificate"("flatId");

-- CreateIndex
CREATE INDEX "ShareCertificate_societyId_idx" ON "ShareCertificate"("societyId");

-- CreateIndex
CREATE INDEX "ShareCertificate_personId_idx" ON "ShareCertificate"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareCertificate_societyId_certificateNumber_key" ON "ShareCertificate"("societyId", "certificateNumber");

-- CreateIndex
CREATE INDEX "Nomination_societyId_idx" ON "Nomination"("societyId");

-- CreateIndex
CREATE INDEX "Nomination_flatId_idx" ON "Nomination"("flatId");

-- CreateIndex
CREATE INDEX "Nomination_personId_idx" ON "Nomination"("personId");

-- CreateIndex
CREATE INDEX "Nomination_status_idx" ON "Nomination"("status");

-- CreateIndex
CREATE INDEX "PropertyLien_societyId_idx" ON "PropertyLien"("societyId");

-- CreateIndex
CREATE INDEX "PropertyLien_flatId_idx" ON "PropertyLien"("flatId");

-- CreateIndex
CREATE INDEX "PropertyLien_personId_idx" ON "PropertyLien"("personId");

-- CreateIndex
CREATE INDEX "PropertyLien_status_idx" ON "PropertyLien"("status");

-- CreateIndex
CREATE INDEX "Meeting_societyId_idx" ON "Meeting"("societyId");

-- CreateIndex
CREATE INDEX "Meeting_meetingDate_idx" ON "Meeting"("meetingDate");

-- CreateIndex
CREATE INDEX "Meeting_meetingType_idx" ON "Meeting"("meetingType");

-- CreateIndex
CREATE INDEX "Resolution_meetingId_idx" ON "Resolution"("meetingId");

-- CreateIndex
CREATE INDEX "AuditLog_societyId_idx" ON "AuditLog"("societyId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");

-- CreateIndex
CREATE INDEX "Bill_flatId_status_idx" ON "Bill"("flatId", "status");

-- CreateIndex
CREATE INDEX "Bill_year_month_idx" ON "Bill"("year", "month");

-- CreateIndex
CREATE INDEX "Bill_dueDate_idx" ON "Bill"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_flatId_billType_year_month_key" ON "Bill"("flatId", "billType", "year", "month");

-- CreateIndex
CREATE INDEX "Block_societyId_idx" ON "Block"("societyId");

-- CreateIndex
CREATE INDEX "Block_isActive_idx" ON "Block"("isActive");

-- CreateIndex
CREATE INDEX "Block_deletedAt_idx" ON "Block"("deletedAt");

-- CreateIndex
CREATE INDEX "Flat_blockId_idx" ON "Flat"("blockId");

-- CreateIndex
CREATE INDEX "Flat_isActive_idx" ON "Flat"("isActive");

-- CreateIndex
CREATE INDEX "Flat_deletedAt_idx" ON "Flat"("deletedAt");

-- CreateIndex
CREATE INDEX "FlatPerson_flatId_isPrimary_idx" ON "FlatPerson"("flatId", "isPrimary");

-- CreateIndex
CREATE INDEX "FlatPerson_flatId_role_idx" ON "FlatPerson"("flatId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_chequeRegisterId_key" ON "Payment"("chequeRegisterId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Payment_paidById_idx" ON "Payment"("paidById");

-- CreateIndex
CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

-- CreateIndex
CREATE INDEX "Payment_paidOn_idx" ON "Payment"("paidOn");

-- CreateIndex
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");

-- CreateIndex
CREATE INDEX "Person_societyId_idx" ON "Person"("societyId");

-- CreateIndex
CREATE INDEX "Person_panNumber_idx" ON "Person"("panNumber");

-- CreateIndex
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");

-- CreateIndex
CREATE INDEX "Person_deletedAt_idx" ON "Person"("deletedAt");

-- CreateIndex
CREATE INDEX "Society_isActive_idx" ON "Society"("isActive");

-- CreateIndex
CREATE INDEX "Society_deletedAt_idx" ON "Society"("deletedAt");

-- CreateIndex
CREATE INDEX "SocietyMember_userId_idx" ON "SocietyMember"("userId");

-- CreateIndex
CREATE INDEX "SocietyMember_societyId_idx" ON "SocietyMember"("societyId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "MaintenanceRate" ADD CONSTRAINT "MaintenanceRate_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeCollection" ADD CONSTRAINT "OneTimeCollection_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAllocation" ADD CONSTRAINT "AssessmentAllocation_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "OneTimeCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAllocation" ADD CONSTRAINT "AssessmentAllocation_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInstallment" ADD CONSTRAINT "AssessmentInstallment_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "AssessmentAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInstallment" ADD CONSTRAINT "AssessmentInstallment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOwnershipHistory" ADD CONSTRAINT "FlatOwnershipHistory_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOwnershipHistory" ADD CONSTRAINT "FlatOwnershipHistory_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOwnershipHistory" ADD CONSTRAINT "FlatOwnershipHistory_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOwnershipHistory" ADD CONSTRAINT "FlatOwnershipHistory_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_chequeRegisterId_fkey" FOREIGN KEY ("chequeRegisterId") REFERENCES "ChequeRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRegister" ADD CONSTRAINT "MaintenanceRegister_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRegister" ADD CONSTRAINT "MaintenanceRegister_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRegister" ADD CONSTRAINT "MaintenanceRegister_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "FinancialYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashEntry" ADD CONSTRAINT "PettyCashEntry_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashEntry" ADD CONSTRAINT "PettyCashEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosingLog" ADD CONSTRAINT "CashClosingLog_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosingLog" ADD CONSTRAINT "CashClosingLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedDeposit" ADD CONSTRAINT "FixedDeposit_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDeposit" ADD CONSTRAINT "MemberDeposit_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDeposit" ADD CONSTRAINT "MemberDeposit_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDeposit" ADD CONSTRAINT "MemberDeposit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "FinancialYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_parentLedgerId_fkey" FOREIGN KEY ("parentLedgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "FinancialYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_amcVendorId_fkey" FOREIGN KEY ("amcVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetServiceLog" ADD CONSTRAINT "AssetServiceLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetServiceLog" ADD CONSTRAINT "AssetServiceLog_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCertificate" ADD CONSTRAINT "ShareCertificate_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCertificate" ADD CONSTRAINT "ShareCertificate_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCertificate" ADD CONSTRAINT "ShareCertificate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLien" ADD CONSTRAINT "PropertyLien_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLien" ADD CONSTRAINT "PropertyLien_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLien" ADD CONSTRAINT "PropertyLien_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

