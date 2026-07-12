-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('DESIGN_TECHNICAL', 'CONTRACTOR_VENDOR', 'QUALITY', 'SAFETY', 'SCHEDULE', 'COST', 'MATERIAL_SUPPLY', 'NEIGHBOR_COMPLAINT', 'LEGAL_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "IssueLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "raisedBy" TEXT,
    "owner" TEXT,
    "raisedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "costImpact" DECIMAL(18,0),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "relatedRiskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueActionItem" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IssueActionItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IssueLog" ADD CONSTRAINT "IssueLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLog" ADD CONSTRAINT "IssueLog_relatedRiskId_fkey" FOREIGN KEY ("relatedRiskId") REFERENCES "RiskLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueActionItem" ADD CONSTRAINT "IssueActionItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "IssueLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
