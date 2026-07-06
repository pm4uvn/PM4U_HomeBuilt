-- AlterTable
ALTER TABLE "ProjectCharter" ADD COLUMN     "finishingStandard" TEXT,
ADD COLUMN     "floorsAboveGround" INTEGER,
ADD COLUMN     "hasBasement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTum" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CharterFloorPlan" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "floorName" TEXT NOT NULL,
    "rooms" TEXT NOT NULL,
    "areaSqm" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharterFloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharterBudgetPhase" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedPercent" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharterBudgetPhase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CharterFloorPlan" ADD CONSTRAINT "CharterFloorPlan_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "ProjectCharter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterBudgetPhase" ADD CONSTRAINT "CharterBudgetPhase_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "ProjectCharter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
