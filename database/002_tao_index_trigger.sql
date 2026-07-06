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
