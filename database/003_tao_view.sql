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
