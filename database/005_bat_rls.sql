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
