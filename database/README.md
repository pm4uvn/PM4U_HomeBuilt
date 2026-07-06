# Database — Module Vật tư hoàn thiện (PM4U HomeBuild)

Bộ SQL PostgreSQL đơn giản để quản lý **vật tư hoàn thiện** theo từng dự án xây nhà:
nhóm vật tư → danh mục vật tư chuẩn → vật tư gắn vào dự án → công việc theo dõi tiến độ từng vật tư.

## Thứ tự chạy file

Chạy đúng thứ tự sau (mỗi file chạy được nhiều lần, an toàn khi chạy lại):

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | `001_tao_bang.sql` | Tạo 6 bảng + khóa chính/ngoại + check constraint |
| 2 | `002_tao_index_trigger.sql` | Index, trigger tự cập nhật `ngay_cap_nhat`, hàm `tao_cong_viec_mau()` |
| 3 | `003_tao_view.sql` | 4 view báo cáo |
| 4 | `004_seed_du_lieu_mau.sql` | Seed 14 nhóm, 4 nhà cung cấp, 1 dự án, 52 vật tư mẫu |
| 5 | `005_bat_rls.sql` | Bật Row Level Security (chặn anon key đọc qua REST) |
| 6 | `006_lien_ket_milestone.sql` | Thêm `id_milestone` vào `vat_tu_du_an` — liên kết vật tư với mốc nghiệm thu (bảng `Milestone` của Prisma) để gợi ý ngày cần chốt/đặt/giao hàng |

Cách chạy nhanh nhất (dùng kết nối `DIRECT_URL` trong `.env`):

```bash
node scripts/run-vattu-sql.mjs --thu   # chạy thử, tự ROLLBACK, không đổi gì
node scripts/run-vattu-sql.mjs         # chạy thật
```

Hoặc dán từng file vào **Supabase Dashboard → SQL Editor** theo đúng thứ tự.

## Ý nghĩa từng bảng

| Bảng | Vai trò |
|---|---|
| `nhom_vat_tu` | Nhóm vật tư (N01 Gạch ốp lát → N14 Khác). Dùng để lọc, sắp xếp, tổng hợp. |
| `vat_tu` | **Danh mục vật tư chuẩn** — dùng lại cho mọi dự án. Lưu quy cách, đơn vị tính, 4 cột giá tham khảo (Thiết Thạch / Cát Nghi / gói chuẩn / tham khảo), nguồn mua mặc định, cờ cần chốt mẫu / cần theo dõi tiến độ. |
| `nha_cung_cap` | Nhà thầu / nhà cung cấp / nguồn giá tham khảo. |
| `du_an` | Từng công trình (mã, tên, địa chỉ, chủ đầu tư, ngày khởi công...). |
| `vat_tu_du_an` | **Bảng nghiệp vụ chính**: vật tư nào dùng cho dự án nào — khối lượng, đơn giá, thành tiền, người mua, 4 trạng thái (chốt mẫu / đặt hàng / giao hàng / thi công), mốc ngày kế hoạch và thực tế. |
| `cong_viec_vat_tu` | Việc chi tiết của từng vật tư trong dự án (7 bước: Chốt mẫu → Duyệt giá → Đặt hàng → Giao hàng → Kiểm tra → Thi công → Nghiệm thu). |

Quy ước chung cho mọi bảng:

- Khóa chính `BIGSERIAL`, tên bảng/cột tiếng Việt không dấu, snake_case.
- `ngay_tao`, `ngay_cap_nhat` tự động (trigger cập nhật `ngay_cap_nhat` khi UPDATE).
- **Không xóa cứng** — đổi `trang_thai` sang `tam_an` / `ngung_dung` để ẩn.

## Các view

| View | Trả lời câu hỏi |
|---|---|
| `v_danh_sach_vat_tu` | Danh mục vật tư đầy đủ kèm tên nhóm và các giá tham khảo. |
| `v_vat_tu_du_an` | Dự án X dùng những vật tư gì, khối lượng/giá/trạng thái ra sao. `thanh_tien_*_tinh_toan` = số nhập tay, nếu trống thì tự nhân khối lượng × đơn giá. |
| `v_tien_do_vat_tu` | Từng công việc của từng vật tư đang ở bước nào, **trễ bao nhiêu ngày** (`so_ngay_tre` tự tính so với hôm nay; đã hoàn thành thì = 0). |
| `v_tong_hop_chi_phi_vat_tu_du_an` | Mỗi dự án: tổng dự kiến, tổng chốt, chênh lệch, số vật tư đã chốt mẫu / đã đặt / đã giao / đã nghiệm thu. |

## Cách import từ Excel (`HomeBuild_PM_vat_tu_hoan_thien_tieng_viet.xlsx`)

1. **Sheet `Nhom_vat_tu` → bảng `nhom_vat_tu`**: seed đã có sẵn N01–N14; chỉ import nếu bạn thêm nhóm mới. Cột khớp: `ma_nhom_vat_tu`, `ma_nhom_ky_thuat`, `ten_nhom_vat_tu`, `thu_tu`.
2. **Sheet `Nhap_du_lieu` → bảng `vat_tu`**: mỗi dòng 1 vật tư. Cột bắt buộc: `ma_vat_tu` (duy nhất), `ten_vat_tu`, mã nhóm (tra ra `id_nhom_vat_tu`). Các cột giá điền vào `don_gia_thiet_thach` / `don_gia_cat_nghi` / `don_gia_goi_chuan` / `don_gia_tham_khao` (sheet `Dong_bao_gia`, `Goi_chuan_2950` là nguồn để đối chiếu các cột giá này).
3. **Khi làm công trình mới**: tạo 1 dòng `du_an`, rồi chọn vật tư từ `vat_tu` thêm vào `vat_tu_du_an` (kèm khu vực sử dụng, khối lượng, đơn giá dự kiến).
4. **Nếu cần theo dõi chi tiết tiến độ** (sheet `Mau_tien_do`): với mỗi dòng `vat_tu_du_an` vừa tạo, gọi hàm để sinh 7 công việc mẫu:

   ```sql
   SELECT tao_cong_viec_mau(id_cua_dong_vat_tu_du_an);
   -- hoặc sinh cho toàn bộ vật tư của 1 dự án:
   SELECT tao_cong_viec_mau(id) FROM vat_tu_du_an WHERE id_du_an = 1;
   ```

   Hàm tự bỏ qua công việc đã tồn tại nên gọi lại không bị trùng.

Cách import trong Supabase: **Table Editor → chọn bảng → Insert → Import data from CSV** (xuất sheet Excel ra CSV trước, giữ đúng tên cột).

## Vì sao chưa tách bảng `bao_gia`, `bao_gia_chi_tiet`, `don_gia_vat_tu`?

Ở giai đoạn MVP, mỗi vật tư chỉ cần **so sánh vài nguồn giá cố định** (Thiết Thạch, Cát Nghi, gói tiêu chuẩn) → 4 cột giá ngay trên `vat_tu` là đủ, nhập từ Excel cực nhanh, xem 1 dòng thấy hết. Tách bảng báo giá riêng chỉ đáng làm khi:

- một vật tư có **nhiều hơn ~4 nguồn giá** hoặc giá thay đổi theo thời gian cần lưu lịch sử,
- cần quản lý **từng đợt báo giá** (ngày báo, hiệu lực, file đính kèm, người báo).

Khi chưa tới nhu cầu đó, tách sớm chỉ làm việc nhập liệu và truy vấn phức tạp lên.

## Hướng mở rộng sau này (khi cần)

- `bao_gia` — mỗi đợt báo giá của 1 nhà cung cấp (ngày báo, hiệu lực, ghi chú, file).
- `bao_gia_chi_tiet` — từng dòng vật tư + đơn giá trong 1 đợt báo giá.
- `quy_cach_vat_tu` — tách quy cách thành thuộc tính có cấu trúc (kích thước, màu, bề mặt...) thay vì text tự do.
- `lich_su_trang_thai_vat_tu` — log mỗi lần đổi trạng thái của `vat_tu_du_an` (ai đổi, lúc nào, từ → sang) phục vụ truy vết.

Cả 4 bảng trên đều gắn vào khung hiện tại bằng khóa ngoại, không phải sửa lại cấu trúc cũ.

## Lưu ý khi dùng chung với Prisma của app

Các bảng vật tư ban đầu được tạo bằng SQL thuần (001–006), ngoài lịch sử Prisma Migrate, nên từng gây **drift** khi chạy `npx prisma migrate dev`. Đã xử lý dứt điểm ngày 05/07/2026: baseline toàn bộ cấu trúc (001, 002, 003, 005, 006 — không gồm seed data 004) vào migration `20260705000000_baseline_vattu_module`, đánh dấu `--applied` để khớp với DB thật, rồi migrate tiếp bình thường. Từ nay `npx prisma migrate dev` chạy sạch, không còn cảnh báo drift cho các bảng này. Nếu sau này chỉnh cấu trúc bảng vật tư, **sửa qua Prisma schema + `migrate dev` như bình thường**, không cần quay lại SQL thuần nữa.
