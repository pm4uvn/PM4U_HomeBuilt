-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "milestoneId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
