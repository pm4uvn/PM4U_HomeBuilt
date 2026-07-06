-- AlterEnum
ALTER TYPE "PaymentStageStatus" ADD VALUE 'PARTIAL';

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentStageId" TEXT NOT NULL,
    "amount" DECIMAL(18,0) NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL,
    "paidFromAccountId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentStageId_fkey" FOREIGN KEY ("paymentStageId") REFERENCES "PaymentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paidFromAccountId_fkey" FOREIGN KEY ("paidFromAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
