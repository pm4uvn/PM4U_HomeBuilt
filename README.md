# PM4U HomeBuild

SaaS quản lý vòng đời xây dựng nhà phố/biệt thự cho Chủ Đầu Tư cá nhân (Việt Nam) — đóng vai trò "Giám đốc dự án bỏ túi".

## Tech Stack đề xuất

| Tầng | Công nghệ | Lý do chọn |
|---|---|---|
| Web Frontend | **Next.js 15 + TypeScript + TailwindCSS + shadcn/ui** | SSR cho dashboard nặng dữ liệu, hệ sinh thái component lớn, dễ tuyển dev VN |
| Mobile | **React Native (Expo)** | Tái sử dụng types/logic với web; CĐT chủ yếu thao tác nghiệm thu/chụp ảnh trên điện thoại |
| Backend | **NestJS (Node.js + TypeScript)** | Kiến trúc module khớp với 5 module nghiệp vụ; DI thuận tiện cho rule engine phạt/giảm trừ |
| ORM + DB | **Prisma + PostgreSQL** | Dữ liệu tiền tệ & quan hệ phức tạp (HĐ ↔ đợt thanh toán ↔ milestone ↔ phạt) bắt buộc dùng RDBMS có transaction + constraint. Tiền lưu `Decimal(18,0)` VND |
| Job/Cron | **BullMQ + Redis** | Nhắc hạn thanh toán, đếm ngày phạt chờ việc, deadline hold-point 48h |
| File Storage | **S3-compatible (Cloudflare R2)** | Ảnh/video khảo sát nhà hàng xóm, bản vẽ PDF, nhật ký công trình |
| Notification | **Zalo ZNS + Email + Push (FCM)** | Zalo là kênh xác nhận nghiệm thu thực tế tại VN (rule 48h) |
| Gantt Chart | **frappe-gantt / vis-timeline** | Nhẹ, đủ cho 8–10 giai đoạn của 1 căn nhà |

## Chạy app

```bash
npm install
npm run dev          # http://localhost:3000
```

Yêu cầu file `.env` có: `DATABASE_URL`, `DIRECT_URL` (Postgres pooler của Supabase),
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, và `SUPABASE_SERVICE_KEY`
(secret key — cần cho tạo user và upload hồ sơ).

### Scripts

```bash
node scripts/create-user.mjs <email> <password>  # tạo tài khoản đăng nhập (cần service key)
node scripts/seed.mjs [--force]                  # seed dữ liệu mẫu dự án HenryHouse
node scripts/enable-rls.mjs                      # bật Row Level Security toàn bộ bảng
node scripts/check-db.mjs                        # kiểm tra kết nối + đếm bảng
npm run db:migrate                               # Prisma migration khi đổi schema
```

## Kiến trúc

- **Next.js 16 App Router** — Server Components đọc dữ liệu qua tầng service (Prisma),
  Server Actions ghi dữ liệu (backend chạy server-side, browser không chạm CSDL).
- **Prisma 7 + PostgreSQL (Supabase)** — schema 21 bảng tại [prisma/schema.prisma](prisma/schema.prisma);
  runtime qua driver adapter `pg` ([src/lib/prisma.ts](src/lib/prisma.ts)).
- **Supabase Auth** (@supabase/ssr, cookie) — `middleware.ts` chặn mọi route khi chưa đăng nhập; RLS bật trên toàn bộ bảng.
- **Business rules compute-on-read** — auto-approve hold point quá 48h, chuyển đợt thanh toán
  DUE→OVERDUE, sinh cảnh báo — chạy trong [src/services/](src/services/) mỗi lần mở Dashboard.
- **REST mẫu cho mobile**: `GET /api/projects/:id/disbursement`.

```
src/
  app/(app)/            # Dashboard, contracts, cashflow, schedule, risks, documents
  app/login/            # Đăng nhập Supabase Auth
  services/             # disbursement, milestone, alert, budget, dashboard
  lib/                  # prisma, supabase, auth, storage, format, labels
docs/ui-dashboard.md    # Thiết kế UI/UX gốc
docs/static-dashboard-reference.html  # Bản dashboard tĩnh tham khảo
```

## 5 Module nghiệp vụ

1. **Contract & Vendors** — nhiều nhà thầu/dự án, số hóa HĐ, rule engine: giảm trừ có điều kiện (miễn phí thiết kế khi ký HĐ thi công), phạt trễ tiến độ 0.05%/ngày, phạt CĐT chậm thanh toán 0.5%/ngày, phạt hủy ngang 8% giá trị HĐ (trần theo Điều 301 Luật Thương mại), phạt vật tư giả 8% giá trị vật tư.
2. **Cash Flow & Budget** — tách 2 dòng tiền: trả nhà thầu theo đợt HĐ vs. hạng mục CĐT tự cung cấp (gạch, TBVS, điện máy, nội thất rời); Phiếu yêu cầu thay đổi (Variation ± chi phí, ± ngày).
3. **Schedule & Milestones** — Gantt 9 giai đoạn; **Hold Point**: chưa có biên bản nghiệm thu (hoặc xác nhận App/Zalo trong 48h) thì khóa giai đoạn sau; Nhật ký công trình ghi nhân công + thời tiết để tính gia hạn hợp lệ.
4. **Risk Management** — khảo sát hiện trạng nhà lân cận trước ép cọc, cảnh báo chướng ngại vật ngầm, tracker phạt chờ việc (vd 4 triệu/ngày dàn ép cọc), đối soát cọc ép thử vs đại trà.
5. **Document Control** — DMS theo tag + metadata bản vẽ xin phép (cốt nền, khoảng lùi, DT sàn, tum), kỹ thuật, 3D nội thất, hoàn công.
