-- =====================================================================
-- HomeBuild PM — Module Vật tư hoàn thiện
-- File 001: Tạo toàn bộ bảng (khóa chính, khóa ngoại, check constraint)
-- Chạy trước tiên. PostgreSQL 14+ (Supabase OK).
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. nhom_vat_tu — Nhóm vật tư (Gạch ốp lát, Sơn nước, ...)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nhom_vat_tu (
  id                BIGSERIAL PRIMARY KEY,
  ma_nhom_vat_tu    VARCHAR(20)  UNIQUE NOT NULL,
  ma_nhom_ky_thuat  VARCHAR(100) UNIQUE NOT NULL,
  ten_nhom_vat_tu   VARCHAR(255) NOT NULL,
  thu_tu            INT DEFAULT 0,
  ghi_chu           TEXT,
  trang_thai        VARCHAR(30) DEFAULT 'dang_dung'
                    CONSTRAINT ck_nhom_vat_tu_trang_thai
                    CHECK (trang_thai IN ('dang_dung', 'tam_an', 'ngung_dung')),
  ngay_tao          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 2. vat_tu — Danh mục vật tư chuẩn, dùng lại cho nhiều dự án
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vat_tu (
  id                  BIGSERIAL PRIMARY KEY,
  ma_vat_tu           VARCHAR(50)  UNIQUE NOT NULL,
  ten_vat_tu          VARCHAR(255) NOT NULL,
  id_nhom_vat_tu      BIGINT NOT NULL REFERENCES nhom_vat_tu(id),
  don_vi_tinh         VARCHAR(50),
  quy_cach            TEXT,
  thuong_hieu_goi_y   TEXT,
  xuat_xu             VARCHAR(100),

  -- Giá tham khảo từ các nguồn
  don_gia_thiet_thach NUMERIC(18,2),
  don_gia_cat_nghi    NUMERIC(18,2),
  don_gia_goi_chuan   NUMERIC(18,2),
  don_gia_tham_khao   NUMERIC(18,2),

  -- Quản lý mua hàng
  nguon_mua_mac_dinh  VARCHAR(50) DEFAULT 'chua_xac_dinh'
                      CONSTRAINT ck_vat_tu_nguon_mua
                      CHECK (nguon_mua_mac_dinh IN ('chu_dau_tu_mua', 'nha_thau_mua', 'chua_xac_dinh')),
  can_chot_mau        BOOLEAN DEFAULT TRUE,
  can_theo_doi_tien_do BOOLEAN DEFAULT TRUE,

  ghi_chu             TEXT,
  trang_thai          VARCHAR(30) DEFAULT 'dang_dung'
                      CONSTRAINT ck_vat_tu_trang_thai
                      CHECK (trang_thai IN ('dang_dung', 'tam_an', 'ngung_dung')),
  ngay_tao            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 3. nha_cung_cap — Nhà thầu / nhà cung cấp vật tư
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nha_cung_cap (
  id                 BIGSERIAL PRIMARY KEY,
  ma_nha_cung_cap    VARCHAR(50)  UNIQUE NOT NULL,
  ten_nha_cung_cap   VARCHAR(255) NOT NULL,
  loai_nha_cung_cap  VARCHAR(100),
  so_dien_thoai      VARCHAR(50),
  email              VARCHAR(255),
  dia_chi            TEXT,
  ghi_chu            TEXT,
  trang_thai         VARCHAR(30) DEFAULT 'dang_dung'
                     CONSTRAINT ck_nha_cung_cap_trang_thai
                     CHECK (trang_thai IN ('dang_dung', 'tam_an', 'ngung_dung')),
  ngay_tao           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 4. du_an — Công trình
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS du_an (
  id                        BIGSERIAL PRIMARY KEY,
  ma_du_an                  VARCHAR(50)  UNIQUE NOT NULL,
  ten_du_an                 VARCHAR(255) NOT NULL,
  dia_chi                   TEXT,
  chu_dau_tu                VARCHAR(255),
  ngay_khoi_cong            DATE,
  ngay_du_kien_hoan_thanh   DATE,
  trang_thai                VARCHAR(50) DEFAULT 'dang_chuan_bi'
                            CONSTRAINT ck_du_an_trang_thai
                            CHECK (trang_thai IN ('dang_chuan_bi', 'dang_thi_cong', 'tam_dung', 'hoan_thanh', 'huy')),
  ghi_chu                   TEXT,
  ngay_tao                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 5. vat_tu_du_an — Vật tư dùng cho từng dự án (bảng nghiệp vụ chính)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vat_tu_du_an (
  id                    BIGSERIAL PRIMARY KEY,
  id_du_an              BIGINT NOT NULL REFERENCES du_an(id),
  id_vat_tu             BIGINT NOT NULL REFERENCES vat_tu(id),
  id_nha_cung_cap       BIGINT NULL REFERENCES nha_cung_cap(id),

  -- Thông tin sử dụng
  khu_vuc_su_dung       VARCHAR(255),
  khoi_luong_du_kien    NUMERIC(18,2),
  khoi_luong_thuc_te    NUMERIC(18,2),
  don_vi_tinh           VARCHAR(50),

  -- Thông tin giá
  don_gia_du_kien       NUMERIC(18,2),
  don_gia_chot          NUMERIC(18,2),
  thanh_tien_du_kien    NUMERIC(18,2),
  thanh_tien_chot       NUMERIC(18,2),

  -- Thông tin mua hàng
  nguoi_mua             VARCHAR(50) DEFAULT 'chua_xac_dinh'
                        CONSTRAINT ck_vtda_nguoi_mua
                        CHECK (nguoi_mua IN ('chu_dau_tu', 'nha_thau', 'chua_xac_dinh')),
  trang_thai_chot_mau   VARCHAR(50) DEFAULT 'chua_chot'
                        CONSTRAINT ck_vtda_chot_mau
                        CHECK (trang_thai_chot_mau IN ('chua_chot', 'dang_xem_mau', 'da_chot', 'can_doi_mau')),
  trang_thai_dat_hang   VARCHAR(50) DEFAULT 'chua_dat'
                        CONSTRAINT ck_vtda_dat_hang
                        CHECK (trang_thai_dat_hang IN ('chua_dat', 'dang_bao_gia', 'da_duyet_gia', 'da_dat', 'da_mua', 'huy')),
  trang_thai_giao_hang  VARCHAR(50) DEFAULT 'chua_giao'
                        CONSTRAINT ck_vtda_giao_hang
                        CHECK (trang_thai_giao_hang IN ('chua_giao', 'giao_mot_phan', 'da_giao', 'tre_hen', 'loi_vat_tu')),
  trang_thai_thi_cong   VARCHAR(50) DEFAULT 'chua_thi_cong'
                        CONSTRAINT ck_vtda_thi_cong
                        CHECK (trang_thai_thi_cong IN ('chua_thi_cong', 'dang_thi_cong', 'da_thi_cong', 'dang_nghiem_thu', 'da_nghiem_thu', 'can_sua_loi')),

  -- Mốc thời gian kế hoạch
  ngay_can_chot_mau     DATE,
  ngay_can_dat_hang     DATE,
  ngay_can_giao_hang    DATE,
  ngay_can_thi_cong     DATE,

  -- Mốc thời gian thực tế
  ngay_thuc_te_chot_mau   DATE,
  ngay_thuc_te_dat_hang   DATE,
  ngay_thuc_te_giao_hang  DATE,
  ngay_thuc_te_thi_cong   DATE,
  ngay_thuc_te_nghiem_thu DATE,

  ghi_chu               TEXT,
  ngay_tao              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 6. cong_viec_vat_tu — Việc chi tiết của từng vật tư trong dự án
--    (Chốt mẫu → Duyệt giá → Đặt hàng → Giao hàng → Kiểm tra → Thi công → Nghiệm thu)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cong_viec_vat_tu (
  id                BIGSERIAL PRIMARY KEY,
  id_vat_tu_du_an   BIGINT NOT NULL REFERENCES vat_tu_du_an(id),
  ma_cong_viec      VARCHAR(50)  NOT NULL,
  ten_cong_viec     VARCHAR(255) NOT NULL,
  thu_tu            INT DEFAULT 0,
  ngay_du_kien      DATE,
  ngay_thuc_te      DATE,
  nguoi_phu_trach   VARCHAR(255),
  trang_thai        VARCHAR(50) DEFAULT 'chua_lam'
                    CONSTRAINT ck_cong_viec_trang_thai
                    CHECK (trang_thai IN ('chua_lam', 'dang_lam', 'hoan_thanh', 'tre_han', 'tam_dung', 'huy')),
  ghi_chu           TEXT,
  ngay_tao          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
