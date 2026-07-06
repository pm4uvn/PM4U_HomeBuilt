import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState } from "@/components/ui";
import { fmtVND } from "@/lib/format";
import { MaterialsTabs } from "./MaterialsTabs";
import {
  AddVatTuDuAnForm, BudgetAllocationChart, MaterialsGroupedList, type VatTuDuAnRow,
  type CatalogItemForForm, type NccOption, type NhomTong, type MilestoneOption,
} from "./forms";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  await requireUser();

  const [duAn, project] = await Promise.all([
    prisma.duAn.findFirst({ orderBy: { id: "asc" } }),
    getDefaultProject(),
  ]);
  if (!duAn) {
    return (
      <Card>
        <EmptyState title="Chưa có dự án vật tư" sub="Chạy database/004_seed_du_lieu_mau.sql để tạo dự án mẫu" />
      </Card>
    );
  }

  const [vatTuDuAnList, catalogList, nccList, phases] = await Promise.all([
    prisma.vatTuDuAn.findMany({
      where: { idDuAn: duAn.id },
      include: {
        vatTu: { include: { nhom: true } },
        nhaCungCap: true,
        milestone: true,
        congViec: { orderBy: { thuTu: "asc" } },
      },
      orderBy: [{ vatTu: { nhom: { thuTu: "asc" } } }, { id: "asc" }],
    }),
    prisma.vatTu.findMany({
      where: { trangThai: "dang_dung" },
      include: { nhom: true },
      orderBy: [{ nhom: { thuTu: "asc" } }, { maVatTu: "asc" }],
    }),
    prisma.nhaCungCapVatTu.findMany({ where: { trangThai: "dang_dung" }, orderBy: { tenNhaCungCap: "asc" } }),
    project
      ? prisma.phase.findMany({
          where: { projectId: project.id },
          orderBy: { sortOrder: "asc" },
          include: { milestones: { orderBy: { plannedDate: "asc" } } },
        })
      : Promise.resolve([]),
  ]);

  const milestoneOptions: MilestoneOption[] = phases.flatMap((p) =>
    p.milestones.map((m) => ({
      id: m.id,
      name: m.name,
      phaseName: p.name,
      plannedDate: m.plannedDate?.toISOString() ?? null,
    })),
  );

  const rows: VatTuDuAnRow[] = vatTuDuAnList.map((r) => ({
    id: r.id.toString(),
    maVatTu: r.vatTu.maVatTu,
    tenVatTu: r.vatTu.tenVatTu,
    tenNhomVatTu: r.vatTu.nhom.tenNhomVatTu,
    khuVucSuDung: r.khuVucSuDung,
    khoiLuongDuKien: r.khoiLuongDuKien ? Number(r.khoiLuongDuKien) : null,
    khoiLuongThucTe: r.khoiLuongThucTe ? Number(r.khoiLuongThucTe) : null,
    donViTinh: r.donViTinh ?? r.vatTu.donViTinh,
    donGiaDuKien: r.donGiaDuKien ? Number(r.donGiaDuKien) : null,
    donGiaChot: r.donGiaChot ? Number(r.donGiaChot) : null,
    thanhTienDuKien: r.thanhTienDuKien
      ? Number(r.thanhTienDuKien)
      : r.khoiLuongDuKien && r.donGiaDuKien
        ? Number(r.khoiLuongDuKien) * Number(r.donGiaDuKien)
        : null,
    thanhTienChot: r.thanhTienChot
      ? Number(r.thanhTienChot)
      : r.khoiLuongThucTe && r.donGiaChot
        ? Number(r.khoiLuongThucTe) * Number(r.donGiaChot)
        : null,
    nguoiMua: r.nguoiMua,
    trangThaiChotMau: r.trangThaiChotMau,
    trangThaiDatHang: r.trangThaiDatHang,
    trangThaiGiaoHang: r.trangThaiGiaoHang,
    trangThaiThiCong: r.trangThaiThiCong,
    ngayCanChotMau: r.ngayCanChotMau?.toISOString() ?? null,
    ngayCanDatHang: r.ngayCanDatHang?.toISOString() ?? null,
    ngayCanGiaoHang: r.ngayCanGiaoHang?.toISOString() ?? null,
    ngayCanThiCong: r.ngayCanThiCong?.toISOString() ?? null,
    ghiChu: r.ghiChu,
    nhaCungCap: r.nhaCungCap ? { id: r.nhaCungCap.id.toString(), tenNhaCungCap: r.nhaCungCap.tenNhaCungCap } : null,
    milestone: r.milestone
      ? { id: r.milestone.id, name: r.milestone.name, plannedDate: r.milestone.plannedDate?.toISOString() ?? null }
      : null,
    congViec: r.congViec.map((c) => ({ id: c.id.toString(), tenCongViec: c.tenCongViec, trangThai: c.trangThai })),
  }));

  const catalog: CatalogItemForForm[] = catalogList.map((v) => ({
    id: v.id.toString(),
    maVatTu: v.maVatTu,
    tenVatTu: v.tenVatTu,
    tenNhomVatTu: v.nhom.tenNhomVatTu,
    donViTinh: v.donViTinh,
    donGiaThamKhao: v.donGiaThamKhao ? Number(v.donGiaThamKhao) : null,
  }));

  const nccOptions: NccOption[] = nccList.map((n) => ({ id: n.id.toString(), tenNhaCungCap: n.tenNhaCungCap }));

  const tongDuKien = rows.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
  const tongChot = rows.reduce((s, r) => s + (r.thanhTienChot ?? 0), 0);

  // Phát sinh: chỉ so sánh dự kiến vs chốt của CÙNG các vật tư đã chốt giá — so cả tổng dự kiến
  // (gồm cả vật tư chưa mua) sẽ luôn ra âm giả tạo, không phản ánh đúng biến động giá thực tế
  const rowsDaChot = rows.filter((r) => r.thanhTienChot != null);
  const duKienCuaCacMucDaChot = rowsDaChot.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
  const chotCuaCacMucDaChot = rowsDaChot.reduce((s, r) => s + (r.thanhTienChot ?? 0), 0);
  const phatSinh = chotCuaCacMucDaChot - duKienCuaCacMucDaChot;
  const phatSinhPct = duKienCuaCacMucDaChot > 0 ? (phatSinh / duKienCuaCacMucDaChot) * 100 : 0;

  const soDaChotMau = rows.filter((r) => r.trangThaiChotMau === "da_chot").length;
  const soDaDat = rows.filter((r) => ["da_dat", "da_mua"].includes(r.trangThaiDatHang)).length;
  const soDaGiao = rows.filter((r) => r.trangThaiGiaoHang === "da_giao").length;
  const soDaNghiemThu = rows.filter((r) => r.trangThaiThiCong === "da_nghiem_thu").length;

  const groups = [...new Set(rows.map((r) => r.tenNhomVatTu))];

  const groupTotals: NhomTong[] = groups
    .map((g) => {
      const groupRows = rows.filter((r) => r.tenNhomVatTu === g);
      return {
        group: g,
        total: groupRows.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0),
        count: groupRows.length,
      };
    })
    .sort((a, b) => b.total - a.total);
  const topNhom = groupTotals.slice(0, 3);

  return (
    <div className="space-y-3">
      <MaterialsTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🧱 Vật tư — {duAn.tenDuAn}</h1>
        <div className="ml-auto">
          <AddVatTuDuAnForm
            idDuAn={duAn.id.toString()}
            catalog={catalog}
            nccOptions={nccOptions}
            milestones={milestoneOptions}
          />
        </div>
      </header>

      <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-2">
        <Card title="Tổng dự kiến">
          <p className="text-lg font-bold money">{fmtVND(tongDuKien)}</p>
        </Card>
        <Card title="Tổng đã chốt">
          <p className="text-lg font-bold money">{fmtVND(tongChot)}</p>
        </Card>
        <Card title="Phát sinh so với dự kiến">
          {rowsDaChot.length === 0 ? (
            <p className="text-lg font-bold text-muted">—</p>
          ) : (
            <>
              <p
                className="text-lg font-bold money"
                style={{ color: phatSinh > 0 ? "var(--critical)" : phatSinh < 0 ? "var(--good-text)" : undefined }}
              >
                {phatSinh > 0 ? "+" : ""}{fmtVND(phatSinh)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {phatSinhPct > 0 ? "+" : ""}{phatSinhPct.toFixed(1)}% · {rowsDaChot.length} vật tư đã chốt
              </p>
            </>
          )}
        </Card>
        <Card title="Đã chốt mẫu / đặt hàng">
          <p className="text-lg font-bold">{soDaChotMau} / {soDaDat} <span className="text-sm text-muted">/ {rows.length}</span></p>
        </Card>
        <Card title="Đã giao / nghiệm thu">
          <p className="text-lg font-bold">{soDaGiao} / {soDaNghiemThu} <span className="text-sm text-muted">/ {rows.length}</span></p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title="Chưa có vật tư nào trong dự án" sub="Bấm “+ Thêm vật tư” để chọn từ danh mục chuẩn" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
            {topNhom.map((n, i) => (
              <Card key={n.group} title={`#${i + 1} nhóm chi phí cao nhất`}>
                <p className="font-bold text-[14px]">{n.group}</p>
                <p className="money text-lg font-bold mt-0.5">{fmtVND(n.total)}</p>
                <p className="text-xs text-muted mt-0.5">
                  {tongDuKien > 0 ? ((n.total / tongDuKien) * 100).toFixed(1) : "0"}% tổng dự kiến · {n.count} vật tư
                </p>
              </Card>
            ))}
          </div>

          <Card title="Phân bổ chi phí dự kiến theo nhóm vật tư">
            <BudgetAllocationChart data={groupTotals} totalSum={tongDuKien} />
          </Card>

          <MaterialsGroupedList rows={rows} nccOptions={nccOptions} milestoneOptions={milestoneOptions} />
        </>
      )}
    </div>
  );
}
