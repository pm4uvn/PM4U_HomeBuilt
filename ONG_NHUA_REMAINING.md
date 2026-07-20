# Mục 20. ỐNG NHỰA — Tình trạng & việc còn lại

## Đã lưu vào database (Supabase, đã xác nhận qua query trực tiếp)

Group `MaterialPriceGroup` code `"20"` = "Ống nhựa", 3 nhà cung cấp:

| Nhà cung cấp | Số dòng đã seed | Trạng thái |
|---|---|---|
| Công ty CP Nhựa Thiếu Niên Tiền Phong Phía Nam | 57 | ✅ Xong hoàn toàn |
| Công ty TNHH Nhựa Đạt Hòa | 671 | ✅ Xong hoàn toàn (57 trang PDF, đã đọc hết) |
| Công ty CP Nhựa Châu Âu Xanh | 231 | ⏳ **Dở dang** — đã đọc xong STT 1–231 (3/5 phần file tách), còn thiếu STT 232 trở đi |

Tất cả các dòng trên **đã lưu thật vào Postgres** (không phải chỉ có trong file/script tạm) — có thể xác nhận lại bất kỳ lúc nào bằng:
```ts
await prisma.materialPriceGroup.findUnique({ where: { code: "20" }, include: { listings: { include: { supplier: true, _count: { select: { items: true } } } } } });
```

## Việc còn lại: Châu Âu Xanh, STT 232 trở đi

Nguồn: `BẢNG GIÁ/BẢNG GIÁ/20. ỐNG NHỰA/CTY NHỰA CHÂU ÂU XANH - giữ giá/CHAU AU XANH_0001.pdf` (37 trang gốc)

File đã được tách sẵn thành 5 phần nhỏ (mỗi phần ≤8 trang để đọc được, do giới hạn 20MB/lần đọc PDF) bằng script:
```python
import fitz
doc = fitz.open('BẢNG GIÁ/BẢNG GIÁ/20. ỐNG NHỰA/CTY NHỰA CHÂU ÂU XANH - giữ giá/CHAU AU XANH_0001.pdf')
for i in range(0, doc.page_count, 8):
    out = fitz.open()
    end = min(i+7, doc.page_count-1)
    out.insert_pdf(doc, from_page=i, to_page=end)
    out.save(f'cax_part_{i//8+1}.pdf')
```

**2 file đã tách sẵn còn lại trong thư mục dự án** (chưa đọc):
- `cax_part_4.pdf` (8 trang, trang 25–32 của file gốc, tiếp theo từ STT ~232)
- `cax_part_5.pdf` (5 trang cuối, trang 33–37 của file gốc)

Nếu 2 file này đã bị xóa, chạy lại đoạn Python ở trên để tách lại.

## Cách tiếp tục (cho phiên làm việc sau)

1. Đọc `cax_part_4.pdf` bằng tool Read (đây là bảng "Vật tư ngành nước" định dạng chuẩn: STT tăng dần, cột giá "Khu vực TP.HCM" ghi rõ nhãn, cột % chênh lệch — cùng format với 3 phần đã đọc trước, tiếp tục từ Ống HDPE D25/D32 PN16 trở đi).
2. Transcribe từng dòng (tên, đơn vị, giá, %) theo đúng mẫu code trong các file `seed_cax*.mts` đã dùng trước đó trong phiên này (đã xóa sau khi chạy — mẫu cấu trúc: query `supplier`/`listing` đã có bằng `findFirstOrThrow({ where: { name: "Công ty Cổ phần Nhựa Châu Âu Xanh" } })`, rồi `prisma.materialPriceItem.create` cho từng dòng với `regionPrices: { create: [{ region: "TP.HCM", unitPrice, changePct }] }`).
3. Chạy script, xác nhận số dòng seed đúng kỳ vọng.
4. Đọc tiếp `cax_part_5.pdf`, lặp lại.
5. Sau khi xong, xóa 2 file `cax_part_4.pdf` / `cax_part_5.pdf` và file `.mts` tạm, chạy `npx next build` để xác nhận không lỗi, rồi báo cáo tổng số dòng cuối cùng của Châu Âu Xanh.

## Lưu ý về độ tin cậy đã áp dụng trong phiên này

- Format Châu Âu Xanh dễ đọc hơn nhiều so với Đạt Hòa (STT tăng dần, không bị đảo ngược) — độ tin cậy transcription cao.
- Một vài dòng ở ranh giới trang có đánh số trùng nhau nhẹ (VD "Măng sông uPVC D110 PN8" xuất hiện 2 lần với giá khác nhau) — đã xử lý bằng cách thêm hậu tố `(1)`/`(2)` để phân biệt, không làm mất dữ liệu giá thật.
- Toàn bộ giá đều thuộc khu vực **TP.HCM** (cột được ghi rõ nhãn trong bảng gốc).

## Sau khi xong toàn bộ "20. ỐNG NHỰA"

Nhóm vật liệu tiếp theo trong danh sách gốc (`BẢNG GIÁ/BẢNG GIÁ/`) chưa làm: **21. BÓNG ĐÈN VÀ PHỤ KIỆN ĐIỆN** trở đi (22. CỬA, 23. KÍNH XÂY DỰNG, 24. MÀNG PHẢN QUANG, 25. VẬT LIỆU VÀ CẤU KIỆN KHÁC).
