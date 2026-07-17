-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "dailyLogItemId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dailyLogItemId_fkey" FOREIGN KEY ("dailyLogItemId") REFERENCES "DailyLogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
