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
-- =====================================================================
-- HomeBuild PM — Module Vật tư hoàn thiện
-- File 002: Index + trigger tự cập nhật ngay_cap_nhat + hàm tiện ích
-- Chạy sau 001_tao_bang.sql
-- =====================================================================

-- ---------------------------------------------------------------
-- Index bảng vat_tu
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vat_tu_ma            ON vat_tu (ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_vat_tu_ten           ON vat_tu (ten_vat_tu);
CREATE INDEX IF NOT EXISTS idx_vat_tu_nhom          ON vat_tu (id_nhom_vat_tu);
CREATE INDEX IF NOT EXISTS idx_vat_tu_trang_thai    ON vat_tu (trang_thai);

-- ---------------------------------------------------------------
-- Index bảng vat_tu_du_an
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vtda_du_an           ON vat_tu_du_an (id_du_an);
CREATE INDEX IF NOT EXISTS idx_vtda_vat_tu          ON vat_tu_du_an (id_vat_tu);
CREATE INDEX IF NOT EXISTS idx_vtda_nha_cung_cap    ON vat_tu_du_an (id_nha_cung_cap);
CREATE INDEX IF NOT EXISTS idx_vtda_ngay_giao       ON vat_tu_du_an (ngay_can_giao_hang);
CREATE INDEX IF NOT EXISTS idx_vtda_ngay_thi_cong   ON vat_tu_du_an (ngay_can_thi_cong);
CREATE INDEX IF NOT EXISTS idx_vtda_tt_chot_mau     ON vat_tu_du_an (trang_thai_chot_mau);
CREATE INDEX IF NOT EXISTS idx_vtda_tt_dat_hang     ON vat_tu_du_an (trang_thai_dat_hang);
CREATE INDEX IF NOT EXISTS idx_vtda_tt_giao_hang    ON vat_tu_du_an (trang_thai_giao_hang);
CREATE INDEX IF NOT EXISTS idx_vtda_tt_thi_cong     ON vat_tu_du_an (trang_thai_thi_cong);

-- ---------------------------------------------------------------
-- Index bảng cong_viec_vat_tu
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cvvt_vat_tu_du_an    ON cong_viec_vat_tu (id_vat_tu_du_an);
CREATE INDEX IF NOT EXISTS idx_cvvt_trang_thai      ON cong_viec_vat_tu (trang_thai);
CREATE INDEX IF NOT EXISTS idx_cvvt_ngay_du_kien    ON cong_viec_vat_tu (ngay_du_kien);

-- ---------------------------------------------------------------
-- Function + trigger: tự cập nhật ngay_cap_nhat khi UPDATE
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_ngay_cap_nhat()
RETURNS TRIGGER AS $$
BEGIN
  -- clock_timestamp() thay vì CURRENT_TIMESTAMP: lấy giờ thật tại thời điểm UPDATE,
  -- kể cả khi INSERT và UPDATE nằm cùng 1 transaction
  NEW.ngay_cap_nhat := clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nhom_vat_tu_cap_nhat ON nhom_vat_tu;
CREATE TRIGGER trg_nhom_vat_tu_cap_nhat
  BEFORE UPDATE ON nhom_vat_tu
  FOR EACH ROW EXECUTE FUNCTION update_ngay_cap_nhat();

DROP TRIGGER IF EXISTS trg_vat_tu_cap_nhat ON vat_tu;
CREATE TRIGGER trg_vat_tu_cap_nhat
  BEFORE UPDATE ON vat_tu
  FOR EACH ROW EXECUTE FUNCTION update_ngay_cap_nhat();

DROP TRIGGER IF EXISTS trg_nha_cung_cap_cap_nhat ON nha_cung_cap;
CREATE TRIGGER trg_nha_cung_cap_cap_nhat
  BEFORE UPDATE ON nha_cung_cap
  FOR EACH ROW EXECUTE FUNCTION update_ngay_cap_nhat();

DROP TRIGGER IF EXISTS trg_du_an_cap_nhat ON du_an;
CREATE TRIGGER trg_du_an_cap_nhat
  BEFORE UPDATE ON du_an
  FOR EACH ROW EXECUTE FUNCTION update_ngay_cap_nhat();

DROP TRIGGER IF EXISTS trg_vat_tu_du_an_cap_nhat ON vat_tu_du_an;
CREATE TRIGGER trg_vat_tu_du_an_cap_nhat
  BEFORE UPDATE ON vat_tu_du_an
  FOR EACH ROW EXECUTE FUNCTION update_ngay_cap_nhat();

DROP TRIGGER IF EXISTS trg_cong_viec_vat_tu_cap_nhat ON cong_viec_vat_tu;
CREATE TRIGGER trg_cong_viec_vat_tu_cap_nhat
  BEFORE UPDATE ON cong_viec_vat_tu
  FOR EACH ROW EXECUTE FUNCTION update_ngay_cap_nhat();

-- ---------------------------------------------------------------
-- Hàm tiện ích: tạo 7 công việc mẫu cho 1 dòng vat_tu_du_an
-- Cách dùng:  SELECT tao_cong_viec_mau(123);
-- (123 là id của dòng vat_tu_du_an; hàm bỏ qua nếu công việc đã tồn tại)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION tao_cong_viec_mau(p_id_vat_tu_du_an BIGINT)
RETURNS INT AS $$
DECLARE
  so_dong INT := 0;
BEGIN
  INSERT INTO cong_viec_vat_tu (id_vat_tu_du_an, ma_cong_viec, ten_cong_viec, thu_tu)
  SELECT p_id_vat_tu_du_an, m.ma, m.ten, m.thu_tu
  FROM (VALUES
    ('CHOT_MAU',   'Chốt mẫu',        1),
    ('DUYET_GIA',  'Duyệt giá',       2),
    ('DAT_HANG',   'Đặt hàng',        3),
    ('GIAO_HANG',  'Giao hàng',       4),
    ('KIEM_TRA',   'Kiểm tra vật tư', 5),
    ('THI_CONG',   'Thi công',        6),
    ('NGHIEM_THU', 'Nghiệm thu',      7)
  ) AS m(ma, ten, thu_tu)
  WHERE NOT EXISTS (
    SELECT 1 FROM cong_viec_vat_tu c
    WHERE c.id_vat_tu_du_an = p_id_vat_tu_du_an AND c.ma_cong_viec = m.ma
  );
  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong;
END;
$$ LANGUAGE plpgsql;
-- =====================================================================
-- HomeBuild PM — Module Vật tư hoàn thiện
-- File 003: Các view báo cáo
-- Chạy sau 002_tao_index_trigger.sql
-- Lưu ý: security_invoker = true để view tôn trọng RLS (chuẩn Supabase)
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. v_danh_sach_vat_tu — Danh mục vật tư kèm tên nhóm
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW v_danh_sach_vat_tu
WITH (security_invoker = true) AS
SELECT
  vt.id                  AS id_vat_tu,
  vt.ma_vat_tu,
  vt.ten_vat_tu,
  n.ma_nhom_vat_tu,
  n.ten_nhom_vat_tu,
  vt.don_vi_tinh,
  vt.quy_cach,
  vt.thuong_hieu_goi_y,
  vt.don_gia_thiet_thach,
  vt.don_gia_cat_nghi,
  vt.don_gia_goi_chuan,
  vt.don_gia_tham_khao,
  vt.nguon_mua_mac_dinh,
  vt.can_chot_mau,
  vt.can_theo_doi_tien_do,
  vt.trang_thai
FROM vat_tu vt
JOIN nhom_vat_tu n ON n.id = vt.id_nhom_vat_tu
ORDER BY n.thu_tu, vt.ma_vat_tu;

-- ---------------------------------------------------------------
-- 2. v_vat_tu_du_an — Vật tư theo dự án, kèm thành tiền tính toán
--    thanh_tien_*_tinh_toan: ưu tiên số nhập tay, nếu trống thì tự nhân
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW v_vat_tu_du_an
WITH (security_invoker = true) AS
SELECT
  vtda.id                AS id_vat_tu_du_an,
  da.ma_du_an,
  da.ten_du_an,
  vt.ma_vat_tu,
  vt.ten_vat_tu,
  n.ma_nhom_vat_tu,
  n.ten_nhom_vat_tu,
  ncc.ten_nha_cung_cap,
  vtda.khu_vuc_su_dung,
  vtda.khoi_luong_du_kien,
  vtda.khoi_luong_thuc_te,
  COALESCE(vtda.don_vi_tinh, vt.don_vi_tinh) AS don_vi_tinh,
  vtda.don_gia_du_kien,
  vtda.don_gia_chot,
  COALESCE(vtda.thanh_tien_du_kien, vtda.khoi_luong_du_kien * vtda.don_gia_du_kien) AS thanh_tien_du_kien_tinh_toan,
  COALESCE(vtda.thanh_tien_chot,    vtda.khoi_luong_thuc_te * vtda.don_gia_chot)    AS thanh_tien_chot_tinh_toan,
  vtda.nguoi_mua,
  vtda.trang_thai_chot_mau,
  vtda.trang_thai_dat_hang,
  vtda.trang_thai_giao_hang,
  vtda.trang_thai_thi_cong,
  vtda.ngay_can_chot_mau,
  vtda.ngay_can_dat_hang,
  vtda.ngay_can_giao_hang,
  vtda.ngay_can_thi_cong
FROM vat_tu_du_an vtda
JOIN du_an da        ON da.id  = vtda.id_du_an
JOIN vat_tu vt       ON vt.id  = vtda.id_vat_tu
JOIN nhom_vat_tu n   ON n.id   = vt.id_nhom_vat_tu
LEFT JOIN nha_cung_cap ncc ON ncc.id = vtda.id_nha_cung_cap
ORDER BY da.ma_du_an, n.thu_tu, vt.ma_vat_tu;

-- ---------------------------------------------------------------
-- 3. v_tien_do_vat_tu — Tiến độ từng công việc, kèm số ngày trễ
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW v_tien_do_vat_tu
WITH (security_invoker = true) AS
SELECT
  cv.id                  AS id_cong_viec,
  cv.id_vat_tu_du_an,
  da.ten_du_an,
  vt.ten_vat_tu,
  n.ten_nhom_vat_tu,
  cv.ma_cong_viec,
  cv.ten_cong_viec,
  cv.thu_tu,
  cv.ngay_du_kien,
  cv.ngay_thuc_te,
  cv.trang_thai,
  cv.nguoi_phu_trach,
  CASE
    WHEN cv.trang_thai NOT IN ('hoan_thanh', 'huy')
         AND cv.ngay_du_kien IS NOT NULL
         AND cv.ngay_du_kien < CURRENT_DATE
      THEN (CURRENT_DATE - cv.ngay_du_kien)
    ELSE 0
  END AS so_ngay_tre
FROM cong_viec_vat_tu cv
JOIN vat_tu_du_an vtda ON vtda.id = cv.id_vat_tu_du_an
JOIN du_an da          ON da.id   = vtda.id_du_an
JOIN vat_tu vt         ON vt.id   = vtda.id_vat_tu
JOIN nhom_vat_tu n     ON n.id    = vt.id_nhom_vat_tu
ORDER BY da.ma_du_an, vt.ma_vat_tu, cv.thu_tu;

-- ---------------------------------------------------------------
-- 4. v_tong_hop_chi_phi_vat_tu_du_an — Tổng hợp chi phí theo dự án
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW v_tong_hop_chi_phi_vat_tu_du_an
WITH (security_invoker = true) AS
SELECT
  da.id       AS id_du_an,
  da.ma_du_an,
  da.ten_du_an,
  COALESCE(SUM(COALESCE(vtda.thanh_tien_du_kien, vtda.khoi_luong_du_kien * vtda.don_gia_du_kien)), 0) AS tong_du_kien,
  COALESCE(SUM(COALESCE(vtda.thanh_tien_chot,    vtda.khoi_luong_thuc_te * vtda.don_gia_chot)), 0)    AS tong_chot,
  COALESCE(SUM(COALESCE(vtda.thanh_tien_chot,    vtda.khoi_luong_thuc_te * vtda.don_gia_chot)), 0)
    - COALESCE(SUM(COALESCE(vtda.thanh_tien_du_kien, vtda.khoi_luong_du_kien * vtda.don_gia_du_kien)), 0) AS chen_lech,
  COUNT(vtda.id)                                                              AS so_luong_vat_tu,
  COUNT(vtda.id) FILTER (WHERE vtda.trang_thai_chot_mau = 'da_chot')          AS so_luong_da_chot_mau,
  COUNT(vtda.id) FILTER (WHERE vtda.trang_thai_dat_hang IN ('da_dat', 'da_mua')) AS so_luong_da_dat_hang,
  COUNT(vtda.id) FILTER (WHERE vtda.trang_thai_giao_hang = 'da_giao')         AS so_luong_da_giao,
  COUNT(vtda.id) FILTER (WHERE vtda.trang_thai_thi_cong = 'da_nghiem_thu')    AS so_luong_da_nghiem_thu
FROM du_an da
LEFT JOIN vat_tu_du_an vtda ON vtda.id_du_an = da.id
GROUP BY da.id, da.ma_du_an, da.ten_du_an
ORDER BY da.ma_du_an;
-- =====================================================================
-- HomeBuild PM — Module Vật tư hoàn thiện
-- File 005: Bật Row Level Security (đồng bộ chính sách bảo mật của app)
-- Anon key của Supabase sẽ KHÔNG đọc được các bảng này qua REST;
-- app đọc/ghi qua role postgres (Prisma / pg) nên không bị ảnh hưởng.
-- =====================================================================

ALTER TABLE nhom_vat_tu      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_tu           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nha_cung_cap     ENABLE ROW LEVEL SECURITY;
ALTER TABLE du_an            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_tu_du_an     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cong_viec_vat_tu ENABLE ROW LEVEL SECURITY;
-- =====================================================================
-- HomeBuild PM — Module Vật tư hoàn thiện
-- File 006: Liên kết vật tư dự án với milestone tiến độ (bảng "Milestone" của Prisma)
-- Cho phép gợi ý ngày cần chốt mẫu / đặt hàng / giao hàng / thi công dựa theo
-- ngày dự kiến (plannedDate) của mốc nghiệm thu liên quan.
-- Chạy sau 005_bat_rls.sql.
-- =====================================================================

ALTER TABLE vat_tu_du_an
  ADD COLUMN IF NOT EXISTS id_milestone TEXT REFERENCES "Milestone"(id);

CREATE INDEX IF NOT EXISTS idx_vtda_milestone ON vat_tu_du_an (id_milestone);
