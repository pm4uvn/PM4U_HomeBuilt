-- CreateEnum
CREATE TYPE "DailyLogWorkType" AS ENUM ('LEGAL_DOCS', 'SITE_PREPARATION', 'LAND_BOUNDARY', 'NEIGHBOR_CONDITION', 'GROUNDBREAKING', 'DEMOLITION', 'PILING', 'EXCAVATION', 'ACCEPTANCE', 'VARIATION');

-- AlterTable
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN     "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "evidenceType" TEXT,
ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "riskIfMissing" TEXT,
ADD COLUMN     "suggestedModule" TEXT;

-- AlterTable
ALTER TABLE "DailyLogItem" ADD COLUMN     "workType" "DailyLogWorkType";
