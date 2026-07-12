-- AlterTable
ALTER TABLE "MilestoneTask" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "percentComplete" INTEGER NOT NULL DEFAULT 0;
