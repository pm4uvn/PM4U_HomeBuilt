// Cập nhật điều khoản phạt đúng theo hợp đồng thật (Thiết Thạch — thi công phần thô & nhân công
// hoàn thiện, Tiến Lộc — thi công ép cọc), do CĐT cung cấp nguyên văn điều khoản.
// Chạy thử (rollback): node scripts/update-penalty-rules-real.mjs --thu
// Chạy thật:            node scripts/update-penalty-rules-real.mjs

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const isDryRun = process.argv.includes("--thu");

async function run() {
  const thietThach = await prisma.contract.findFirstOrThrow({ where: { code: "HĐ_TC01" } });
  const tienLoc = await prisma.contract.findFirstOrThrow({ where: { code: "290626/HĐTC" } });
  console.log("Thiết Thạch:", thietThach.id, "| Tiến Lộc:", tienLoc.id);

  await prisma.$transaction(async (tx) => {
    // ===== Thiết Thạch (HĐ_TC01) =====
    const existing = await tx.penaltyRule.findMany({ where: { contractId: thietThach.id } });
    const byTypeRate = (type, rate) => existing.find((r) => r.type === type && Number(r.rate) === rate);

    // 1. Thầu trễ tiến độ: 0.05%/ngày, trần 8%, ân hạn 10 ngày làm việc kể từ ngày ấn định bàn giao
    const r1 = byTypeRate("CONTRACTOR_LATE_PROGRESS", 0.05);
    await tx.penaltyRule.update({ where: { id: r1.id }, data: { graceDays: 10 } });

    // 2. Vật tư giả/nhái: 8% giá trị vật tư vi phạm — đã đúng, không đổi
    const r2 = byTypeRate("FAKE_MATERIAL", 8);
    void r2;

    // 3. CĐT chậm thanh toán: SỬA rate 0.5 -> đúng 0.05%/ngày theo hợp đồng thật
    const r3 = existing.find((r) => r.type === "OWNER_LATE_PAYMENT");
    await tx.penaltyRule.update({ where: { id: r3.id }, data: { rate: 0.05 } });

    // 4. (từng là TERMINATION/EITHER rate 8) -> Nhà thầu vi phạm dẫn đến chấm dứt HĐ sau khởi công: 8%, bên Nhà thầu
    const r4 = byTypeRate("TERMINATION", 8);
    await tx.penaltyRule.update({
      where: { id: r4.id },
      data: { type: "CUSTOM", label: "Nhà thầu vi phạm dẫn đến chấm dứt HĐ sau khởi công", party: "CONTRACTOR" },
    });

    // 5. (từng là TERMINATION/EITHER rate 5) -> CĐT đơn phương chấm dứt HĐ TRƯỚC khởi công: 5% + phí thiết kế (nếu có), bên CĐT
    const r5 = byTypeRate("TERMINATION", 5);
    await tx.penaltyRule.update({
      where: { id: r5.id },
      data: { type: "CUSTOM", label: "CĐT đơn phương chấm dứt HĐ trước khởi công (+ phí thiết kế nếu có)", party: "OWNER" },
    });

    // 6. MỚI: CĐT đơn phương chấm dứt HĐ SAU khởi công: 8% (+ thanh toán khối lượng đã làm), bên CĐT
    await tx.penaltyRule.create({
      data: {
        contractId: thietThach.id, type: "CUSTOM",
        label: "CĐT đơn phương chấm dứt HĐ sau khởi công (+ thanh toán khối lượng đã làm)",
        party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 8, graceDays: 0,
      },
    });

    // 7. MỚI: CĐT không bàn giao mặt bằng thi công quá 20 ngày kể từ ngày khởi công: 5% (chi phí quản lý)
    await tx.penaltyRule.create({
      data: {
        contractId: thietThach.id, type: "CUSTOM",
        label: "CĐT không bàn giao mặt bằng thi công (quá 20 ngày từ khởi công)",
        party: "OWNER", basis: "PCT_OF_CONTRACT", rate: 5, graceDays: 20,
      },
    });

    // 8. MỚI: Vi phạm bảo mật thông tin dự án — 2% giá trị HĐ mỗi lần vi phạm, áp dụng cả 2 bên
    await tx.penaltyRule.create({
      data: {
        contractId: thietThach.id, type: "CUSTOM",
        label: "Vi phạm bảo mật thông tin dự án (mỗi lần vi phạm)",
        party: "EITHER", basis: "PCT_OF_CONTRACT", rate: 2, graceDays: 0,
      },
    });

    // ===== Tiến Lộc (290626/HĐTC) — hiện chưa có điều khoản nào, tạo mới toàn bộ =====
    // 1. Phạt chờ việc: 4.000.000đ/ngày chờ/1 dàn máy (khớp đúng preset chuẩn OWNER_IDLE_WAIT)
    await tx.penaltyRule.create({
      data: { contractId: tienLoc.id, type: "OWNER_IDLE_WAIT", party: "OWNER", basis: "FIXED_PER_DAY", rate: 4_000_000, graceDays: 0 },
    });

    // 2. Phạt hủy thi công: bồi thường vận chuyển 30.000.000đ (1 lần, chưa gồm khối lượng cọc đã chở tính riêng)
    await tx.penaltyRule.create({
      data: {
        contractId: tienLoc.id, type: "CUSTOM",
        label: "CĐT hủy thi công sau khi đã chuyển máy/cọc xuống công trình (bồi thường vận chuyển, chưa gồm khối lượng cọc đã chở)",
        party: "OWNER", basis: "FIXED_ONE_TIME", rate: 30_000_000, graceDays: 0,
      },
    });

    // 3. CĐT chậm thanh toán: 0.5%/ngày, thanh toán trong 2 ngày kể từ khi ép xong, phạt tối đa 5 ngày
    //    (=> capPct suy ra 0.5% x 5 ngày = 2.5%, graceDays = 2 ngày được phép thanh toán trước khi tính phạt)
    await tx.penaltyRule.create({
      data: {
        contractId: tienLoc.id, type: "OWNER_LATE_PAYMENT", party: "OWNER",
        basis: "PCT_OF_CONTRACT_PER_DAY", rate: 0.5, capPct: 2.5, graceDays: 2,
      },
    });

    // 4. Nhà thầu vi phạm cam kết kỹ thuật/an toàn/chất lượng: tối đa 10% giá trị HĐ
    await tx.penaltyRule.create({
      data: {
        contractId: tienLoc.id, type: "CUSTOM",
        label: "Nhà thầu vi phạm cam kết kỹ thuật/an toàn/chất lượng (tối đa)",
        party: "CONTRACTOR", basis: "PCT_OF_CONTRACT", rate: 10, graceDays: 0,
      },
    });

    if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");
  }).catch((e) => {
    if (isDryRun) console.log("--thu: đã rollback, không ghi thật.");
    else throw e;
  });

  if (!isDryRun) {
    for (const contractId of [thietThach.id, tienLoc.id]) {
      const rules = await prisma.penaltyRule.findMany({ where: { contractId } });
      console.log(`\n=== ${contractId} — ${rules.length} điều khoản ===`);
      for (const r of rules) {
        console.log(`  ${r.type} (${r.label ?? "-"}) party=${r.party} basis=${r.basis} rate=${r.rate} capPct=${r.capPct} graceDays=${r.graceDays}`);
      }
    }
  }
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
