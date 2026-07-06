import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import { CatalogBrowser, type CatalogRow } from "../forms";
import { MaterialsTabs } from "../MaterialsTabs";

export const dynamic = "force-dynamic";

export default async function MaterialsCatalogPage() {
  await requireUser();

  const vatTuList = await prisma.vatTu.findMany({
    where: { trangThai: "dang_dung" },
    include: { nhom: true },
    orderBy: [{ nhom: { thuTu: "asc" } }, { maVatTu: "asc" }],
  });

  const items: CatalogRow[] = vatTuList.map((v) => ({
    id: v.id.toString(),
    maVatTu: v.maVatTu,
    tenVatTu: v.tenVatTu,
    tenNhomVatTu: v.nhom.tenNhomVatTu,
    donViTinh: v.donViTinh,
    quyCach: v.quyCach,
    thuongHieuGoiY: v.thuongHieuGoiY,
    xuatXu: v.xuatXu,
    donGiaThietThach: v.donGiaThietThach ? Number(v.donGiaThietThach) : null,
    donGiaCatNghi: v.donGiaCatNghi ? Number(v.donGiaCatNghi) : null,
    donGiaGoiChuan: v.donGiaGoiChuan ? Number(v.donGiaGoiChuan) : null,
    donGiaThamKhao: v.donGiaThamKhao ? Number(v.donGiaThamKhao) : null,
    nguonMuaMacDinh: v.nguonMuaMacDinh,
  }));

  return (
    <div className="space-y-3">
      <MaterialsTabs />
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📖 Danh mục vật tư tham khảo</h1>
        <span className="text-ink-2 text-[13px]">{items.length} vật tư chuẩn, giá tham khảo Thiết Thạch / Cát Nghi / gói tiêu chuẩn</span>
      </header>

      {items.length === 0 ? (
        <Card><EmptyState title="Chưa có vật tư trong danh mục" /></Card>
      ) : (
        <Card>
          <CatalogBrowser items={items} />
        </Card>
      )}
    </div>
  );
}
