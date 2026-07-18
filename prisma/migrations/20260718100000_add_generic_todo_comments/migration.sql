-- CreateEnum
CREATE TYPE "TodoCommentSource" AS ENUM ('DAILY_LOG', 'MILESTONE_TASK', 'MILESTONE_CHECKLIST', 'RISK_MITIGATION', 'ISSUE', 'DEFECT');

-- CreateTable
CREATE TABLE "TodoComment" (
    "id" TEXT NOT NULL,
    "source" "TodoCommentSource" NOT NULL,
    "entityId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoReaction" (
    "id" TEXT NOT NULL,
    "source" "TodoCommentSource" NOT NULL,
    "entityId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TodoComment_source_entityId_idx" ON "TodoComment"("source", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "TodoReaction_source_entityId_emoji_authorEmail_key" ON "TodoReaction"("source", "entityId", "emoji", "authorEmail");

-- DataMigration: chuyển dữ liệu cũ (bình luận/cảm xúc chỉ có ở Nhật ký) sang bảng chung, giữ nguyên
-- authorEmail/body/emoji/createdAt, entityId = dailyLogItemId cũ, source = 'DAILY_LOG'
INSERT INTO "TodoComment" ("id", "source", "entityId", "authorEmail", "body", "createdAt")
SELECT "id", 'DAILY_LOG', "dailyLogItemId", "authorEmail", "body", "createdAt" FROM "DailyLogItemComment";

INSERT INTO "TodoReaction" ("id", "source", "entityId", "emoji", "authorEmail", "createdAt")
SELECT "id", 'DAILY_LOG', "dailyLogItemId", "emoji", "authorEmail", "createdAt" FROM "DailyLogItemReaction";

-- DropForeignKey
ALTER TABLE "DailyLogItemComment" DROP CONSTRAINT "DailyLogItemComment_dailyLogItemId_fkey";

-- DropForeignKey
ALTER TABLE "DailyLogItemReaction" DROP CONSTRAINT "DailyLogItemReaction_dailyLogItemId_fkey";

-- DropTable
DROP TABLE "DailyLogItemComment";

-- DropTable
DROP TABLE "DailyLogItemReaction";
