import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import { fmtVND, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MaterialPricesPage() {
  await requireUser();

  const groups = await prisma.materialPriceGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      listings: {
        orderBy: { effectiveFrom: "desc" },
        include: {
          supplier: true,
          items: { include: { regionPrices: true } },
        },
      },
    },
  });

  // Chỉ giữ đợt niêm yết mới nhất mỗi (nhóm, nhà cung cấp) — lịch sử vẫn còn trong DB, chỉ ẩn ở màn hình mặc định
  const latestListingsByGroup = groups.map((g) => {
    const seenSupplier = new Set<string>();
    const latest = g.listings.filter((l) => {
      if (seenSupplier.has(l.supplierId)) return false;
      seenSupplier.add(l.supplierId);
      return true;
    });
    return { ...g, latest };
  });

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">📊 Bảng giá Vật liệu xây dựng</h1>
      </header>
      <p className="text-xs text-muted">
        Tổng hợp từ các công văn công bố giá chính thức nộp tại Sở Xây Dựng TP.HCM. Chỉ hiện đợt niêm yết mới nhất của mỗi nhà cung cấp.
      </p>

      {latestListingsByGroup.length === 0 ? (
        <Card><EmptyState title="Chưa có dữ liệu bảng giá" /></Card>
      ) : (
        latestListingsByGroup.map((g) => (
          <Card key={g.id} title={`${g.name}`}>
            {g.latest.length === 0 ? (
              <EmptyState title="Chưa có nhà cung cấp nào trong nhóm này" />
            ) : (
              <div className="space-y-4">
                {g.latest.map((listing) => {
                  const regions = [
                    ...new Set(listing.items.flatMap((i) => i.regionPrices.map((r) => r.region))),
                  ].sort((a, b) => (a === "TP.HCM" ? -1 : b === "TP.HCM" ? 1 : a.localeCompare(b, "vi")));
                  return (
                    <div key={listing.id}>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-[13.5px]">{listing.supplier.name}</span>
                        <span className="text-xs text-muted">
                          {listing.docNumber && `Công văn ${listing.docNumber} · `}
                          hiệu lực từ {fmtDate(listing.effectiveFrom)}
                          {listing.effectiveTo ? ` đến ${fmtDate(listing.effectiveTo)}` : " (đến khi có TB mới)"}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-[11px] text-muted border-b border-grid">
                              <th className="py-1 pr-2 font-semibold">Tên vật liệu</th>
                              <th className="py-1 pr-2 font-semibold">Quy chuẩn</th>
                              <th className="py-1 pr-2 font-semibold">Đơn vị</th>
                              {regions.map((r) => (
                                <th key={r} className="py-1 pr-2 font-semibold text-right">{r}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {listing.items.map((item) => (
                              <tr key={item.id} className="border-b border-grid last:border-0 text-[13px]">
                                <td className="py-2 pr-2 font-semibold">{item.name}</td>
                                <td className="py-2 pr-2 text-ink-2 text-xs">{item.standard ?? "—"}</td>
                                <td className="py-2 pr-2 text-ink-2">{item.unit}</td>
                                {regions.map((r) => {
                                  const rp = item.regionPrices.find((x) => x.region === r);
                                  return (
                                    <td key={r} className="py-2 pr-2 text-right money">
                                      {rp ? (
                                        <>
                                          {fmtVND(Number(rp.unitPrice))}
                                          {rp.changePct != null && (
                                            <div
                                              className="text-xs font-normal"
                                              style={{ color: Number(rp.changePct) < 0 ? "var(--good-text)" : Number(rp.changePct) > 0 ? "var(--critical)" : "var(--muted)" }}
                                            >
                                              {Number(rp.changePct) > 0 ? "+" : ""}{Number(rp.changePct)}%
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
