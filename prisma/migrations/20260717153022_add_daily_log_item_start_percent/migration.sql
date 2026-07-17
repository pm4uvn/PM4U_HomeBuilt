-- AlterTable
ALTER TABLE "DailyLogItem" ADD COLUMN     "percentComplete" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3);
