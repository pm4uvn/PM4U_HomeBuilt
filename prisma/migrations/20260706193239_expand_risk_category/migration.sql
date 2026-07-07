-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiskCategory" ADD VALUE 'DESIGN_TECHNICAL';
ALTER TYPE "RiskCategory" ADD VALUE 'CONTRACTOR_VENDOR';
ALTER TYPE "RiskCategory" ADD VALUE 'QUALITY';
ALTER TYPE "RiskCategory" ADD VALUE 'SAFETY';
ALTER TYPE "RiskCategory" ADD VALUE 'SCHEDULE';
ALTER TYPE "RiskCategory" ADD VALUE 'COST';
ALTER TYPE "RiskCategory" ADD VALUE 'WEATHER';
