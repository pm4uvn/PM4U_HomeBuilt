-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "predecessorType" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorType" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDependency_projectId_idx" ON "TaskDependency"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_predecessorType_predecessorId_successorType__key" ON "TaskDependency"("predecessorType", "predecessorId", "successorType", "successorId");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
