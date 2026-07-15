"use client";

import { useRef, useState } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Card, Field, Input, Select, Tag, Textarea } from "@/components/ui";
import { fmtVND, fmtDate } from "@/lib/format";
import {
  VT_NGUOI_MUA, VT_TRANG_THAI_CHOT_MAU, VT_TRANG_THAI_DAT_HANG,
  VT_TRANG_THAI_GIAO_HANG, VT_TRANG_THAI_THI_CONG, VT_NGUON_MUA_MAC_DINH,
} from "@/lib/labels";
import { suggestVatTuDates } from "@/lib/vattu-suggestions";
import {
  addVatTuDuAn, updateVatTuDuAn, updateVatTuTrangThai, toggleCongViecVatTu, deleteVatTuDuAn,
  dongBoNgayCanTheoMilestone,
} from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export type CatalogItemForForm = {
  id: string;
  maVatTu: string;
  tenVatTu: string;
  tenNhomVatTu: string;
  donViTinh: string | null;
  donGiaThamKhao: number | null;
};

export type NccOption = { id: string; tenNhaCungCap: string };

export type MilestoneOption = {
  id: string;
  name: string;
  phaseName: string;
  plannedDate: string | null;
};

export type VatTuDuAnRow = {
  id: string;
  maVatTu: string;
  tenVatTu: string;
  tenNhomVatTu: string;
  khuVucSuDung: string | null;
  khoiLuongDuKien: number | null;
  khoiLuongThucTe: number | null;
  donViTinh: string | null;
  donGiaDuKien: number | null;
  donGiaChot: number | null;
  donGiaThamKhao: number | null; // giá tham khảo thị trường từ Danh mục vật tư chuẩn
  thanhTienDuKien: number | null;
  thanhTienChot: number | null;
  nguoiMua: string;
  trangThaiChotMau: string;
  trangThaiDatHang: string;
  trangThaiGiaoHang: string;
  trangThaiThiCong: string;
  ngayCanChotMau: string | null;
  ngayCanDatHang: string | null;
  ngayCanGiaoHang: string | null;
  ngayCanThiCong: string | null;
  ghiChu: string | null;
  nhaCungCap: NccOption | null;
  milestone: { id: string; name: string; plannedDate: string | null } | null;
  congViec: { id: string; tenCongViec: string; trangThai: string }[];
};

/** Chọn milestone liên quan + 4 ô ngày cần — có nút "Dùng gợi ý" tự lùi ngày từ ngày dự kiến của mốc */
function MilestoneAndDatesFields({
  milestones,
  defaultMilestoneId,
  defaultDates,
}: {
  milestones: MilestoneOption[];
  defaultMilestoneId?: string;
  defaultDates?: { chotMau?: string; datHang?: string; giaoHang?: string; thiCong?: string };
}) {
  const [milestoneId, setMilestoneId] = useState(defaultMilestoneId ?? "");
  const chotMauRef = useRef<HTMLInputElement>(null);
  const datHangRef = useRef<HTMLInputElement>(null);
  const giaoHangRef = useRef<HTMLInputElement>(null);
  const thiCongRef = useRef<HTMLInputElement>(null);

  const phases = [...new Set(milestones.map((m) => m.phaseName))];
  const selected = milestones.find((m) => m.id === milestoneId);

  function apDungGoiYCho(plannedDate?: string | null) {
    if (!plannedDate) return;
    const s = suggestVatTuDates(plannedDate);
    if (chotMauRef.current) chotMauRef.current.value = s.ngayCanChotMau;
    if (datHangRef.current) datHangRef.current.value = s.ngayCanDatHang;
    if (giaoHangRef.current) giaoHangRef.current.value = s.ngayCanGiaoHang;
    if (thiCongRef.current) thiCongRef.current.value = s.ngayCanThiCong;
  }

  return (
    <>
      <Field label="Milestone liên quan (tự gợi ý ngày cần khi chọn)">
        <Select
          name="idMilestone"
          value={milestoneId}
          onChange={(e) => {
            setMilestoneId(e.target.value);
            apDungGoiYCho(milestones.find((m) => m.id === e.target.value)?.plannedDate);
          }}
        >
          <option value="">— Không liên kết —</option>
          {phases.map((p) => (
            <optgroup key={p} label={p}>
              {milestones
                .filter((m) => m.phaseName === p)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.plannedDate ? ` (dự kiến ${fmtDate(m.plannedDate)})` : " (chưa đặt ngày)"}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      {selected?.plannedDate && (
        <div className="flex items-center justify-between bg-page border border-line rounded-lg px-3 py-2 text-xs text-ink-2">
          <span>Mốc &ldquo;{selected.name}&rdquo; dự kiến {fmtDate(selected.plannedDate)} — đã tự điền gợi ý ngày bên dưới, có thể sửa lại</span>
          <Button type="button" variant="default" className="shrink-0 ml-2" onClick={() => apDungGoiYCho(selected.plannedDate)}>
            Dùng lại gợi ý
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Ngày cần chốt mẫu">
          <Input ref={chotMauRef} name="ngayCanChotMau" type="date" defaultValue={defaultDates?.chotMau ?? ""} />
        </Field>
        <Field label="Ngày cần đặt hàng">
          <Input ref={datHangRef} name="ngayCanDatHang" type="date" defaultValue={defaultDates?.datHang ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Ngày cần giao hàng">
          <Input ref={giaoHangRef} name="ngayCanGiaoHang" type="date" defaultValue={defaultDates?.giaoHang ?? ""} />
        </Field>
        <Field label="Ngày cần thi công xong">
          <Input ref={thiCongRef} name="ngayCanThiCong" type="date" defaultValue={defaultDates?.thiCong ?? ""} />
        </Field>
      </div>
    </>
  );
}

/** Thêm 1 vật tư từ danh mục chuẩn vào dự án — tự sinh 7 công việc theo dõi tiến độ */
export function AddVatTuDuAnForm({
  idDuAn,
  catalog,
  nccOptions,
  milestones,
}: {
  idDuAn: string;
  catalog: CatalogItemForForm[];
  nccOptions: NccOption[];
  milestones: MilestoneOption[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = catalog.find((c) => c.id === selectedId);
  const groups = [...new Set(catalog.map((c) => c.tenNhomVatTu))];

  return (
    <ModalButton label="+ Thêm vật tư" title="Thêm vật tư vào dự án">
      {(close) => (
        <form
          action={async (fd) => {
            await addVatTuDuAn(idDuAn, fd);
            close();
          }}
          className="space-y-3"
        >
          <Field label="Vật tư (từ danh mục chuẩn)">
            <Select name="idVatTu" required value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— Chọn vật tư —</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {catalog
                    .filter((c) => c.tenNhomVatTu === g)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tenVatTu}
                        {c.donGiaThamKhao ? ` — ${fmtVND(c.donGiaThamKhao)}` : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Khu vực sử dụng">
              <Input name="khuVucSuDung" placeholder="Phòng khách, WC tầng 2..." />
            </Field>
            <Field label="Đơn vị tính">
              <Input name="donViTinh" defaultValue={selected?.donViTinh ?? ""} key={selected?.donViTinh} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Khối lượng dự kiến">
              <Input name="khoiLuongDuKien" inputMode="decimal" placeholder="0" />
            </Field>
            <Field label="Đơn giá dự kiến (VND)">
              <Input
                name="donGiaDuKien"
                inputMode="decimal"
                placeholder="0"
                defaultValue={selected?.donGiaThamKhao ?? ""}
                key={selected?.id}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhà cung cấp">
              <Select name="idNhaCungCap" defaultValue="">
                <option value="">— Chưa xác định —</option>
                {nccOptions.map((n) => (
                  <option key={n.id} value={n.id}>{n.tenNhaCungCap}</option>
                ))}
              </Select>
            </Field>
            <Field label="Người mua">
              <Select name="nguoiMua" defaultValue="chua_xac_dinh">{opts(VT_NGUOI_MUA)}</Select>
            </Field>
          </div>
          <MilestoneAndDatesFields milestones={milestones} />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Thêm vào dự án</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

/** Sửa chi tiết 1 vật tư trong dự án: khối lượng, đơn giá, ngày cần, ghi chú */
export function EditVatTuDuAnForm({
  row,
  nccOptions,
  milestones,
}: {
  row: VatTuDuAnRow;
  nccOptions: NccOption[];
  milestones: MilestoneOption[];
}) {
  return (
    <ModalButton label="Sửa" variant="default" title={row.tenVatTu}>
      {(close) => (
        <form
          action={async (fd) => {
            await updateVatTuDuAn(row.id, fd);
            close();
          }}
          className="space-y-3"
        >
          <Field label="Khu vực sử dụng">
            <Input name="khuVucSuDung" defaultValue={row.khuVucSuDung ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Khối lượng dự kiến">
              <Input name="khoiLuongDuKien" inputMode="decimal" defaultValue={row.khoiLuongDuKien ?? ""} />
            </Field>
            <Field label="Khối lượng thực tế">
              <Input name="khoiLuongThucTe" inputMode="decimal" defaultValue={row.khoiLuongThucTe ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Đơn giá dự kiến (VND)">
              <Input name="donGiaDuKien" inputMode="decimal" defaultValue={row.donGiaDuKien ?? ""} />
            </Field>
            <Field label="Đơn giá chốt (VND)">
              <Input name="donGiaChot" inputMode="decimal" defaultValue={row.donGiaChot ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Nhà cung cấp">
              <Select name="idNhaCungCap" defaultValue={row.nhaCungCap?.id ?? ""}>
                <option value="">— Chưa xác định —</option>
                {nccOptions.map((n) => (
                  <option key={n.id} value={n.id}>{n.tenNhaCungCap}</option>
                ))}
              </Select>
            </Field>
            <Field label="Người mua">
              <Select name="nguoiMua" defaultValue={row.nguoiMua}>{opts(VT_NGUOI_MUA)}</Select>
            </Field>
          </div>
          <MilestoneAndDatesFields
            milestones={milestones}
            defaultMilestoneId={row.milestone?.id}
            defaultDates={{
              chotMau: row.ngayCanChotMau?.slice(0, 10),
              datHang: row.ngayCanDatHang?.slice(0, 10),
              giaoHang: row.ngayCanGiaoHang?.slice(0, 10),
              thiCong: row.ngayCanThiCong?.slice(0, 10),
            }}
          />
          <Field label="Ghi chú">
            <Textarea name="ghiChu" rows={2} defaultValue={row.ghiChu ?? ""} />
          </Field>
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

/** 4 select trạng thái — chọn là lưu ngay, không cần bấm nút lưu riêng */
export function VatTuStatusSelects({ row }: { row: VatTuDuAnRow }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 min-w-[220px]">
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiChotMau}
        onChange={(e) => updateVatTuTrangThai(row.id, "trangThaiChotMau", e.target.value)}
      >
        {opts(VT_TRANG_THAI_CHOT_MAU)}
      </Select>
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiDatHang}
        onChange={(e) => updateVatTuTrangThai(row.id, "trangThaiDatHang", e.target.value)}
      >
        {opts(VT_TRANG_THAI_DAT_HANG)}
      </Select>
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiGiaoHang}
        onChange={(e) => updateVatTuTrangThai(row.id, "trangThaiGiaoHang", e.target.value)}
      >
        {opts(VT_TRANG_THAI_GIAO_HANG)}
      </Select>
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiThiCong}
        onChange={(e) => updateVatTuTrangThai(row.id, "trangThaiThiCong", e.target.value)}
      >
        {opts(VT_TRANG_THAI_THI_CONG)}
      </Select>
    </div>
  );
}

/** Danh sách 7 công việc theo dõi tiến độ — click để đánh dấu hoàn thành */
export function CongViecList({ items }: { items: { id: string; tenCongViec: string; trangThai: string }[] }) {
  const [open, setOpen] = useState(false);
  const doneCount = items.filter((i) => i.trangThai === "hoan_thanh").length;
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-brand font-semibold">
        {doneCount}/{items.length} công việc {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1 border-l-2 border-grid pl-2">
          {items.map((it) => (
            <label key={it.id} className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={it.trangThai === "hoan_thanh"}
                onChange={(e) => toggleCongViecVatTu(it.id, e.target.checked)}
              />
              <span className={it.trangThai === "hoan_thanh" ? "line-through text-muted" : "text-ink-2"}>
                {it.tenCongViec}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export type NhomTong = { group: string; total: number; count: number };

/**
 * Phân bổ chi phí dự kiến theo nhóm vật tư — thanh ngang 1 màu (sequential), xếp giảm dần.
 * Nhãn %/giá trị luôn hiển thị (không ẩn sau hover); hover chỉ bổ sung số lượng vật tư.
 */
export function BudgetAllocationChart({ data, totalSum }: { data: NhomTong[]; totalSum: number }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = totalSum > 0 ? (d.total / totalSum) * 100 : 0;
        const widthPct = (d.total / max) * 100;
        return (
          <div key={d.group}>
            <div className="flex items-baseline justify-between text-[12.5px] mb-1 gap-2">
              <span className="font-medium text-ink-2 truncate">{d.group}</span>
              <span className="money shrink-0">
                <span className="font-semibold text-ink">{fmtVND(d.total)}</span>
                <span className="text-muted"> · {pct.toFixed(1)}%</span>
              </span>
            </div>
            <div
              className="relative h-3.5 rounded-sm bg-grid outline-none"
              tabIndex={0}
              onMouseEnter={() => setHovered(d.group)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(d.group)}
              onBlur={() => setHovered(null)}
            >
              <div
                className="h-full rounded-r-[4px]"
                style={{ width: `${widthPct}%`, background: "var(--series-1)" }}
              />
              {hovered === d.group && (
                <div className="absolute -top-8 left-0 z-10 bg-ink text-page text-[11px] font-medium rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                  {d.count} vật tư · {fmtVND(d.total)} ({pct.toFixed(1)}%)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Hiện khi mốc liên quan đã đổi ngày dự kiến sau khi liên kết — bấm để tính lại 4 ngày cần theo ngày mới */
export function ResyncMilestoneDatesButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={() => dongBoNgayCanTheoMilestone(id)}
      className="text-[11px] font-semibold text-brand underline"
    >
      Đồng bộ lại theo mốc
    </button>
  );
}

export function DeleteVatTuDuAnButton({ id, tenVatTu }: { id: string; tenVatTu: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(`Xóa "${tenVatTu}" khỏi dự án? Toàn bộ tiến độ theo dõi sẽ mất.`)) deleteVatTuDuAn(id);
      }}
      className="text-critical text-xs font-semibold"
    >
      Xóa
    </button>
  );
}

/** So ngày cần đang lưu với gợi ý tính lại từ ngày dự kiến HIỆN TẠI của mốc — lệch nghĩa là mốc đã đổi ngày sau khi liên kết */
function moccDaDoiNgay(r: VatTuDuAnRow): boolean {
  if (!r.milestone?.plannedDate) return false;
  const s = suggestVatTuDates(r.milestone.plannedDate);
  return (
    r.ngayCanChotMau?.slice(0, 10) !== s.ngayCanChotMau ||
    r.ngayCanDatHang?.slice(0, 10) !== s.ngayCanDatHang ||
    r.ngayCanGiaoHang?.slice(0, 10) !== s.ngayCanGiaoHang ||
    r.ngayCanThiCong?.slice(0, 10) !== s.ngayCanThiCong
  );
}

function overdueStages(r: VatTuDuAnRow, today: string): string[] {
  const overdue: string[] = [];
  if (r.ngayCanChotMau && r.ngayCanChotMau.slice(0, 10) < today && r.trangThaiChotMau !== "da_chot") {
    overdue.push("chốt mẫu");
  }
  if (r.ngayCanDatHang && r.ngayCanDatHang.slice(0, 10) < today && !["da_dat", "da_mua"].includes(r.trangThaiDatHang)) {
    overdue.push("đặt hàng");
  }
  if (r.ngayCanGiaoHang && r.ngayCanGiaoHang.slice(0, 10) < today && r.trangThaiGiaoHang !== "da_giao") {
    overdue.push("giao hàng");
  }
  if (
    r.ngayCanThiCong &&
    r.ngayCanThiCong.slice(0, 10) < today &&
    !["da_thi_cong", "dang_nghiem_thu", "da_nghiem_thu"].includes(r.trangThaiThiCong)
  ) {
    overdue.push("thi công");
  }
  return overdue;
}

/** 1 dòng vật tư — dự kiến, thực tế đã chốt (nếu có) kèm phát sinh, mốc liên quan, cảnh báo trễ */
function MaterialRow({
  r,
  nccOptions,
  milestoneOptions,
  today,
}: {
  r: VatTuDuAnRow;
  nccOptions: NccOption[];
  milestoneOptions: MilestoneOption[];
  today: string;
}) {
  const phatSinh = r.thanhTienChot != null && r.thanhTienDuKien != null ? r.thanhTienChot - r.thanhTienDuKien : null;
  const phatSinhPct = phatSinh != null && r.thanhTienDuKien ? (phatSinh / r.thanhTienDuKien) * 100 : null;
  const overdue = overdueStages(r, today);

  // So giá tham khảo web (Danh mục chuẩn) với đơn giá đang lập cho dự án — giúp nhìn nhanh giá đang
  // cao/thấp hơn thị trường bao nhiêu % ngay tại từng dòng, không phải mở Danh mục tham khảo để đối chiếu
  const soVoiDuKien = r.donGiaThamKhao != null && r.donGiaDuKien != null ? r.donGiaThamKhao - r.donGiaDuKien : null;
  const soVoiDuKienPct = soVoiDuKien != null && r.donGiaDuKien ? (soVoiDuKien / r.donGiaDuKien) * 100 : null;

  return (
    <div className="border border-line rounded-lg px-3 py-2">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[13.5px]">{r.tenVatTu}</div>
          <div className="text-xs text-ink-2">
            {r.khuVucSuDung && <>{r.khuVucSuDung} · </>}
            Dự kiến: {r.khoiLuongDuKien ?? "?"} {r.donViTinh ?? ""} × {r.donGiaDuKien ? fmtVND(r.donGiaDuKien) : "?"}
            {" = "}
            <span className="money font-semibold">{r.thanhTienDuKien ? fmtVND(r.thanhTienDuKien) : "—"}</span>
            {r.nhaCungCap && <> · {r.nhaCungCap.tenNhaCungCap}</>}
          </div>
          {r.donGiaThamKhao != null && (
            <div className="text-xs text-muted mt-0.5">
              💡 Giá tham khảo web: <span className="money font-medium text-ink-2">{fmtVND(r.donGiaThamKhao)}</span>
              {soVoiDuKienPct != null && Math.abs(soVoiDuKienPct) >= 0.5 && (
                <span style={{ color: soVoiDuKien! > 0 ? "var(--critical)" : "var(--good-text)" }}>
                  {" "}· {soVoiDuKien! > 0 ? "cao hơn" : "thấp hơn"} {Math.abs(soVoiDuKienPct).toFixed(0)}% giá đang lập
                </span>
              )}
            </div>
          )}
          {r.thanhTienChot != null && (
            <div className="text-xs mt-0.5">
              <span className="text-ink-2">
                Thực tế đã chốt: {r.khoiLuongThucTe ?? "?"} {r.donViTinh ?? ""} × {r.donGiaChot ? fmtVND(r.donGiaChot) : "?"} ={" "}
              </span>
              <span className="money font-semibold">{fmtVND(r.thanhTienChot)}</span>
              {phatSinh != null && (
                <span
                  className="font-semibold ml-1"
                  style={{ color: phatSinh > 0 ? "var(--critical)" : phatSinh < 0 ? "var(--good-text)" : undefined }}
                >
                  · Phát sinh {phatSinh > 0 ? "+" : ""}{fmtVND(phatSinh)}
                  {phatSinhPct != null && ` (${phatSinh > 0 ? "+" : ""}${phatSinhPct.toFixed(1)}%)`}
                </span>
              )}
            </div>
          )}
          {r.milestone && (
            <div className="text-xs text-ink-2 mt-0.5 flex items-center gap-1.5 flex-wrap">
              🔗 {r.milestone.name}
              {r.milestone.plannedDate && <> · dự kiến {fmtDate(r.milestone.plannedDate)}</>}
              {moccDaDoiNgay(r) && (
                <>
                  <Tag sev="warning">Mốc đã đổi ngày</Tag>
                  <ResyncMilestoneDatesButton id={r.id} />
                </>
              )}
            </div>
          )}
          {overdue.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {overdue.map((s) => (
                <Tag key={s} sev="critical">Trễ {s}</Tag>
              ))}
            </div>
          )}
          <div className="mt-1">
            <CongViecList items={r.congViec} />
          </div>
        </div>
        <VatTuStatusSelects row={r} />
        <div className="flex flex-col gap-1 items-end">
          <EditVatTuDuAnForm row={r} nccOptions={nccOptions} milestones={milestoneOptions} />
          <DeleteVatTuDuAnButton id={r.id} tenVatTu={r.tenVatTu} />
        </div>
      </div>
    </div>
  );
}

/** Danh sách vật tư nhóm theo hạng mục, mỗi nhóm thu gọn/mở rộng được — nhận dữ liệu thô, tự
 * render toàn bộ trong 1 client component (tránh truyền JSX đã dựng qua props giữa Server/Client). */
export function MaterialsGroupedList({
  rows,
  nccOptions,
  milestoneOptions,
}: {
  rows: VatTuDuAnRow[];
  nccOptions: NccOption[];
  milestoneOptions: MilestoneOption[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = [...new Set(rows.map((r) => r.tenNhomVatTu))];
  const today = new Date().toISOString().slice(0, 10);
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g));

  function toggle(g: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups))}
          className="text-xs text-brand font-semibold"
        >
          {allCollapsed ? "▼ Mở rộng tất cả" : "▲ Thu gọn tất cả"}
        </button>
      </div>
      {groups.map((g) => {
        const groupRows = rows.filter((r) => r.tenNhomVatTu === g);
        const groupTong = groupRows.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
        const isCollapsed = collapsed.has(g);
        return (
          <Card key={g}>
            <button type="button" onClick={() => toggle(g)} className="w-full flex items-center gap-2 mb-2 text-left">
              <h2 className="font-bold text-[14px]">{g}</h2>
              <span className="text-xs text-muted">({groupRows.length} vật tư · {fmtVND(groupTong)})</span>
              <span className="ml-auto text-muted text-xs shrink-0">{isCollapsed ? "▶" : "▼"}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-2">
                {groupRows.map((r) => (
                  <MaterialRow key={r.id} r={r} nccOptions={nccOptions} milestoneOptions={milestoneOptions} today={today} />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export type CatalogRow = {
  id: string;
  maVatTu: string;
  tenVatTu: string;
  tenNhomVatTu: string;
  donViTinh: string | null;
  quyCach: string | null;
  thuongHieuGoiY: string | null;
  xuatXu: string | null;
  donGiaThietThach: number | null;
  donGiaCatNghi: number | null;
  donGiaGoiChuan: number | null;
  donGiaThamKhao: number | null;
  nguonMuaMacDinh: string;
};

const PRICE_COLS = [
  { key: "donGiaThietThach", label: "Thiết Thạch" },
  { key: "donGiaCatNghi", label: "Cát Nghi" },
  { key: "donGiaGoiChuan", label: "Gói chuẩn" },
  { key: "donGiaThamKhao", label: "Tham khảo" },
] as const;

type SortKey = "tenVatTu" | (typeof PRICE_COLS)[number]["key"];
type SortDir = "asc" | "desc";

/** Giá thấp nhất trong 4 cột giá của 1 dòng (bỏ qua null) — để tô nổi khi so sánh */
function cheapestKey(i: CatalogRow): string | null {
  let best: string | null = null;
  let bestVal = Infinity;
  for (const c of PRICE_COLS) {
    const v = i[c.key];
    if (v != null && v < bestVal) {
      bestVal = v;
      best = c.key;
    }
  }
  return best;
}

/** Danh mục vật tư tham khảo (130 vật tư chuẩn) — lọc nhóm/xuất xứ/nguồn mua, tìm kiếm, sắp xếp theo giá, tô nổi giá rẻ nhất để so sánh */
export function CatalogBrowser({ items }: { items: CatalogRow[] }) {
  const [q, setQ] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tenVatTu");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allGroups = [...new Set(items.map((i) => i.tenNhomVatTu))];
  const allOrigins = [...new Set(items.map((i) => i.xuatXu).filter((x): x is string => !!x))].sort();
  const allSources = [...new Set(items.map((i) => i.nguonMuaMacDinh))];

  const query = q.trim().toLowerCase();
  let filtered = query
    ? items.filter(
        (i) => i.tenVatTu.toLowerCase().includes(query) || i.maVatTu.toLowerCase().includes(query),
      )
    : items;
  if (selectedGroup) filtered = filtered.filter((i) => i.tenNhomVatTu === selectedGroup);
  if (originFilter) filtered = filtered.filter((i) => i.xuatXu === originFilter);
  if (sourceFilter) filtered = filtered.filter((i) => i.nguonMuaMacDinh === sourceFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "tenVatTu") {
      // Chỉ định rõ locale "vi" — nếu để mặc định, Node (SSR) và trình duyệt (hydrate) có thể trả về
      // locale mặc định khác nhau, khiến thứ tự sắp xếp lệch nhau và gây lỗi hydration mismatch.
      const cmp = a.tenVatTu.localeCompare(b.tenVatTu, "vi");
      return sortDir === "asc" ? cmp : -cmp;
    }
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // giá trống luôn xếp cuối bất kể chiều sắp xếp
    if (bv == null) return -1;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const groups = selectedGroup ? [selectedGroup] : [...new Set(sorted.map((i) => i.tenNhomVatTu))];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "tenVatTu" ? "asc" : "asc");
    }
  };

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedGroup(null)}
          className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${
            selectedGroup === null ? "bg-brand text-white border-brand" : "border-line text-ink-2 hover:bg-page"
          }`}
        >
          Tất cả ({items.length})
        </button>
        {allGroups.map((g) => {
          const count = items.filter((i) => i.tenNhomVatTu === g).length;
          const active = selectedGroup === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGroup(active ? null : g)}
              className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${
                active ? "bg-brand text-white border-brand" : "border-line text-ink-2 hover:bg-page"
              }`}
            >
              {g} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Tìm theo tên hoặc mã vật tư..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} className="!w-auto">
          <option value="">Tất cả xuất xứ</option>
          {allOrigins.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="!w-auto">
          <option value="">Tất cả nguồn mua</option>
          {allSources.map((s) => <option key={s} value={s}>{VT_NGUON_MUA_MAC_DINH[s] ?? s}</option>)}
        </Select>
        <Select
          value={sortKey}
          onChange={(e) => { setSortKey(e.target.value as SortKey); setSortDir("asc"); }}
          className="!w-auto"
        >
          <option value="tenVatTu">Sắp xếp: Tên vật tư</option>
          {PRICE_COLS.map((c) => <option key={c.key} value={c.key}>Sắp xếp: Giá {c.label}</option>)}
        </Select>
        <button
          type="button"
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-line text-ink-2 hover:bg-page"
          title="Đảo chiều sắp xếp"
        >
          {sortDir === "asc" ? "↑ Tăng dần" : "↓ Giảm dần"}
        </button>
        {(originFilter || sourceFilter || selectedGroup || q) && (
          <button
            type="button"
            onClick={() => { setOriginFilter(""); setSourceFilter(""); setSelectedGroup(null); setQ(""); }}
            className="text-[12px] text-critical font-semibold"
          >
            Xóa bộ lọc
          </button>
        )}
        <span className="text-xs text-muted ml-auto">
          <span className="inline-block w-2.5 h-2.5 rounded mr-1 align-[-1px]" style={{ background: "var(--good)" }} />
          Giá rẻ nhất trong dòng
        </span>
      </div>

      {groups.length === 0 && <p className="text-sm text-muted">Không tìm thấy vật tư nào khớp.</p>}
      {groups.map((g) => (
        <div key={g}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">{g}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-grid">
                  <th className="py-1 pr-2 font-semibold cursor-pointer select-none" onClick={() => toggleSort("tenVatTu")}>
                    Vật tư{sortArrow("tenVatTu")}
                  </th>
                  <th className="py-1 pr-2 font-semibold">ĐVT</th>
                  {PRICE_COLS.map((c) => (
                    <th key={c.key} className="py-1 pr-2 font-semibold cursor-pointer select-none" onClick={() => toggleSort(c.key)}>
                      {c.label}{sortArrow(c.key)}
                    </th>
                  ))}
                  <th className="py-1 font-semibold">Nguồn mua</th>
                </tr>
              </thead>
              <tbody>
                {sorted
                  .filter((i) => i.tenNhomVatTu === g)
                  .map((i) => {
                    const cheapest = cheapestKey(i);
                    return (
                      <tr key={i.id} className="border-b border-grid last:border-0 text-[13px] align-top">
                        <td className="py-2 pr-2">
                          <div className="font-medium">{i.tenVatTu}</div>
                          {i.thuongHieuGoiY && <div className="text-xs text-ink-2">{i.thuongHieuGoiY}</div>}
                          {i.quyCach && <div className="text-xs text-muted">{i.quyCach}</div>}
                          {i.xuatXu && <div className="text-xs text-muted">Xuất xứ: {i.xuatXu}</div>}
                        </td>
                        <td className="py-2 pr-2 text-ink-2">{i.donViTinh ?? "—"}</td>
                        {PRICE_COLS.map((c) => {
                          const v = i[c.key];
                          const isCheapest = cheapest === c.key;
                          return (
                            <td
                              key={c.key}
                              className={`py-2 pr-2 money ${isCheapest ? "font-bold" : ""}`}
                              style={{ color: isCheapest ? "var(--good)" : undefined }}
                            >
                              {v ? fmtVND(v) : "—"}
                            </td>
                          );
                        })}
                        <td className="py-2 text-ink-2">{VT_NGUON_MUA_MAC_DINH[i.nguonMuaMacDinh] ?? i.nguonMuaMacDinh}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
