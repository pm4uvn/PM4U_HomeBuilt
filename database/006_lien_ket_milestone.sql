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
