-- CreateEnum
CREATE TYPE "OtherExpenseCategory" AS ENUM ('LEGAL_PERMIT', 'GRATUITY', 'UNEXPECTED', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "OtherExpenseStatus" AS ENUM ('PLANNED', 'PAID');

-- CreateTable
CREATE TABLE "OtherExpense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "OtherExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "plannedCost" DECIMAL(18,0) NOT NULL,
    "actualCost" DECIMAL(18,0),
    "expenseDate" TIMESTAMP(3),
    "status" "OtherExpenseStatus" NOT NULL DEFAULT 'PLANNED',
    "note" TEXT,

    CONSTRAINT "OtherExpense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OtherExpense" ADD CONSTRAINT "OtherExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
