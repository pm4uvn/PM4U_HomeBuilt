-- CreateTable
CREATE TABLE "DailyLogItemComment" (
    "id" TEXT NOT NULL,
    "dailyLogItemId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLogItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLogItemReaction" (
    "id" TEXT NOT NULL,
    "dailyLogItemId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLogItemReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyLogItemComment_dailyLogItemId_idx" ON "DailyLogItemComment"("dailyLogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLogItemReaction_dailyLogItemId_emoji_authorEmail_key" ON "DailyLogItemReaction"("dailyLogItemId", "emoji", "authorEmail");

-- AddForeignKey
ALTER TABLE "DailyLogItemComment" ADD CONSTRAINT "DailyLogItemComment_dailyLogItemId_fkey" FOREIGN KEY ("dailyLogItemId") REFERENCES "DailyLogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogItemReaction" ADD CONSTRAINT "DailyLogItemReaction_dailyLogItemId_fkey" FOREIGN KEY ("dailyLogItemId") REFERENCES "DailyLogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
