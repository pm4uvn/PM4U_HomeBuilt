-- CreateTable
CREATE TABLE "RiskMitigationAction" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RiskMitigationAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RiskMitigationAction" ADD CONSTRAINT "RiskMitigationAction_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "RiskLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
