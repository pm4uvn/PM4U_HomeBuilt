import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProject } from "@/services/dashboard.service";
import { Card, EmptyState } from "@/components/ui";
import { fmtVND } from "@/lib/format";
import { EquipmentTabs } from "./EquipmentTabs";
import {
  AddThietBiDuAnForm, AutoSuggestEquipmentButton, EquipmentBudgetChart, EquipmentGroupedList, type ThietBiDuAnRow,
  type CatalogItemForForm, type NccOption, type NhomTong, type MilestoneOption,
} from "./forms";
import { sumRoomCounts, buildEquipmentSuggestions } from "@/lib/equipment-suggestions";

export const dynamic = "force-dynamic";

export default async function EquipmentProjectPage() {
  await requireUser();

  const [duAn, project] = await Promise.all([
    prisma.duAn.findFirst({ orderBy: { id: "asc" } }),
    getDefaultProject(),
  ]);
  if (!duAn) {
    return (
      <Card>
        <EmptyState title="Chưa có dự án vật tư/thiết bị" sub="Chạy database/004_seed_du_lieu_mau.sql để tạo dự án mẫu" />
      </Card>
    );
  }

  const [thietBiDuAnList, catalogList, nccList, phases, charter] = await Promise.all([
    prisma.thietBiDuAn.findMany({
      where: { idDuAn: duAn.id },
      include: {
        thietBi: true,
        nhaCungCap: true,
        milestone: true,
        congViec: { orderBy: { thuTu: "asc" } },
      },
      orderBy: [{ thietBi: { maNhom: "asc" } }, { id: "asc" }],
    }),
    prisma.thietBi.findMany({
      where: { trangThai: "dang_su_dung" },
      orderBy: [{ maNhom: "asc" }, { maDanhMuc: "asc" }],
    }),
    prisma.nhaCungCapVatTu.findMany({ where: { trangThai: "dang_dung" }, orderBy: { tenNhaCungCap: "asc" } }),
    project
      ? prisma.phase.findMany({
          where: { projectId: project.id },
          orderBy: { sortOrder: "asc" },
          include: { milestones: { orderBy: { plannedDate: "asc" } } },
        })
      : Promise.resolve([]),
    project
      ? prisma.projectCharter.findUnique({ where: { projectId: project.id }, include: { floorPlans: true } })
      : Promise.resolve(null),
  ]);

  const addedThietBiIds = new Set(thietBiDuAnList.map((r) => r.idThietBi));
  const suggestions = charter
    ? buildEquipmentSuggestions(
        sumRoomCounts(charter.floorPlans),
        catalogList.map((t) => ({
          id: t.id,
          tenHangMuc: t.tenHangMuc,
          donViTinh: t.donViTinh,
          giaThap: t.giaThap ? Number(t.giaThap) : null,
          giaTrungBinh: t.giaTrungBinh ? Number(t.giaTrungBinh) : null,
          giaCao: t.giaCao ? Number(t.giaCao) : null,
        })),
        addedThietBiIds,
      )
    : [];

  const milestoneOptions: MilestoneOption[] = phases.flatMap((p) =>
    p.milestones.map((m) => ({
      id: m.id,
      name: m.name,
      phaseName: p.name,
      plannedDate: m.plannedDate?.toISOString() ?? null,
    })),
  );

  const rows: ThietBiDuAnRow[] = thietBiDuAnList.map((r) => ({
    id: r.id,
    maDanhMuc: r.thietBi.maDanhMuc,
    tenHangMuc: r.thietBi.tenHangMuc,
    nhomCap1: r.thietBi.nhomCap1,
    viTriLapDat: r.viTriLapDat,
    soLuongDuKien: r.soLuongDuKien ? Number(r.soLuongDuKien) : null,
    soLuongThucTe: r.soLuongThucTe ? Number(r.soLuongThucTe) : null,
    donViTinh: r.donViTinh ?? r.thietBi.donViTinh,
    donGiaDuKien: r.donGiaDuKien ? Number(r.donGiaDuKien) : null,
    donGiaChot: r.donGiaChot ? Number(r.donGiaChot) : null,
    giaTrungBinh: r.thietBi.giaTrungBinh ? Number(r.thietBi.giaTrungBinh) : null,
    thanhTienDuKien: r.thanhTienDuKien
      ? Number(r.thanhTienDuKien)
      : r.soLuongDuKien && r.donGiaDuKien
        ? Number(r.soLuongDuKien) * Number(r.donGiaDuKien)
        : null,
    thanhTienChot: r.thanhTienChot
      ? Number(r.thanhTienChot)
      : r.soLuongThucTe && r.donGiaChot
        ? Number(r.soLuongThucTe) * Number(r.donGiaChot)
        : null,
    nguoiMua: r.nguoiMua,
    trangThaiChonModel: r.trangThaiChonModel,
    trangThaiDatHang: r.trangThaiDatHang,
    trangThaiGiaoHang: r.trangThaiGiaoHang,
    trangThaiLapDat: r.trangThaiLapDat,
    ngayCanChonModel: r.ngayCanChonModel?.toISOString() ?? null,
    ngayCanDatHang: r.ngayCanDatHang?.toISOString() ?? null,
    ngayCanGiaoHang: r.ngayCanGiaoHang?.toISOString() ?? null,
    ngayCanLapDat: r.ngayCanLapDat?.toISOString() ?? null,
    ghiChu: r.ghiChu,
    nhaCungCap: r.nhaCungCap ? { id: r.nhaCungCap.id.toString(), tenNhaCungCap: r.nhaCungCap.tenNhaCungCap } : null,
    milestone: r.milestone
      ? { id: r.milestone.id, name: r.milestone.name, plannedDate: r.milestone.plannedDate?.toISOString() ?? null }
      : null,
    congViec: r.congViec.map((c) => ({ id: c.id, tenCongViec: c.tenCongViec, trangThai: c.trangThai })),
  }));

  const catalog: CatalogItemForForm[] = catalogList.map((t) => ({
    id: t.id,
    maDanhMuc: t.maDanhMuc,
    tenHangMuc: t.tenHangMuc,
    nhomCap1: t.nhomCap1,
    donViTinh: t.donViTinh,
    giaTrungBinh: t.giaTrungBinh ? Number(t.giaTrungBinh) : null,
  }));

  const nccOptions: NccOption[] = nccList.map((n) => ({ id: n.id.toString(), tenNhaCungCap: n.tenNhaCungCap }));

  const tongDuKien = rows.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
  const tongChot = rows.reduce((s, r) => s + (r.thanhTienChot ?? 0), 0);

  const rowsDaChot = rows.filter((r) => r.thanhTienChot != null);
  const duKienCuaCacMucDaChot = rowsDaChot.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
  const chotCuaCacMucDaChot = rowsDaChot.reduce((s, r) => s + (r.thanhTienChot ?? 0), 0);
  const phatSinh = chotCuaCacMucDaChot - duKienCuaCacMucDaChot;
  const phatSinhPct = duKienCuaCacMucDaChot > 0 ? (phatSinh / duKienCuaCacMucDaChot) * 100 : 0;

  // Tổng dự kiến theo giá tham khảo (Danh mục) — giữ nguyên số lượng dự kiến, thay đơn giá dự kiến
  // của dự án bằng giá trung bình tham khảo, so trên CÙNG tập có đủ 2 dữ liệu
  const rowsCoThamKhao = rows.filter((r) => r.giaTrungBinh != null && r.soLuongDuKien != null);
  const duKienCuaCacMucThamKhao = rowsCoThamKhao.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
  const tongThamKhao = rowsCoThamKhao.reduce((s, r) => s + r.soLuongDuKien! * r.giaTrungBinh!, 0);
  const gapThamKhao = tongThamKhao - duKienCuaCacMucThamKhao;
  const gapThamKhaoPct = duKienCuaCacMucThamKhao > 0 ? (gapThamKhao / duKienCuaCacMucThamKhao) * 100 : 0;

  const soDaChonModel = rows.filter((r) => r.trangThaiChonModel === "da_chon").length;
  const soDaDat = rows.filter((r) => ["da_dat", "da_mua"].includes(r.trangThaiDatHang)).length;
  const soDaGiao = rows.filter((r) => r.trangThaiGiaoHang === "da_giao").length;
  const soDaLapDat = rows.filter((r) => r.trangThaiLapDat === "da_lap_dat").length;

  const groups = [...new Set(rows.map((r) => r.nhomCap1))];

  const groupTotals: NhomTong[] = groups
    .map((g) => {
      const groupRows = rows.filter((r) => r.nhomCap1 === g);
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
      <EquipmentTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">🔌 Thiết bị — {duAn.tenDuAn}</h1>
        <div className="ml-auto flex gap-2">
          <AutoSuggestEquipmentButton idDuAn={duAn.id.toString()} suggestions={suggestions} />
          <AddThietBiDuAnForm
            idDuAn={duAn.id.toString()}
            catalog={catalog}
            nccOptions={nccOptions}
            milestones={milestoneOptions}
          />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
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
                {phatSinhPct > 0 ? "+" : ""}{phatSinhPct.toFixed(1)}% · {rowsDaChot.length} thiết bị đã chốt
              </p>
            </>
          )}
        </Card>
        <Card title="Tổng dự kiến theo giá tham khảo">
          {rowsCoThamKhao.length === 0 ? (
            <p className="text-lg font-bold text-muted">—</p>
          ) : (
            <>
              <p className="text-lg font-bold money">{fmtVND(tongThamKhao)}</p>
              <p
                className="text-xs mt-0.5"
                style={{ color: gapThamKhao > 0 ? "var(--critical)" : gapThamKhao < 0 ? "var(--good-text)" : undefined }}
              >
                {gapThamKhaoPct > 0 ? "+" : ""}{gapThamKhaoPct.toFixed(1)}% so với dự kiến · {rowsCoThamKhao.length}/{rows.length} thiết bị có giá tham khảo
              </p>
            </>
          )}
        </Card>
        <Card title="Đã chọn model / đặt hàng">
          <p className="text-lg font-bold">{soDaChonModel} / {soDaDat} <span className="text-sm text-muted">/ {rows.length}</span></p>
        </Card>
        <Card title="Đã giao / lắp đặt">
          <p className="text-lg font-bold">{soDaGiao} / {soDaLapDat} <span className="text-sm text-muted">/ {rows.length}</span></p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title="Chưa có thiết bị nào trong dự án" sub="Bấm “+ Thêm thiết bị” để chọn từ danh mục tham khảo" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
            {topNhom.map((n, i) => (
              <Card key={n.group} title={`#${i + 1} nhóm chi phí cao nhất`}>
                <p className="font-bold text-[14px]">{n.group}</p>
                <p className="money text-lg font-bold mt-0.5">{fmtVND(n.total)}</p>
                <p className="text-xs text-muted mt-0.5">
                  {tongDuKien > 0 ? ((n.total / tongDuKien) * 100).toFixed(1) : "0"}% tổng dự kiến · {n.count} thiết bị
                </p>
              </Card>
            ))}
          </div>

          <Card title="Phân bổ chi phí dự kiến theo nhóm thiết bị">
            <EquipmentBudgetChart data={groupTotals} totalSum={tongDuKien} />
          </Card>

          <EquipmentGroupedList rows={rows} nccOptions={nccOptions} milestoneOptions={milestoneOptions} />
        </>
      )}
    </div>
  );
}
