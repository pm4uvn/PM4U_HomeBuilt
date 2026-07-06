# UI/UX — Màn hình Dashboard của Chủ Đầu Tư

Nguyên tắc thiết kế: CĐT cá nhân **không phải dân xây dựng** — dashboard phải trả lời 4 câu hỏi trong 5 giây:
1. Nhà tôi xây tới đâu rồi? 2. Sắp phải chi bao nhiêu tiền, khi nào? 3. Có gì đang chờ tôi quyết? 4. Có rủi ro gì đang cháy?

## Wireframe (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏠 Nhà phố Q.7 — 1 trệt 3 lầu    [Giai đoạn: THI CÔNG THÔ]  🔔(3)   │
├──────────────────┬──────────────────┬───────────────────────────────┤
│ TIẾN ĐỘ TỔNG     │ NGÂN SÁCH        │ ⚡ CẦN HÀNH ĐỘNG (ActionQueue) │
│   ◐ 46.5%        │ ████████░░ 82%   │ 🔴 Nghiệm thu SÀN TẦNG 2      │
│ Trễ 4 ngày       │ 2.87 / 3.5 tỷ    │    còn 14h (auto-approve 48h) │
│ (đã trừ 6 ngày   │ Thầu: 2.1 tỷ     │ 🟡 Đợt 3 HĐ Thô: 320.000.000₫ │
│  mưa hợp lệ)     │ CĐT mua: 770tr   │    đến hạn 08/07 [Chi tiết ▸] │
│                  │ Phát sinh: +85tr │ 🟡 Duyệt VO-003 nâng gạch +28tr│
├──────────────────┴──────────────────┴───────────────────────────────┤
│ GANTT CHART (9 giai đoạn)                                            │
│ Tìm thầu      ▓▓▓▓ 100%                                              │
│ Thiết kế      ▓▓▓▓▓▓ 100%                                            │
│ Xin phép XD   ▓▓▓▓ 100%                                              │
│ Ép cọc        ▓▓▓▓▓ 100%  ⛔HP✓                                      │
│ Thi công thô  ▓▓▓▓░░░░ 55%  ⛔HP: chờ nghiệm thu sàn T2              │
│ Hoàn thiện    ░░░░░░░░ 0%                                            │
│ ...            (⛔HP = Hold Point; đường dọc đỏ = hôm nay)           │
├──────────────────────────────┬───────────────────────────────────────┤
│ DÒNG TIỀN SẮP TỚI            │ RỦI RO ĐANG MỞ (Risk Log)             │
│ 08/07 Đợt 3 Thô     320tr 🟡 │ 🔴 Chờ việc máy ép cọc: ngày thứ 2    │
│ 15/07 Gạch ốp lát    95tr    │    → phạt lũy kế 8.000.000₫           │
│ 22/07 TBVS đặt cọc   40tr    │ 🟠 Cọc thử 18m / đại trà TB 15.2m     │
│ (lịch 90 ngày tới)           │    → dư ~34m cọc, xem phương án trả   │
│                              │ 🟢 Khảo sát nhà lân cận: đủ 3/3 hồ sơ │
├──────────────────────────────┴───────────────────────────────────────┤
│ NHẬT KÝ HÔM NAY: ☔ Mưa lớn 3.5h · 8 nhân công · [+ Ghi nhật ký]      │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Tree (React)

```
<OwnerDashboard projectId>
├── <ProjectHeader>            // tên, giai đoạn hiện tại, chuông Alert
├── <KpiRow>
│   ├── <ProgressGauge>        // % gia quyền + số ngày trễ SAU KHI trừ gia hạn hợp lệ
│   ├── <BudgetCard>           // planned vs actual, tách 2 dòng tiền + tổng Variation
│   └── <ActionQueue>          // hàng đợi việc CĐT phải làm, sort theo deadline
│       ├── <HoldPointItem>    // đếm ngược 48h, nút [Nghiệm thu ngay] mở camera/checklist
│       ├── <PaymentDueItem>   // netPayable từ disbursement API, nút [Xem breakdown]
│       └── <VariationApprovalItem>  // duyệt/từ chối phát sinh ngay trên dashboard
├── <GanttSection>             // frappe-gantt, badge ⛔ tại milestone isHoldPoint
├── <SplitRow>
│   ├── <UpcomingCashflow>     // merge PaymentStage(DUE/UPCOMING) + OwnerPurchase(neededByDate)
│   └── <RiskPanel>            // RiskLog OPEN/MONITORING, phạt chờ việc chạy realtime
└── <DailyLogStrip>            // thời tiết + nhân công hôm nay, quick-add từ mobile
```

## Chi tiết UX quan trọng

- **ActionQueue là trái tim màn hình** — mọi business rule đều đổ về đây dưới dạng "việc cần làm có deadline": xác nhận hold point (48h), thanh toán đợt (kèm cảnh báo *"quá hạn sẽ bị phạt 0.5%/ngày ≈ 1.6tr/ngày"* — quy đổi % thành tiền cụ thể để CĐT thấm), duyệt phát sinh.
- **Payment breakdown modal**: bấm vào đợt thanh toán hiện đúng cấu trúc `breakdown` của API — tiền gốc, VAT, cộng phát sinh, trừ giảm giá, trừ retention, trừ phạt trễ tiến độ, cộng phạt chờ việc → **Số tiền thực chuyển**. Minh bạch từng đồng, tránh cãi nhau với thầu.
- **Hold Point trên Gantt**: giai đoạn sau milestone chưa APPROVED bị làm mờ + icon khóa. Bấm vào mở flow nghiệm thu: checklist ảnh bắt buộc → ký số/OTP → tự sinh biên bản PDF lưu vào DMS.
- **Mobile-first cho 3 flow**: nghiệm thu (chụp ảnh tại công trình), ghi nhật ký (chọn thời tiết 1 chạm), chụp hóa đơn mua vật tư CĐT.
- **Màu trạng thái**: 🔴 quá hạn/phạt đang chạy · 🟡 tới hạn ≤3 ngày · 🟢 đúng tiến độ. Không dùng thuật ngữ kỹ thuật ("hold point" hiện là "Điểm dừng nghiệm thu").
