-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DailyLogWorkType" ADD VALUE 'STRUCTURE_WORK';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'MEP_WORK';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'WATERPROOFING';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'FINISHING_WORK';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'INTERIOR_WORK';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'HANDOVER';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'SAFETY';
ALTER TYPE "DailyLogWorkType" ADD VALUE 'MATERIAL_DELIVERY';
