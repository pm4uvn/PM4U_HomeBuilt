-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "milestoneChecklistItemId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_milestoneChecklistItemId_fkey" FOREIGN KEY ("milestoneChecklistItemId") REFERENCES "MilestoneChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
