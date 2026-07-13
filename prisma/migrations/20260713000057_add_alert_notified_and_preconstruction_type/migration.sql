-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'PRECONSTRUCTION_RISK';

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "notifiedAt" TIMESTAMP(3);
