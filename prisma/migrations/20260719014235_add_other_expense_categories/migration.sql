-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OtherExpenseCategory" ADD VALUE 'UTILITIES_CONNECTION';
ALTER TYPE "OtherExpenseCategory" ADD VALUE 'CEREMONY';
ALTER TYPE "OtherExpenseCategory" ADD VALUE 'SITE_PREP';
ALTER TYPE "OtherExpenseCategory" ADD VALUE 'FINANCING_INTEREST';
ALTER TYPE "OtherExpenseCategory" ADD VALUE 'TEMP_HOUSING';

-- AlterTable
ALTER TABLE "OtherExpense" ADD COLUMN     "categoryLabel" TEXT;
