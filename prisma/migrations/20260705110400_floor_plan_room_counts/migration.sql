/*
  Warnings:

  - You are about to drop the column `rooms` on the `CharterFloorPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CharterFloorPlan" DROP COLUMN "rooms",
ADD COLUMN     "ghiChuKhac" TEXT,
ADD COLUMN     "soBanCong" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soBep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soPhongKhach" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soPhongNgu" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soPhongTho" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soWc" INTEGER NOT NULL DEFAULT 0;
