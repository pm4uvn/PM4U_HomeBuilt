-- AlterTable
ALTER TABLE "DailyLogItem" ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "vatTuDuAnId" BIGINT;

-- AddForeignKey
ALTER TABLE "DailyLogItem" ADD CONSTRAINT "DailyLogItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogItem" ADD CONSTRAINT "DailyLogItem_vatTuDuAnId_fkey" FOREIGN KEY ("vatTuDuAnId") REFERENCES "vat_tu_du_an"("id") ON DELETE SET NULL ON UPDATE CASCADE;
