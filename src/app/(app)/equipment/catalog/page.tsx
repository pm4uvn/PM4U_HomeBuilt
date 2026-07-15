import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import { EquipmentTabs } from "../EquipmentTabs";
import { EquipmentBrowser, CreateThietBiForm, type ThietBiRow } from "../forms";

export const dynamic = "force-dynamic";

export default async function EquipmentCatalogPage() {
  await requireUser();

  const [list, duAn] = await Promise.all([
    prisma.thietBi.findMany({ orderBy: [{ maNhom: "asc" }, { maDanhMuc: "asc" }] }),
    prisma.duAn.findFirst({ orderBy: { id: "asc" } }),
  ]);

  // Hạng mục đã có trong dự án — để nút "+ Thêm vào dự án" đổi thành "✓ Đã thêm", tránh thêm trùng
  const addedThietBiIds = duAn
    ? new Set(
        (await prisma.thietBiDuAn.findMany({ where: { idDuAn: duAn.id }, select: { idThietBi: true } })).map(
          (r) => r.idThietBi,
        ),
      )
    : new Set<string>();

  const items: ThietBiRow[] = list.map((t) => ({
    id: t.id,
    maDanhMuc: t.maDanhMuc,
    maNhom: t.maNhom,
    nhomCap1: t.nhomCap1,
    nhomCap2: t.nhomCap2,
    tenHangMuc: t.tenHangMuc,
    donViTinh: t.donViTinh,
    coSoSoLuong: t.coSoSoLuong,
    thongSoBatBuoc: t.thongSoBatBuoc,
    thuongHieuPhoBien: t.thuongHieuPhoBien,
    giaThap: t.giaThap ? Number(t.giaThap) : null,
    giaTrungBinh: t.giaTrungBinh ? Number(t.giaTrungBinh) : null,
    giaCao: t.giaCao ? Number(t.giaCao) : null,
    baoHanhThang: t.baoHanhThang,
    tuoiThoNam: t.tuoiThoNam,
    yeuCauLapDat: t.yeuCauLapDat,
    nguonThamKhao: t.nguonThamKhao,
    doTinCay: t.doTinCay,
    trangThai: t.trangThai,
    ghiChu: t.ghiChu,
  }));

  return (
    <div className="space-y-3">
      <EquipmentTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📖 Danh mục thiết bị điện tử tham khảo</h1>
        <span className="text-ink-2 text-[13px]">{items.length} hạng mục tham khảo, giá theo cấp danh mục (thấp/trung bình/cao)</span>
        <div className="ml-auto">
          <CreateThietBiForm />
        </div>
      </header>

      <p className="text-xs text-muted -mt-1.5">
        Giá tham khảo ở cấp <b>danh mục</b> (chưa theo model/nhà cung cấp cụ thể) — dùng để ước tính ngân sách ban đầu,
        cần thay bằng báo giá thật theo model khi chốt mua.
      </p>

      {items.length === 0 ? (
        <Card><EmptyState title="Chưa có hạng mục thiết bị nào" sub="Bấm “+ Thêm hạng mục” để bắt đầu" /></Card>
      ) : (
        <Card>
          <EquipmentBrowser items={items} idDuAn={duAn?.id.toString()} addedThietBiIds={addedThietBiIds} />
        </Card>
      )}
    </div>
  );
}
