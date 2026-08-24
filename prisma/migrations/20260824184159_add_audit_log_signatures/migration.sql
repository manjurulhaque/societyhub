-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "previousSignature" TEXT,
ADD COLUMN     "signature" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_societyId_createdAt_idx" ON "AuditLog"("societyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_societyId_action_idx" ON "AuditLog"("societyId", "action");

-- CreateIndex
CREATE INDEX "Bill_societyId_status_dueDate_idx" ON "Bill"("societyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Block_societyId_isActive_deletedAt_idx" ON "Block"("societyId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "ChequeRegister_societyId_status_idx" ON "ChequeRegister"("societyId", "status");

-- CreateIndex
CREATE INDEX "ChequeRegister_accountId_chequeDate_status_idx" ON "ChequeRegister"("accountId", "chequeDate", "status");

-- CreateIndex
CREATE INDEX "Expense_societyId_status_expenseDate_idx" ON "Expense"("societyId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "Flat_blockId_isActive_deletedAt_idx" ON "Flat"("blockId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "JournalEntry_societyId_status_entryDate_idx" ON "JournalEntry"("societyId", "status", "entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_societyId_financialYearId_status_idx" ON "JournalEntry"("societyId", "financialYearId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerId_createdAt_idx" ON "LedgerEntry"("ledgerId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_journalEntryId_ledgerId_idx" ON "LedgerEntry"("journalEntryId", "ledgerId");

-- CreateIndex
CREATE INDEX "Payment_societyId_status_paidOn_idx" ON "Payment"("societyId", "status", "paidOn");

-- CreateIndex
CREATE INDEX "Payment_billId_status_idx" ON "Payment"("billId", "status");

-- CreateIndex
CREATE INDEX "Person_societyId_isActive_deletedAt_idx" ON "Person"("societyId", "isActive", "deletedAt");
