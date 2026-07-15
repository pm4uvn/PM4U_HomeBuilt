-- AlterEnum
ALTER TYPE "PenaltyType" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "PenaltyRule" ADD COLUMN     "label" TEXT;
