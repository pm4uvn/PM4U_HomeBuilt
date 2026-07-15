-- CreateEnum
CREATE TYPE "DefectCategory" AS ENUM ('WATERPROOFING', 'ELECTRICAL_MEP', 'FINISHING', 'STRUCTURAL', 'DOOR_WINDOW', 'PAINT_WALL', 'FLOORING', 'ROOFING', 'OTHER');

-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FIXED', 'CLOSED');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'WARRANTY_EXPIRING';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "defectId" TEXT;

-- CreateTable
CREATE TABLE "DefectLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "DefectCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "DefectSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "location" TEXT,
    "reportedBy" TEXT,
    "owner" TEXT,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "contractId" TEXT,
    "warrantyMonths" INTEGER,
    "warrantyStartAt" TIMESTAMP(3),
    "warrantyEndAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectActionItem" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DefectActionItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectActionItem" ADD CONSTRAINT "DefectActionItem_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "DefectLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "DefectLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
