/*
  Warnings:

  - Made the column `thu_tu` on table `cong_viec_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai` on table `cong_viec_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_tao` on table `cong_viec_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_cap_nhat` on table `cong_viec_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai` on table `du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_tao` on table `du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_cap_nhat` on table `du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai` on table `nha_cung_cap` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_tao` on table `nha_cung_cap` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_cap_nhat` on table `nha_cung_cap` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thu_tu` on table `nhom_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai` on table `nhom_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_tao` on table `nhom_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_cap_nhat` on table `nhom_vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nguon_mua_mac_dinh` on table `vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `can_chot_mau` on table `vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `can_theo_doi_tien_do` on table `vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai` on table `vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_tao` on table `vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_cap_nhat` on table `vat_tu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nguoi_mua` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai_chot_mau` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai_dat_hang` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai_giao_hang` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trang_thai_thi_cong` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_tao` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ngay_cap_nhat` on table `vat_tu_du_an` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "StakeholderLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- DropForeignKey
ALTER TABLE "cong_viec_vat_tu" DROP CONSTRAINT "cong_viec_vat_tu_id_vat_tu_du_an_fkey";

-- DropForeignKey
ALTER TABLE "vat_tu" DROP CONSTRAINT "vat_tu_id_nhom_vat_tu_fkey";

-- DropForeignKey
ALTER TABLE "vat_tu_du_an" DROP CONSTRAINT "vat_tu_du_an_id_du_an_fkey";

-- DropForeignKey
ALTER TABLE "vat_tu_du_an" DROP CONSTRAINT "vat_tu_du_an_id_milestone_fkey";

-- DropForeignKey
ALTER TABLE "vat_tu_du_an" DROP CONSTRAINT "vat_tu_du_an_id_nha_cung_cap_fkey";

-- DropForeignKey
ALTER TABLE "vat_tu_du_an" DROP CONSTRAINT "vat_tu_du_an_id_vat_tu_fkey";

-- DropIndex
DROP INDEX "idx_cvvt_ngay_du_kien";

-- DropIndex
DROP INDEX "idx_cvvt_trang_thai";

-- DropIndex
DROP INDEX "idx_cvvt_vat_tu_du_an";

-- DropIndex
DROP INDEX "idx_vat_tu_ma";

-- DropIndex
DROP INDEX "idx_vat_tu_nhom";

-- DropIndex
DROP INDEX "idx_vat_tu_ten";

-- DropIndex
DROP INDEX "idx_vat_tu_trang_thai";

-- DropIndex
DROP INDEX "idx_vtda_du_an";

-- DropIndex
DROP INDEX "idx_vtda_milestone";

-- DropIndex
DROP INDEX "idx_vtda_ngay_giao";

-- DropIndex
DROP INDEX "idx_vtda_ngay_thi_cong";

-- DropIndex
DROP INDEX "idx_vtda_nha_cung_cap";

-- DropIndex
DROP INDEX "idx_vtda_tt_chot_mau";

-- DropIndex
DROP INDEX "idx_vtda_tt_dat_hang";

-- DropIndex
DROP INDEX "idx_vtda_tt_giao_hang";

-- DropIndex
DROP INDEX "idx_vtda_tt_thi_cong";

-- DropIndex
DROP INDEX "idx_vtda_vat_tu";

-- AlterTable
ALTER TABLE "cong_viec_vat_tu" ALTER COLUMN "thu_tu" SET NOT NULL,
ALTER COLUMN "trang_thai" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ngay_cap_nhat" SET NOT NULL,
ALTER COLUMN "ngay_cap_nhat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "du_an" ALTER COLUMN "trang_thai" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ngay_cap_nhat" SET NOT NULL,
ALTER COLUMN "ngay_cap_nhat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "nha_cung_cap" ALTER COLUMN "trang_thai" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ngay_cap_nhat" SET NOT NULL,
ALTER COLUMN "ngay_cap_nhat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "nhom_vat_tu" ALTER COLUMN "thu_tu" SET NOT NULL,
ALTER COLUMN "trang_thai" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ngay_cap_nhat" SET NOT NULL,
ALTER COLUMN "ngay_cap_nhat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vat_tu" ALTER COLUMN "nguon_mua_mac_dinh" SET NOT NULL,
ALTER COLUMN "can_chot_mau" SET NOT NULL,
ALTER COLUMN "can_theo_doi_tien_do" SET NOT NULL,
ALTER COLUMN "trang_thai" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ngay_cap_nhat" SET NOT NULL,
ALTER COLUMN "ngay_cap_nhat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vat_tu_du_an" ALTER COLUMN "nguoi_mua" SET NOT NULL,
ALTER COLUMN "trang_thai_chot_mau" SET NOT NULL,
ALTER COLUMN "trang_thai_dat_hang" SET NOT NULL,
ALTER COLUMN "trang_thai_giao_hang" SET NOT NULL,
ALTER COLUMN "trang_thai_thi_cong" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET NOT NULL,
ALTER COLUMN "ngay_tao" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ngay_cap_nhat" SET NOT NULL,
ALTER COLUMN "ngay_cap_nhat" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectCharter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "scopeIncluded" TEXT,
    "scopeExcluded" TEXT,
    "successCriteria" TEXT,
    "assumptions" TEXT,
    "constraints" TEXT,
    "sponsorName" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCharter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "influence" "StakeholderLevel" NOT NULL DEFAULT 'MEDIUM',
    "interest" "StakeholderLevel" NOT NULL DEFAULT 'MEDIUM',
    "communicationNeed" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCharter_projectId_key" ON "ProjectCharter"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectCharter" ADD CONSTRAINT "ProjectCharter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_tu" ADD CONSTRAINT "vat_tu_id_nhom_vat_tu_fkey" FOREIGN KEY ("id_nhom_vat_tu") REFERENCES "nhom_vat_tu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_tu_du_an" ADD CONSTRAINT "vat_tu_du_an_id_du_an_fkey" FOREIGN KEY ("id_du_an") REFERENCES "du_an"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_tu_du_an" ADD CONSTRAINT "vat_tu_du_an_id_vat_tu_fkey" FOREIGN KEY ("id_vat_tu") REFERENCES "vat_tu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_tu_du_an" ADD CONSTRAINT "vat_tu_du_an_id_nha_cung_cap_fkey" FOREIGN KEY ("id_nha_cung_cap") REFERENCES "nha_cung_cap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_tu_du_an" ADD CONSTRAINT "vat_tu_du_an_id_milestone_fkey" FOREIGN KEY ("id_milestone") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cong_viec_vat_tu" ADD CONSTRAINT "cong_viec_vat_tu_id_vat_tu_du_an_fkey" FOREIGN KEY ("id_vat_tu_du_an") REFERENCES "vat_tu_du_an"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
