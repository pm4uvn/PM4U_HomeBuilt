-- CreateTable
CREATE TABLE "thiet_bi_du_an" (
    "id" TEXT NOT NULL,
    "id_du_an" BIGINT NOT NULL,
    "id_thiet_bi" TEXT NOT NULL,
    "id_nha_cung_cap" BIGINT,
    "id_milestone" TEXT,
    "viTriLapDat" TEXT,
    "soLuongDuKien" DECIMAL(18,2),
    "soLuongThucTe" DECIMAL(18,2),
    "donViTinh" TEXT,
    "donGiaDuKien" DECIMAL(18,2),
    "donGiaChot" DECIMAL(18,2),
    "thanhTienDuKien" DECIMAL(18,2),
    "thanhTienChot" DECIMAL(18,2),
    "nguoiMua" TEXT NOT NULL DEFAULT 'chua_xac_dinh',
    "trangThaiChonModel" TEXT NOT NULL DEFAULT 'chua_chon',
    "trangThaiDatHang" TEXT NOT NULL DEFAULT 'chua_dat',
    "trangThaiGiaoHang" TEXT NOT NULL DEFAULT 'chua_giao',
    "trangThaiLapDat" TEXT NOT NULL DEFAULT 'chua_lap_dat',
    "ngayCanChonModel" DATE,
    "ngayCanDatHang" DATE,
    "ngayCanGiaoHang" DATE,
    "ngayCanLapDat" DATE,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thiet_bi_du_an_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cong_viec_thiet_bi" (
    "id" TEXT NOT NULL,
    "id_thiet_bi_du_an" TEXT NOT NULL,
    "maCongViec" TEXT NOT NULL,
    "tenCongViec" TEXT NOT NULL,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "ngayDuKien" DATE,
    "ngayThucTe" DATE,
    "nguoiPhuTrach" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'chua_lam',
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cong_viec_thiet_bi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "thiet_bi_du_an" ADD CONSTRAINT "thiet_bi_du_an_id_du_an_fkey" FOREIGN KEY ("id_du_an") REFERENCES "du_an"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thiet_bi_du_an" ADD CONSTRAINT "thiet_bi_du_an_id_thiet_bi_fkey" FOREIGN KEY ("id_thiet_bi") REFERENCES "ThietBi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thiet_bi_du_an" ADD CONSTRAINT "thiet_bi_du_an_id_nha_cung_cap_fkey" FOREIGN KEY ("id_nha_cung_cap") REFERENCES "nha_cung_cap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thiet_bi_du_an" ADD CONSTRAINT "thiet_bi_du_an_id_milestone_fkey" FOREIGN KEY ("id_milestone") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cong_viec_thiet_bi" ADD CONSTRAINT "cong_viec_thiet_bi_id_thiet_bi_du_an_fkey" FOREIGN KEY ("id_thiet_bi_du_an") REFERENCES "thiet_bi_du_an"("id") ON DELETE CASCADE ON UPDATE CASCADE;
