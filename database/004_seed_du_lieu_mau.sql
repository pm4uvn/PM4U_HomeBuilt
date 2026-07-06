-- =====================================================================
-- HomeBuild PM — Module Vật tư hoàn thiện
-- File 004: Seed dữ liệu mẫu (nhóm vật tư, nhà cung cấp, dự án, vật tư)
-- Chạy sau 003_tao_view.sql. Chạy lại nhiều lần vẫn an toàn (ON CONFLICT DO NOTHING)
-- =====================================================================

-- ---------------------------------------------------------------
-- Nhóm vật tư N01 → N14
-- ---------------------------------------------------------------
INSERT INTO nhom_vat_tu (ma_nhom_vat_tu, ma_nhom_ky_thuat, ten_nhom_vat_tu, thu_tu) VALUES
  ('N01', 'gach_op_lat',                  'Gạch ốp lát',                     1),
  ('N02', 'tran_thach_cao',               'Trần thạch cao',                  2),
  ('N03', 'son_nuoc',                     'Sơn nước',                        3),
  ('N04', 'cua_di_cua_so',                'Cửa đi - cửa sổ',                 4),
  ('N05', 'cau_thang_lan_can',            'Cầu thang - lan can',             5),
  ('N06', 'da_trang_tri',                 'Đá granite/đá trang trí',         6),
  ('N07', 'thiet_bi_dien',                'Thiết bị điện',                   7),
  ('N08', 'thiet_bi_ve_sinh',             'Thiết bị vệ sinh',                8),
  ('N09', 'cap_nuoc_nang_luong_mat_troi', 'Cấp nước - năng lượng mặt trời',  9),
  ('N10', 'dien_lanh',                    'Điện lạnh',                      10),
  ('N11', 'mai_lay_sang',                 'Mái lấy sáng',                   11),
  ('N12', 'cua_cuon',                     'Cửa cuốn',                       12),
  ('N13', 'chi_phi_dich_vu',              'Chi phí dịch vụ',                13),
  ('N14', 'khac',                         'Khác',                           14)
ON CONFLICT (ma_nhom_vat_tu) DO NOTHING;

-- ---------------------------------------------------------------
-- Nhà cung cấp mẫu
-- ---------------------------------------------------------------
INSERT INTO nha_cung_cap (ma_nha_cung_cap, ten_nha_cung_cap, loai_nha_cung_cap) VALUES
  ('NCC_THIET_THACH',    'Thiết Thạch',    'Nhà thầu'),
  ('NCC_CAT_NGHI',       'Cát Nghi',       'Nhà thầu'),
  ('NCC_GOI_TIEU_CHUAN', 'Gói tiêu chuẩn', 'Nguồn tham khảo'),
  ('NCC_KHAC',           'Khác',           'Khác')
ON CONFLICT (ma_nha_cung_cap) DO NOTHING;

-- ---------------------------------------------------------------
-- Dự án mẫu
-- ---------------------------------------------------------------
INSERT INTO du_an (ma_du_an, ten_du_an, dia_chi, chu_dau_tu) VALUES
  ('DA_HMS_001', 'Nhà ở riêng lẻ Huỳnh Minh Sang', '42/4/4 Bình Chiểu, TP.HCM', 'Huỳnh Minh Sang')
ON CONFLICT (ma_du_an) DO NOTHING;

-- ---------------------------------------------------------------
-- Vật tư mẫu (52 dòng), tra id nhóm qua ma_nhom_vat_tu
-- ---------------------------------------------------------------
INSERT INTO vat_tu (ma_vat_tu, ten_vat_tu, id_nhom_vat_tu, don_vi_tinh, quy_cach)
SELECT v.ma, v.ten, n.id, v.dvt, v.quy_cach
FROM (VALUES
  -- N01 — Gạch ốp lát
  ('N01', 'VT_GACH_NEN_600',        'Gạch nền 600x600',                    'm2',     'Gạch porcelain, bề mặt matt, dùng cho nền phòng'),
  ('N01', 'VT_GACH_WC_300_600',     'Gạch nền nhà vệ sinh 300x600',        'm2',     'Gạch chống trơn, dùng cho sàn nhà vệ sinh'),
  ('N01', 'VT_GACH_OP_WC_300_600',  'Gạch ốp tường nhà vệ sinh 300x600',   'm2',     'Gạch ốp tường nhà vệ sinh'),
  ('N01', 'VT_KEO_CHA_RON',         'Keo chà ron',                         'lô',     'Dùng cho gạch trong nhà và ngoài nhà'),
  ('N01', 'VT_BAT_TRAI_NEN',        'Bạt trải nền bảo vệ gạch',            'cuộn',   'Bảo vệ nền sau khi lát'),
  -- N02 — Trần thạch cao
  ('N02', 'VT_TRAN_THACH_CAO_THUONG',   'Trần thạch cao thường',           'm2',     'Khung Vĩnh Tường, tấm Gyproc 9mm'),
  ('N02', 'VT_TRAN_THACH_CAO_CHONG_AM', 'Trần thạch cao chống ẩm',         'm2',     'Dùng cho nhà vệ sinh, ban công, lô gia'),
  ('N02', 'VT_LO_THAM_TRAN',            'Lỗ thăm trần',                    'cái',    'Nắp thăm trần 400x400 hoặc 450x450'),
  -- N03 — Sơn nước
  ('N03', 'VT_SON_TRONG_NHA',       'Sơn nước trong nhà',                  'm2',     'Bả, lót, phủ trong nhà'),
  ('N03', 'VT_SON_NGOAI_NHA',       'Sơn nước ngoài nhà',                  'm2',     'Bả, lót, phủ ngoài nhà'),
  ('N03', 'VT_SON_TRAN',            'Sơn nước trần',                       'm2',     'Sơn hoàn thiện trần'),
  ('N03', 'VT_PHU_KIEN_SON',        'Phụ kiện sơn nước',                   'gói',    'Cọ, lăn, giấy nhám, băng keo'),
  -- N04 — Cửa đi - cửa sổ
  ('N04', 'VT_CUA_CONG',            'Cửa cổng',                            'm2',     'Cửa sắt hộp hoặc mẫu theo thiết kế'),
  ('N04', 'VT_CUA_WC',              'Cửa nhà vệ sinh',                     'bộ',     'Cửa nhựa composite hoặc tương đương'),
  ('N04', 'VT_CUA_PHONG',           'Cửa đi các phòng',                    'bộ',     'Cửa nhựa composite hoặc cửa gỗ công nghiệp'),
  ('N04', 'VT_CUA_NHOM_MAT_TIEN',   'Cửa nhôm mặt tiền',                   'm2',     'Nhôm Xingfa, kính cường lực'),
  ('N04', 'VT_CUA_NHOM_TOAN_NHA',   'Cửa nhôm toàn nhà',                   'm2',     'Nhôm kính cho cửa đi, cửa sổ'),
  ('N04', 'VT_VACH_KINH_WC',        'Vách kính nhà vệ sinh',               'm2',     'Kính cường lực'),
  ('N04', 'VT_KHUNG_SAT_BAO_VE',    'Khung sắt bảo vệ cửa sổ',             'm2',     'Khung sắt bảo vệ'),
  -- N05 — Cầu thang - lan can
  ('N05', 'VT_MAT_BAC_CAU_THANG',   'Mặt bậc cầu thang',                   'bậc',    'Đá hoặc nhựa giả gỗ'),
  ('N05', 'VT_MAT_DUNG_CAU_THANG',  'Mặt dựng cầu thang',                  'm2',     'Đá trắng vân mây hoặc vật liệu tương đương'),
  ('N05', 'VT_LAN_CAN_CAU_THANG',   'Lan can cầu thang',                   'md',     'Lan can kính hoặc sắt'),
  ('N05', 'VT_TAY_VIN_CAU_THANG',   'Tay vịn cầu thang',                   'md',     'Tay vịn gỗ hoặc inox'),
  -- N06 — Đá trang trí
  ('N06', 'VT_DA_NGACH_CUA',        'Đá ngạch cửa',                        'md',     'Đá trắng vân mây hoặc granite'),
  ('N06', 'VT_DA_MAT_TIEN',         'Đá mặt tiền',                         'm2',     'Đá trang trí mặt tiền'),
  ('N06', 'VT_DA_BEP',              'Đá bếp',                              'md',     'Đá bàn bếp nếu có'),
  -- N07 — Thiết bị điện
  ('N07', 'VT_CONG_TAC_O_CAM',      'Công tắc ổ cắm',                      'cái',    'Thiết bị điện hoàn thiện'),
  ('N07', 'VT_DEN_AM_TRAN',         'Đèn âm trần',                         'cái',    'Đèn LED âm trần'),
  ('N07', 'VT_DEN_TRANG_TRI',       'Đèn trang trí',                       'cái',    'Đèn thả, đèn tường, đèn trang trí'),
  ('N07', 'VT_QUAT_HUT',            'Quạt hút',                            'cái',    'Quạt hút nhà vệ sinh'),
  ('N07', 'VT_DAY_DIEN_PHU',        'Dây điện phụ hoàn thiện',             'lô',     'Dây điện phụ phục vụ hoàn thiện'),
  -- N08 — Thiết bị vệ sinh
  ('N08', 'VT_BON_CAU',             'Bồn cầu',                             'cái',    'Thiết bị vệ sinh'),
  ('N08', 'VT_LAVABO',              'Lavabo',                              'cái',    'Chậu rửa mặt'),
  ('N08', 'VT_VOI_LAVABO',          'Vòi lavabo',                          'cái',    'Vòi rửa mặt'),
  ('N08', 'VT_SEN_TAM',             'Sen tắm',                             'bộ',     'Bộ sen tắm'),
  ('N08', 'VT_GUONG_WC',            'Gương nhà vệ sinh',                   'cái',    'Gương lavabo'),
  ('N08', 'VT_PHU_KIEN_WC',         'Phụ kiện nhà vệ sinh',                'bộ',     'Lô giấy, móc khăn, kệ'),
  -- N09 — Cấp nước - năng lượng mặt trời
  ('N09', 'VT_BON_NUOC',                'Bồn nước',                        'cái',    'Bồn nước inox hoặc nhựa'),
  ('N09', 'VT_MAY_NANG_LUONG_MAT_TROI', 'Máy năng lượng mặt trời',         'cái',    'Máy nước nóng năng lượng mặt trời'),
  ('N09', 'VT_MAY_BOM_NUOC',            'Máy bơm nước',                    'cái',    'Máy bơm nước sinh hoạt'),
  ('N09', 'VT_KHUNG_SAT_BON_NUOC',      'Khung sắt chân bồn nước',         'cái',    'Khung đỡ bồn nước'),
  ('N09', 'VT_ONG_DONG_MAY_LANH',       'Ống đồng máy lạnh',               'md',     'Ống đồng, ống thoát nước ngưng'),
  -- N10 — Điện lạnh
  ('N10', 'VT_MAY_LANH',            'Máy lạnh',                            'bộ',     'Máy lạnh treo tường hoặc âm trần'),
  ('N10', 'VT_ONG_NUOC_NGUNG',      'Ống nước ngưng máy lạnh',             'md',     'Ống thoát nước ngưng'),
  -- N11 — Mái lấy sáng
  ('N11', 'VT_MAI_LAY_SANG',        'Mái lấy sáng',                        'm2',     'Polycarbonate, kính hoặc vật liệu lấy sáng'),
  -- N12 — Cửa cuốn
  ('N12', 'VT_CUA_CUON',            'Cửa cuốn',                            'm2',     'Cửa cuốn mặt tiền hoặc gara'),
  ('N12', 'VT_MOTOR_CUA_CUON',      'Motor cửa cuốn',                      'bộ',     'Motor cửa cuốn nếu có'),
  -- N13 — Chi phí dịch vụ
  ('N13', 'VT_VAN_CHUYEN',          'Vận chuyển vật tư',                   'chuyến', 'Chi phí vận chuyển'),
  ('N13', 'VT_VAN_CHUYEN_RAC',      'Vận chuyển rác',                      'xe',     'Chi phí vận chuyển rác'),
  ('N13', 'VT_VAT_TU_PHU',          'Vật tư phụ',                          'lô',     'Vật tư phụ thi công hoàn thiện'),
  ('N13', 'VT_NHAN_CONG_LAP_DAT',   'Nhân công lắp đặt',                   'gói',    'Chi phí nhân công lắp đặt nếu tách riêng'),
  -- N14 — Khác
  ('N14', 'VT_KHAC',                'Khác',                                'lô',     'Vật tư khác chưa phân loại')
) AS v(ma_nhom, ma, ten, dvt, quy_cach)
JOIN nhom_vat_tu n ON n.ma_nhom_vat_tu = v.ma_nhom
ON CONFLICT (ma_vat_tu) DO NOTHING;
