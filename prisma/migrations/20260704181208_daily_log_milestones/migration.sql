-- CreateTable
CREATE TABLE "_DailyLogMilestones" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DailyLogMilestones_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DailyLogMilestones_B_index" ON "_DailyLogMilestones"("B");

-- AddForeignKey
ALTER TABLE "_DailyLogMilestones" ADD CONSTRAINT "_DailyLogMilestones_A_fkey" FOREIGN KEY ("A") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailyLogMilestones" ADD CONSTRAINT "_DailyLogMilestones_B_fkey" FOREIGN KEY ("B") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
