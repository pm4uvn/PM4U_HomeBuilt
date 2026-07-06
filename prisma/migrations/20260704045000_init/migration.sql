-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'SUPERVISOR', 'VENDOR_REP', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PREPARING', 'PERMIT_PENDING', 'UNDER_CONSTRUCTION', 'HANDOVER', 'AS_BUILT_DONE', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('DESIGN', 'PILING', 'STRUCTURE', 'FINISHING', 'INTERIOR', 'MATERIAL_SUPPLIER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SIGNED', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('CONTRACTOR_LATE_PROGRESS', 'OWNER_LATE_PAYMENT', 'TERMINATION', 'FAKE_MATERIAL', 'OWNER_IDLE_WAIT');

-- CreateEnum
CREATE TYPE "PenaltyBasis" AS ENUM ('PCT_OF_CONTRACT_PER_DAY', 'PCT_OF_CONTRACT', 'PCT_OF_ITEM_VALUE', 'FIXED_PER_DAY');

-- CreateEnum
CREATE TYPE "PenaltyEventStatus" AS ENUM ('RUNNING', 'SETTLED', 'WAIVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('DESIGN_FEE_WAIVER', 'PROMOTION', 'NEGOTIATED');

-- CreateEnum
CREATE TYPE "PaymentStageStatus" AS ENUM ('UPCOMING', 'DUE', 'OVERDUE', 'PAID');

-- CreateEnum
CREATE TYPE "VariationReason" AS ENUM ('DESIGN_CHANGE', 'MATERIAL_UPGRADE', 'SITE_CONDITION', 'OWNER_REQUEST');

-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OwnerSupplyCategory" AS ENUM ('TILES', 'SANITARY_WARE', 'APPLIANCES', 'LOOSE_FURNITURE', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PLANNED', 'ORDERED', 'DELIVERED', 'INSTALLED');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('TENDERING', 'DESIGN_CONCEPT', 'DESIGN_TECHNICAL', 'PERMIT', 'PILING', 'STRUCTURE', 'FINISHING', 'INTERIOR_INSTALL', 'AS_BUILT');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'AWAITING_INSPECTION', 'APPROVED', 'REJECTED', 'AUTO_APPROVED');

-- CreateEnum
CREATE TYPE "InspectionMethod" AS ENUM ('SITE_MINUTES', 'APP_CONFIRM', 'ZALO_CONFIRM');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PASS', 'PASS_WITH_NOTES', 'FAIL');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('SUNNY', 'CLOUDY', 'LIGHT_RAIN', 'HEAVY_RAIN', 'STORM');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('NEIGHBOR_SETTLEMENT_CRACK', 'UNDERGROUND_OBSTACLE', 'OWNER_CAUSED_IDLE', 'PILE_QUANTITY_VARIANCE', 'LEGAL_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MONITORING', 'MITIGATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IdleCause" AS ENUM ('SITE_NOT_CLEARED', 'NEIGHBOR_COMPLAINT', 'OWNER_DECISION_PENDING', 'OWNER_PAYMENT_PENDING');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('PERMIT_DRAWING', 'TECHNICAL_DRAWING', 'INTERIOR_3D', 'AS_BUILT_DRAWING', 'CONTRACT_FILE', 'INSPECTION_MINUTES', 'SURVEY_MEDIA', 'INVOICE', 'SITE_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PAYMENT_DUE', 'PAYMENT_OVERDUE', 'HOLD_POINT_REQUESTED', 'HOLD_POINT_EXPIRING', 'IDLE_PENALTY_RUNNING', 'PILE_VARIANCE', 'UNDERGROUND_OBSTACLE', 'CONTRACT_DEADLINE_NEAR', 'BUDGET_OVERRUN');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "landArea" DECIMAL(10,2),
    "grossFloorArea" DECIMAL(10,2),
    "budgetPlanned" DECIMAL(18,0) NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PREPARING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "VendorType" NOT NULL,
    "name" TEXT NOT NULL,
    "taxCode" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "rating" INTEGER,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contractValue" DECIMAL(18,0) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "retentionPct" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "signedDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyRule" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "basis" "PenaltyBasis" NOT NULL,
    "rate" DECIMAL(12,4) NOT NULL,
    "capPct" DECIMAL(5,2),
    "graceDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PenaltyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "baseAmount" DECIMAL(18,0),
    "computedAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "status" "PenaltyEventStatus" NOT NULL DEFAULT 'RUNNING',
    "note" TEXT,

    CONSTRAINT "PenaltyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "percent" DECIMAL(5,2),
    "amount" DECIMAL(18,0),
    "conditionContractId" TEXT,
    "description" TEXT,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentStage" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "stageNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "triggerMilestoneId" TEXT,
    "dueDaysAfterTrigger" INTEGER NOT NULL DEFAULT 3,
    "dueDate" TIMESTAMP(3),
    "status" "PaymentStageStatus" NOT NULL DEFAULT 'UPCOMING',
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(18,0),
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variation" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" "VariationReason" NOT NULL,
    "costDelta" DECIMAL(18,0) NOT NULL,
    "timeExtensionDays" INTEGER NOT NULL DEFAULT 0,
    "status" "VariationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Variation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerPurchaseItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "OwnerSupplyCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "plannedCost" DECIMAL(18,0) NOT NULL,
    "actualCost" DECIMAL(18,0),
    "supplierName" TEXT,
    "neededByDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "OwnerPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "PhaseType" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "progressPct" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isHoldPoint" BOOLEAN NOT NULL DEFAULT false,
    "confirmDeadlineHrs" INTEGER NOT NULL DEFAULT 48,
    "requestedAt" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionRecord" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "method" "InspectionMethod" NOT NULL,
    "result" "InspectionResult" NOT NULL,
    "notes" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "weather" "Weather" NOT NULL,
    "rainHours" DECIMAL(4,1),
    "isForceMajeure" BOOLEAN NOT NULL DEFAULT false,
    "workerCount" INTEGER NOT NULL DEFAULT 0,
    "workDescription" TEXT,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "estimatedCostImpact" DECIMAL(18,0),
    "actualCostImpact" DECIMAL(18,0),
    "mitigationPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "RiskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeighborSurvey" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "neighborAddress" TEXT NOT NULL,
    "neighborName" TEXT,
    "neighborPhone" TEXT,
    "surveyDate" TIMESTAMP(3) NOT NULL,
    "hasExistingCracks" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "NeighborSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdleWaitLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "riskLogId" TEXT,
    "cause" "IdleCause" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dailyPenalty" DECIMAL(18,0) NOT NULL,
    "note" TEXT,

    CONSTRAINT "IdleWaitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilingRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "testPileCount" INTEGER NOT NULL,
    "testPileAvgDepth" DECIMAL(6,2) NOT NULL,
    "designPileLength" DECIMAL(6,2) NOT NULL,
    "unitPricePerMeter" DECIMAL(18,0) NOT NULL,
    "returnFreightFee" DECIMAL(18,0),

    CONSTRAINT "PilingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PileItem" (
    "id" TEXT NOT NULL,
    "pilingRecordId" TEXT NOT NULL,
    "pileNo" INTEGER NOT NULL,
    "plannedLength" DECIMAL(6,2) NOT NULL,
    "actualDepth" DECIMAL(6,2),
    "cutOffLength" DECIMAL(6,2),
    "pressedAt" TIMESTAMP(3),

    CONSTRAINT "PileItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "docType" "DocType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[],
    "meta" JSONB,
    "contractId" TEXT,
    "variationId" TEXT,
    "inspectionRecordId" TEXT,
    "dailyLogId" TEXT,
    "riskLogId" TEXT,
    "neighborSurveyId" TEXT,
    "idleWaitLogId" TEXT,
    "penaltyEventId" TEXT,
    "ownerPurchaseItemId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "refTable" TEXT,
    "refId" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_projectId_code_key" ON "Contract"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentStage_contractId_stageNo_key" ON "PaymentStage"("contractId", "stageNo");

-- CreateIndex
CREATE UNIQUE INDEX "Variation_contractId_code_key" ON "Variation"("contractId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Phase_projectId_sortOrder_key" ON "Phase"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_projectId_logDate_key" ON "DailyLog"("projectId", "logDate");

-- CreateIndex
CREATE INDEX "Document_projectId_docType_idx" ON "Document"("projectId", "docType");

-- CreateIndex
CREATE INDEX "Alert_projectId_status_idx" ON "Alert"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyRule" ADD CONSTRAINT "PenaltyRule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyEvent" ADD CONSTRAINT "PenaltyEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyEvent" ADD CONSTRAINT "PenaltyEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PenaltyRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_conditionContractId_fkey" FOREIGN KEY ("conditionContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentStage" ADD CONSTRAINT "PaymentStage_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentStage" ADD CONSTRAINT "PaymentStage_triggerMilestoneId_fkey" FOREIGN KEY ("triggerMilestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerPurchaseItem" ADD CONSTRAINT "OwnerPurchaseItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRecord" ADD CONSTRAINT "InspectionRecord_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRecord" ADD CONSTRAINT "InspectionRecord_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskLog" ADD CONSTRAINT "RiskLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeighborSurvey" ADD CONSTRAINT "NeighborSurvey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdleWaitLog" ADD CONSTRAINT "IdleWaitLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdleWaitLog" ADD CONSTRAINT "IdleWaitLog_riskLogId_fkey" FOREIGN KEY ("riskLogId") REFERENCES "RiskLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilingRecord" ADD CONSTRAINT "PilingRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PileItem" ADD CONSTRAINT "PileItem_pilingRecordId_fkey" FOREIGN KEY ("pilingRecordId") REFERENCES "PilingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "InspectionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_riskLogId_fkey" FOREIGN KEY ("riskLogId") REFERENCES "RiskLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_neighborSurveyId_fkey" FOREIGN KEY ("neighborSurveyId") REFERENCES "NeighborSurvey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_idleWaitLogId_fkey" FOREIGN KEY ("idleWaitLogId") REFERENCES "IdleWaitLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_penaltyEventId_fkey" FOREIGN KEY ("penaltyEventId") REFERENCES "PenaltyEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerPurchaseItemId_fkey" FOREIGN KEY ("ownerPurchaseItemId") REFERENCES "OwnerPurchaseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
