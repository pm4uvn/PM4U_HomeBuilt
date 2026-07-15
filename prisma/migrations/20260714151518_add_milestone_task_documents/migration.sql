-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "milestoneTaskId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_milestoneTaskId_fkey" FOREIGN KEY ("milestoneTaskId") REFERENCES "MilestoneTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
