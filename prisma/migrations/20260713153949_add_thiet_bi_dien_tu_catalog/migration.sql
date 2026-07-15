-- CreateTable
CREATE TABLE "ThietBi" (
    "id" TEXT NOT NULL,
    "maDanhMuc" TEXT NOT NULL,
    "maNhom" TEXT NOT NULL,
    "nhomCap1" TEXT NOT NULL,
    "nhomCap2" TEXT NOT NULL,
    "tenHangMuc" TEXT NOT NULL,
    "donViTinh" TEXT,
    "coSoSoLuong" TEXT,
    "thongSoBatBuoc" TEXT,
    "thuongHieuPhoBien" TEXT,
    "giaThap" DECIMAL(18,0),
    "giaTrungBinh" DECIMAL(18,0),
    "giaCao" DECIMAL(18,0),
    "baoHanhThang" INTEGER,
    "tuoiThoNam" INTEGER,
    "yeuCauLapDat" TEXT,
    "nguonThamKhao" TEXT,
    "ngayCapNhat" TIMESTAMP(3),
    "doTinCay" TEXT NOT NULL DEFAULT 'trung_binh',
    "trangThai" TEXT NOT NULL DEFAULT 'dang_su_dung',
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThietBi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThietBi_maDanhMuc_key" ON "ThietBi"("maDanhMuc");

-- CreateIndex
CREATE INDEX "ThietBi_nhomCap1_idx" ON "ThietBi"("nhomCap1");
