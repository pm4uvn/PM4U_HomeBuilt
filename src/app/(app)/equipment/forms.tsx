"use client";

import { useRef, useState, useTransition } from "react";
import { ModalButton } from "@/components/Modal";
import { Button, Card, Field, Input, Select, Tag, Textarea } from "@/components/ui";
import { fmtVND, fmtDate } from "@/lib/format";
import {
  TB_DO_TIN_CAY, TB_TRANG_THAI, TB_NGUOI_MUA, TB_TRANG_THAI_CHON_MODEL,
  TB_TRANG_THAI_DAT_HANG, TB_TRANG_THAI_GIAO_HANG, TB_TRANG_THAI_LAP_DAT,
} from "@/lib/labels";
import { suggestThietBiDates } from "@/lib/thietbi-suggestions";
import type { EquipmentSuggestion } from "@/lib/equipment-suggestions";
import {
  createThietBi, updateThietBi, deleteThietBi, quickAddThietBiDuAn,
  addThietBiDuAn, updateThietBiDuAn, updateThietBiTrangThai, toggleCongViecThietBi,
  deleteThietBiDuAn, dongBoNgayCanThietBiTheoMilestone, bulkAddThietBiDuAn,
} from "./actions";

const opts = (m: Record<string, string>) =>
  Object.entries(m).map(([v, l]) => (
    <option key={v} value={v}>{l}</option>
  ));

export type ThietBiRow = {
  id: string;
  maDanhMuc: string;
  maNhom: string;
  nhomCap1: string;
  nhomCap2: string;
  tenHangMuc: string;
  donViTinh: string | null;
  coSoSoLuong: string | null;
  thongSoBatBuoc: string | null;
  thuongHieuPhoBien: string | null;
  giaThap: number | null;
  giaTrungBinh: number | null;
  giaCao: number | null;
  baoHanhThang: number | null;
  tuoiThoNam: number | null;
  yeuCauLapDat: string | null;
  nguonThamKhao: string | null;
  doTinCay: string;
  trangThai: string;
  ghiChu: string | null;
};

function FormFields({ item }: { item?: ThietBiRow }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Mã danh mục *"><Input name="maDanhMuc" required defaultValue={item?.maDanhMuc} placeholder="EL-01-001" /></Field>
        <Field label="Mã nhóm"><Input name="maNhom" defaultValue={item?.maNhom} placeholder="01" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Nhóm cấp 1 *"><Input name="nhomCap1" required defaultValue={item?.nhomCap1} placeholder="THIẾT BỊ BẾP" /></Field>
        <Field label="Nhóm cấp 2"><Input name="nhomCap2" defaultValue={item?.nhomCap2} placeholder="Bếp nấu" /></Field>
      </div>
      <Field label="Tên hạng mục *"><Input name="tenHangMuc" required defaultValue={item?.tenHangMuc} placeholder="Bếp từ đơn để bàn" /></Field>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="ĐVT"><Input name="donViTinh" defaultValue={item?.donViTinh ?? ""} placeholder="bộ" /></Field>
        <Field label="Cơ sở số lượng"><Input name="coSoSoLuong" defaultValue={item?.coSoSoLuong ?? ""} placeholder="Theo khu bếp/phòng trọ" /></Field>
      </div>
      <Field label="Thông số bắt buộc khi báo giá"><Textarea name="thongSoBatBuoc" rows={2} defaultValue={item?.thongSoBatBuoc ?? ""} /></Field>
      <Field label="Thương hiệu phổ biến"><Input name="thuongHieuPhoBien" defaultValue={item?.thuongHieuPhoBien ?? ""} placeholder="Sunhouse; Philips; Bluestone" /></Field>
      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        <Field label="Giá thấp (VND)"><Input name="giaThap" inputMode="numeric" defaultValue={item?.giaThap ?? ""} /></Field>
        <Field label="Giá trung bình (VND)"><Input name="giaTrungBinh" inputMode="numeric" defaultValue={item?.giaTrungBinh ?? ""} /></Field>
        <Field label="Giá cao (VND)"><Input name="giaCao" inputMode="numeric" defaultValue={item?.giaCao ?? ""} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Bảo hành (tháng)"><Input name="baoHanhThang" type="number" min={0} defaultValue={item?.baoHanhThang ?? ""} /></Field>
        <Field label="Tuổi thọ (năm)"><Input name="tuoiThoNam" type="number" min={0} defaultValue={item?.tuoiThoNam ?? ""} /></Field>
      </div>
      <Field label="Yêu cầu lắp đặt/hạ tầng"><Textarea name="yeuCauLapDat" rows={2} defaultValue={item?.yeuCauLapDat ?? ""} /></Field>
      <Field label="Nguồn tham khảo (URL)"><Input name="nguonThamKhao" defaultValue={item?.nguonThamKhao ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Độ tin cậy"><Select name="doTinCay" defaultValue={item?.doTinCay ?? "trung_binh"}>{opts(TB_DO_TIN_CAY)}</Select></Field>
        <Field label="Trạng thái"><Select name="trangThai" defaultValue={item?.trangThai ?? "dang_su_dung"}>{opts(TB_TRANG_THAI)}</Select></Field>
      </div>
      <Field label="Ghi chú"><Textarea name="ghiChu" rows={2} defaultValue={item?.ghiChu ?? ""} /></Field>
    </>
  );
}

export function CreateThietBiForm() {
  return (
    <ModalButton label="+ Thêm hạng mục" title="Thêm hạng mục thiết bị">
      {(close) => (
        <form action={async (fd) => { await createThietBi(fd); close(); }} className="space-y-3">
          <FormFields />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function EditThietBiForm({ item }: { item: ThietBiRow }) {
  return (
    <ModalButton label="Sửa" title={`Sửa — ${item.tenHangMuc}`} variant="default">
      {(close) => (
        <form action={async (fd) => { await updateThietBi(item.id, fd); close(); }} className="space-y-3">
          <FormFields item={item} />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Lưu thay đổi</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

export function DeleteThietBiButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Xóa hạng mục "${title}"? Không thể hoàn tác.`)) return;
        startTransition(() => deleteThietBi(id));
      }}
    >
      Xóa
    </Button>
  );
}

const PRICE_COLS = [
  { key: "giaThap", label: "Giá thấp" },
  { key: "giaTrungBinh", label: "Giá TB" },
  { key: "giaCao", label: "Giá cao" },
] as const;

type SortKey = "tenHangMuc" | (typeof PRICE_COLS)[number]["key"];
type SortDir = "asc" | "desc";

/**
 * Thêm nhanh 1 hạng mục vào dự án ngay từ Danh mục — không cần mở form, không cần qua tab Thiết bị
 * dự án tìm lại. Đã thêm rồi thì disable + đổi chữ (dùng state cha `addedIds` truyền xuống vì
 * addedIds ban đầu tính từ server, còn bấm thêm mới thì set cục bộ ngay để phản hồi tức thì).
 * Dùng <select> thay vì dropdown tự vẽ — popup của <select> render ở lớp trình duyệt, không bị
 * cắt bởi overflow-x-auto của bảng bao ngoài (khác với popover CSS thông thường).
 */
function QuickAddThietBiButton({
  idDuAn, idThietBi, added, giaThap, giaTrungBinh, giaCao,
}: {
  idDuAn: string; idThietBi: string; added: boolean;
  giaThap: number | null; giaTrungBinh: number | null; giaCao: number | null;
}) {
  const [justAdded, setJustAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const isAdded = added || justAdded;

  const tiers: { value: "thap" | "trung_binh" | "cao"; label: string; gia: number | null }[] = [
    { value: "thap", label: "Giá thấp", gia: giaThap },
    { value: "trung_binh", label: "Giá TB", gia: giaTrungBinh },
    { value: "cao", label: "Giá cao", gia: giaCao },
  ];

  return (
    <select
      value=""
      disabled={isAdded || pending}
      onChange={(e) => {
        const tier = e.target.value as "thap" | "trung_binh" | "cao";
        if (!tier) return;
        startTransition(async () => {
          await quickAddThietBiDuAn(idDuAn, idThietBi, tier);
          setJustAdded(true);
        });
        e.target.value = "";
      }}
      className={`text-[13px] font-semibold rounded-lg px-3.5 py-1.5 disabled:opacity-50 border-0 ${
        isAdded ? "border border-line bg-surface hover:bg-page text-ink" : "bg-brand text-white hover:opacity-90"
      }`}
    >
      <option value="" disabled>{isAdded ? "✓ Đã thêm" : "+ Thêm vào dự án"}</option>
      {!isAdded &&
        tiers.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}{t.gia != null ? ` (${fmtVND(t.gia)})` : ""}
          </option>
        ))}
    </select>
  );
}

/** Danh mục tham khảo thiết bị điện tử (214 hạng mục) — lọc nhóm, tìm kiếm, sắp xếp theo giá */
export function EquipmentBrowser({
  items, idDuAn, addedThietBiIds = new Set(),
}: { items: ThietBiRow[]; idDuAn?: string; addedThietBiIds?: Set<string> }) {
  const [q, setQ] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("tenHangMuc");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allGroups = [...new Set(items.map((i) => i.nhomCap1))];

  const query = q.trim().toLowerCase();
  let filtered = query
    ? items.filter((i) => i.tenHangMuc.toLowerCase().includes(query) || i.maDanhMuc.toLowerCase().includes(query))
    : items;
  if (selectedGroup) filtered = filtered.filter((i) => i.nhomCap1 === selectedGroup);

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "tenHangMuc") {
      // Chỉ định rõ locale "vi" — tránh lệch thứ tự giữa server render và client hydrate (locale mặc định
      // của Node và trình duyệt có thể khác nhau, gây lỗi hydration mismatch với chữ có dấu tiếng Việt).
      const cmp = a.tenHangMuc.localeCompare(b.tenHangMuc, "vi");
      return sortDir === "asc" ? cmp : -cmp;
    }
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const groups = selectedGroup ? [selectedGroup] : [...new Set(sorted.map((i) => i.nhomCap1))];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
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
          const count = items.filter((i) => i.nhomCap1 === g).length;
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
          placeholder="Tìm theo tên hoặc mã danh mục..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={sortKey}
          onChange={(e) => { setSortKey(e.target.value as SortKey); setSortDir("asc"); }}
          className="!w-auto"
        >
          <option value="tenHangMuc">Sắp xếp: Tên hạng mục</option>
          {PRICE_COLS.map((c) => <option key={c.key} value={c.key}>Sắp xếp: {c.label}</option>)}
        </Select>
        <button
          type="button"
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-line text-ink-2 hover:bg-page"
        >
          {sortDir === "asc" ? "↑ Tăng dần" : "↓ Giảm dần"}
        </button>
        {(selectedGroup || q) && (
          <button
            type="button"
            onClick={() => { setSelectedGroup(null); setQ(""); }}
            className="text-[12px] text-critical font-semibold"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {groups.length === 0 && <p className="text-sm text-muted">Không tìm thấy hạng mục nào khớp.</p>}
      {groups.map((g) => (
        <div key={g}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-1.5">{g}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-grid">
                  <th className="py-1 pr-2 font-semibold cursor-pointer select-none" onClick={() => toggleSort("tenHangMuc")}>
                    Hạng mục{sortArrow("tenHangMuc")}
                  </th>
                  <th className="py-1 pr-2 font-semibold">ĐVT</th>
                  {PRICE_COLS.map((c) => (
                    <th key={c.key} className="py-1 pr-2 font-semibold cursor-pointer select-none" onClick={() => toggleSort(c.key)}>
                      {c.label}{sortArrow(c.key)}
                    </th>
                  ))}
                  <th className="py-1 pr-2 font-semibold">Bảo hành</th>
                  <th className="py-1 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sorted
                  .filter((i) => i.nhomCap1 === g)
                  .map((i) => (
                    <tr key={i.id} className="border-b border-grid last:border-0 text-[13px] align-top">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{i.tenHangMuc}</div>
                        {i.nhomCap2 && <div className="text-xs text-ink-2">{i.nhomCap2}</div>}
                        {i.thuongHieuPhoBien && <div className="text-xs text-muted">{i.thuongHieuPhoBien}</div>}
                      </td>
                      <td className="py-2 pr-2 text-ink-2">{i.donViTinh ?? "—"}</td>
                      {PRICE_COLS.map((c) => (
                        <td key={c.key} className="py-2 pr-2 money">{i[c.key] ? fmtVND(i[c.key]!) : "—"}</td>
                      ))}
                      <td className="py-2 pr-2 text-ink-2">{i.baoHanhThang ? `${i.baoHanhThang} tháng` : "—"}</td>
                      <td className="py-2">
                        <div className="flex gap-1.5">
                          {idDuAn && (
                            <QuickAddThietBiButton
                              idDuAn={idDuAn}
                              idThietBi={i.id}
                              added={addedThietBiIds.has(i.id)}
                              giaThap={i.giaThap}
                              giaTrungBinh={i.giaTrungBinh}
                              giaCao={i.giaCao}
                            />
                          )}
                          <EditThietBiForm item={i} />
                          <DeleteThietBiButton id={i.id} title={i.tenHangMuc} />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * THIẾT BỊ DỰ ÁN — tầng theo dõi thực tế, cùng cấu trúc với module Vật tư
 * ========================================================================== */

export type CatalogItemForForm = {
  id: string;
  maDanhMuc: string;
  tenHangMuc: string;
  nhomCap1: string;
  donViTinh: string | null;
  giaTrungBinh: number | null;
};

export type NccOption = { id: string; tenNhaCungCap: string };

export type MilestoneOption = {
  id: string;
  name: string;
  phaseName: string;
  plannedDate: string | null;
};

export type ThietBiDuAnRow = {
  id: string;
  maDanhMuc: string;
  tenHangMuc: string;
  nhomCap1: string;
  viTriLapDat: string | null;
  soLuongDuKien: number | null;
  soLuongThucTe: number | null;
  donViTinh: string | null;
  donGiaDuKien: number | null;
  donGiaChot: number | null;
  giaTrungBinh: number | null; // giá tham khảo web từ Danh mục
  thanhTienDuKien: number | null;
  thanhTienChot: number | null;
  nguoiMua: string;
  trangThaiChonModel: string;
  trangThaiDatHang: string;
  trangThaiGiaoHang: string;
  trangThaiLapDat: string;
  ngayCanChonModel: string | null;
  ngayCanDatHang: string | null;
  ngayCanGiaoHang: string | null;
  ngayCanLapDat: string | null;
  ghiChu: string | null;
  nhaCungCap: NccOption | null;
  milestone: { id: string; name: string; plannedDate: string | null } | null;
  congViec: { id: string; tenCongViec: string; trangThai: string }[];
};

/** Chọn milestone liên quan + 4 ô ngày cần — có nút "Dùng gợi ý" tự lùi ngày từ ngày dự kiến của mốc */
function MilestoneAndDatesFieldsThietBi({
  milestones,
  defaultMilestoneId,
  defaultDates,
}: {
  milestones: MilestoneOption[];
  defaultMilestoneId?: string;
  defaultDates?: { chonModel?: string; datHang?: string; giaoHang?: string; lapDat?: string };
}) {
  const [milestoneId, setMilestoneId] = useState(defaultMilestoneId ?? "");
  const chonModelRef = useRef<HTMLInputElement>(null);
  const datHangRef = useRef<HTMLInputElement>(null);
  const giaoHangRef = useRef<HTMLInputElement>(null);
  const lapDatRef = useRef<HTMLInputElement>(null);

  const phases = [...new Set(milestones.map((m) => m.phaseName))];
  const selected = milestones.find((m) => m.id === milestoneId);

  function apDungGoiYCho(plannedDate?: string | null) {
    if (!plannedDate) return;
    const s = suggestThietBiDates(plannedDate);
    if (chonModelRef.current) chonModelRef.current.value = s.ngayCanChonModel;
    if (datHangRef.current) datHangRef.current.value = s.ngayCanDatHang;
    if (giaoHangRef.current) giaoHangRef.current.value = s.ngayCanGiaoHang;
    if (lapDatRef.current) lapDatRef.current.value = s.ngayCanLapDat;
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
        <Field label="Ngày cần chọn model">
          <Input ref={chonModelRef} name="ngayCanChonModel" type="date" defaultValue={defaultDates?.chonModel ?? ""} />
        </Field>
        <Field label="Ngày cần đặt hàng">
          <Input ref={datHangRef} name="ngayCanDatHang" type="date" defaultValue={defaultDates?.datHang ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Ngày cần giao hàng">
          <Input ref={giaoHangRef} name="ngayCanGiaoHang" type="date" defaultValue={defaultDates?.giaoHang ?? ""} />
        </Field>
        <Field label="Ngày cần lắp đặt xong">
          <Input ref={lapDatRef} name="ngayCanLapDat" type="date" defaultValue={defaultDates?.lapDat ?? ""} />
        </Field>
      </div>
    </>
  );
}

/** Thêm 1 thiết bị từ danh mục tham khảo vào dự án — tự sinh 7 công việc theo dõi tiến độ */
export function AddThietBiDuAnForm({
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
  const groups = [...new Set(catalog.map((c) => c.nhomCap1))];

  return (
    <ModalButton label="+ Thêm thiết bị" title="Thêm thiết bị vào dự án">
      {(close) => (
        <form
          action={async (fd) => {
            await addThietBiDuAn(idDuAn, fd);
            close();
          }}
          className="space-y-3"
        >
          <Field label="Thiết bị (từ danh mục tham khảo)">
            <Select name="idThietBi" required value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— Chọn thiết bị —</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {catalog
                    .filter((c) => c.nhomCap1 === g)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tenHangMuc}
                        {c.giaTrungBinh ? ` — ${fmtVND(c.giaTrungBinh)}` : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Vị trí lắp đặt">
              <Input name="viTriLapDat" placeholder="Bếp, phòng khách, tầng 2..." />
            </Field>
            <Field label="Đơn vị tính">
              <Input name="donViTinh" defaultValue={selected?.donViTinh ?? ""} key={selected?.donViTinh} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Số lượng dự kiến">
              <Input name="soLuongDuKien" inputMode="decimal" placeholder="1" />
            </Field>
            <Field label="Đơn giá dự kiến (VND)">
              <Input
                name="donGiaDuKien"
                inputMode="decimal"
                placeholder="0"
                defaultValue={selected?.giaTrungBinh ?? ""}
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
              <Select name="nguoiMua" defaultValue="chua_xac_dinh">{opts(TB_NGUOI_MUA)}</Select>
            </Field>
          </div>
          <MilestoneAndDatesFieldsThietBi milestones={milestones} />
          <div className="pt-2"><Button type="submit" variant="primary" className="w-full">Thêm vào dự án</Button></div>
        </form>
      )}
    </ModalButton>
  );
}

type SuggestionState = { checked: boolean; soLuong: number; priceTier: "thap" | "trung_binh" | "cao" };

/**
 * Gợi ý tự động thiết bị theo quy mô nhà (số phòng khách/ngủ/bếp/WC khai báo ở Điều lệ dự án) —
 * người dùng xem trước, bỏ chọn/sửa số lượng/chọn mức giá từng dòng rồi mới thêm thật, không
 * tự thêm ngầm. `suggestions` được tính sẵn ở server (page.tsx) từ CharterFloorPlan + danh mục.
 */
export function AutoSuggestEquipmentButton({
  idDuAn,
  suggestions,
}: {
  idDuAn: string;
  suggestions: EquipmentSuggestion[];
}) {
  const [state, setState] = useState<Record<string, SuggestionState>>(() =>
    Object.fromEntries(suggestions.map((s) => [s.idThietBi, { checked: true, soLuong: s.soLuong, priceTier: "trung_binh" as const }])),
  );
  const [pending, startTransition] = useTransition();

  const groups = [...new Set(suggestions.map((s) => s.nguon))];
  const soLuongChon = Object.values(state).filter((s) => s.checked).length;

  const giaTheoTier = (s: EquipmentSuggestion, tier: SuggestionState["priceTier"]) =>
    tier === "thap" ? s.giaThap : tier === "cao" ? s.giaCao : s.giaTrungBinh;

  return (
    <ModalButton label="🏠 Tự động thêm theo quy mô nhà" title="Gợi ý thiết bị theo quy mô nhà" variant="default">
      {(close) => (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted">
              Không có gợi ý nào — kiểm tra đã khai báo số phòng ở tab Điều lệ dự án (⚙️ Cài đặt → Quy mô công trình)
              chưa, hoặc mọi thiết bị gợi ý đã có sẵn trong dự án.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted">
                Gợi ý dựa trên số phòng đã khai báo ở Điều lệ dự án. Bỏ chọn dòng không cần, chỉnh số lượng/mức giá rồi bấm Thêm.
              </p>
              {groups.map((g) => (
                <div key={g}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">{g}</h4>
                  <div className="space-y-1.5">
                    {suggestions
                      .filter((s) => s.nguon === g)
                      .map((s) => {
                        const st = state[s.idThietBi];
                        const gia = giaTheoTier(s, st.priceTier);
                        return (
                          <div key={s.idThietBi} className="flex items-center gap-2 text-[13px] border border-line rounded-lg px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={st.checked}
                              onChange={(e) => setState((p) => ({ ...p, [s.idThietBi]: { ...p[s.idThietBi], checked: e.target.checked } }))}
                            />
                            <span className="flex-1 min-w-0 truncate">{s.tenHangMuc}</span>
                            <input
                              type="number"
                              min={1}
                              value={st.soLuong}
                              disabled={!st.checked}
                              onChange={(e) =>
                                setState((p) => ({ ...p, [s.idThietBi]: { ...p[s.idThietBi], soLuong: Math.max(1, parseInt(e.target.value, 10) || 1) } }))
                              }
                              className="w-12 rounded border border-line bg-surface px-1 py-0.5 text-center disabled:opacity-50"
                            />
                            <select
                              value={st.priceTier}
                              disabled={!st.checked}
                              onChange={(e) =>
                                setState((p) => ({ ...p, [s.idThietBi]: { ...p[s.idThietBi], priceTier: e.target.value as SuggestionState["priceTier"] } }))
                              }
                              className="rounded border border-line bg-surface px-1 py-0.5 text-[12px] disabled:opacity-50"
                            >
                              <option value="thap">Giá thấp</option>
                              <option value="trung_binh">Giá TB</option>
                              <option value="cao">Giá cao</option>
                            </select>
                            <span className="w-24 text-right money text-ink-2">{gia != null ? fmtVND(gia) : "—"}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={soLuongChon === 0 || pending}
                  onClick={() =>
                    startTransition(async () => {
                      const items = suggestions
                        .filter((s) => state[s.idThietBi].checked)
                        .map((s) => ({
                          idThietBi: s.idThietBi,
                          soLuong: state[s.idThietBi].soLuong,
                          priceTier: state[s.idThietBi].priceTier,
                        }));
                      await bulkAddThietBiDuAn(idDuAn, items);
                      close();
                    })
                  }
                >
                  {pending ? "Đang thêm..." : `Thêm ${soLuongChon} thiết bị đã chọn`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </ModalButton>
  );
}

/** Sửa chi tiết 1 thiết bị trong dự án: số lượng, đơn giá, ngày cần, ghi chú */
export function EditThietBiDuAnForm({
  row,
  nccOptions,
  milestones,
}: {
  row: ThietBiDuAnRow;
  nccOptions: NccOption[];
  milestones: MilestoneOption[];
}) {
  return (
    <ModalButton label="Sửa" variant="default" title={row.tenHangMuc}>
      {(close) => (
        <form
          action={async (fd) => {
            await updateThietBiDuAn(row.id, fd);
            close();
          }}
          className="space-y-3"
        >
          <Field label="Vị trí lắp đặt">
            <Input name="viTriLapDat" defaultValue={row.viTriLapDat ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Số lượng dự kiến">
              <Input name="soLuongDuKien" inputMode="decimal" defaultValue={row.soLuongDuKien ?? ""} />
            </Field>
            <Field label="Số lượng thực tế">
              <Input name="soLuongThucTe" inputMode="decimal" defaultValue={row.soLuongThucTe ?? ""} />
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
              <Select name="nguoiMua" defaultValue={row.nguoiMua}>{opts(TB_NGUOI_MUA)}</Select>
            </Field>
          </div>
          <MilestoneAndDatesFieldsThietBi
            milestones={milestones}
            defaultMilestoneId={row.milestone?.id}
            defaultDates={{
              chonModel: row.ngayCanChonModel?.slice(0, 10),
              datHang: row.ngayCanDatHang?.slice(0, 10),
              giaoHang: row.ngayCanGiaoHang?.slice(0, 10),
              lapDat: row.ngayCanLapDat?.slice(0, 10),
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
export function ThietBiStatusSelects({ row }: { row: ThietBiDuAnRow }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 min-w-[220px]">
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiChonModel}
        onChange={(e) => updateThietBiTrangThai(row.id, "trangThaiChonModel", e.target.value)}
      >
        {opts(TB_TRANG_THAI_CHON_MODEL)}
      </Select>
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiDatHang}
        onChange={(e) => updateThietBiTrangThai(row.id, "trangThaiDatHang", e.target.value)}
      >
        {opts(TB_TRANG_THAI_DAT_HANG)}
      </Select>
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiGiaoHang}
        onChange={(e) => updateThietBiTrangThai(row.id, "trangThaiGiaoHang", e.target.value)}
      >
        {opts(TB_TRANG_THAI_GIAO_HANG)}
      </Select>
      <Select
        className="!py-1 text-[12px]"
        defaultValue={row.trangThaiLapDat}
        onChange={(e) => updateThietBiTrangThai(row.id, "trangThaiLapDat", e.target.value)}
      >
        {opts(TB_TRANG_THAI_LAP_DAT)}
      </Select>
    </div>
  );
}

/** Danh sách 7 công việc theo dõi tiến độ — click để đánh dấu hoàn thành */
export function CongViecThietBiList({ items }: { items: { id: string; tenCongViec: string; trangThai: string }[] }) {
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
                onChange={(e) => toggleCongViecThietBi(it.id, e.target.checked)}
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

/** Phân bổ chi phí dự kiến theo nhóm thiết bị — thanh ngang 1 màu (sequential), xếp giảm dần. */
export function EquipmentBudgetChart({ data, totalSum }: { data: NhomTong[]; totalSum: number }) {
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
                  {d.count} thiết bị · {fmtVND(d.total)} ({pct.toFixed(1)}%)
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
export function ResyncThietBiMilestoneDatesButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={() => dongBoNgayCanThietBiTheoMilestone(id)}
      className="text-[11px] font-semibold text-brand underline"
    >
      Đồng bộ lại theo mốc
    </button>
  );
}

export function DeleteThietBiDuAnButton({ id, tenHangMuc }: { id: string; tenHangMuc: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(`Xóa "${tenHangMuc}" khỏi dự án? Toàn bộ tiến độ theo dõi sẽ mất.`)) deleteThietBiDuAn(id);
      }}
      className="text-critical text-xs font-semibold"
    >
      Xóa
    </button>
  );
}

/** So ngày cần đang lưu với gợi ý tính lại từ ngày dự kiến HIỆN TẠI của mốc — lệch nghĩa là mốc đã đổi ngày sau khi liên kết */
function moccThietBiDaDoiNgay(r: ThietBiDuAnRow): boolean {
  if (!r.milestone?.plannedDate) return false;
  const s = suggestThietBiDates(r.milestone.plannedDate);
  return (
    r.ngayCanChonModel?.slice(0, 10) !== s.ngayCanChonModel ||
    r.ngayCanDatHang?.slice(0, 10) !== s.ngayCanDatHang ||
    r.ngayCanGiaoHang?.slice(0, 10) !== s.ngayCanGiaoHang ||
    r.ngayCanLapDat?.slice(0, 10) !== s.ngayCanLapDat
  );
}

function overdueThietBiStages(r: ThietBiDuAnRow, today: string): string[] {
  const overdue: string[] = [];
  if (r.ngayCanChonModel && r.ngayCanChonModel.slice(0, 10) < today && r.trangThaiChonModel !== "da_chon") {
    overdue.push("chọn model");
  }
  if (r.ngayCanDatHang && r.ngayCanDatHang.slice(0, 10) < today && !["da_dat", "da_mua"].includes(r.trangThaiDatHang)) {
    overdue.push("đặt hàng");
  }
  if (r.ngayCanGiaoHang && r.ngayCanGiaoHang.slice(0, 10) < today && r.trangThaiGiaoHang !== "da_giao") {
    overdue.push("giao hàng");
  }
  if (
    r.ngayCanLapDat &&
    r.ngayCanLapDat.slice(0, 10) < today &&
    !["da_lap_dat"].includes(r.trangThaiLapDat)
  ) {
    overdue.push("lắp đặt");
  }
  return overdue;
}

/** 1 dòng thiết bị — dự kiến, thực tế đã chốt (nếu có) kèm phát sinh, mốc liên quan, cảnh báo trễ */
function EquipmentRow({
  r,
  nccOptions,
  milestoneOptions,
  today,
}: {
  r: ThietBiDuAnRow;
  nccOptions: NccOption[];
  milestoneOptions: MilestoneOption[];
  today: string;
}) {
  const phatSinh = r.thanhTienChot != null && r.thanhTienDuKien != null ? r.thanhTienChot - r.thanhTienDuKien : null;
  const phatSinhPct = phatSinh != null && r.thanhTienDuKien ? (phatSinh / r.thanhTienDuKien) * 100 : null;
  const overdue = overdueThietBiStages(r, today);

  // So giá tham khảo web (Danh mục) với đơn giá đang lập cho dự án
  const soVoiDuKien = r.giaTrungBinh != null && r.donGiaDuKien != null ? r.giaTrungBinh - r.donGiaDuKien : null;
  const soVoiDuKienPct = soVoiDuKien != null && r.donGiaDuKien ? (soVoiDuKien / r.donGiaDuKien) * 100 : null;

  return (
    <div className="border border-line rounded-lg px-3 py-2">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[13.5px]">{r.tenHangMuc}</div>
          <div className="text-xs text-ink-2">
            {r.viTriLapDat && <>{r.viTriLapDat} · </>}
            Dự kiến: {r.soLuongDuKien ?? "?"} {r.donViTinh ?? ""} × {r.donGiaDuKien ? fmtVND(r.donGiaDuKien) : "?"}
            {" = "}
            <span className="money font-semibold">{r.thanhTienDuKien ? fmtVND(r.thanhTienDuKien) : "—"}</span>
            {r.nhaCungCap && <> · {r.nhaCungCap.tenNhaCungCap}</>}
          </div>
          {r.giaTrungBinh != null && (
            <div className="text-xs text-muted mt-0.5">
              💡 Giá tham khảo: <span className="money font-medium text-ink-2">{fmtVND(r.giaTrungBinh)}</span>
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
                Thực tế đã chốt: {r.soLuongThucTe ?? "?"} {r.donViTinh ?? ""} × {r.donGiaChot ? fmtVND(r.donGiaChot) : "?"} ={" "}
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
              {moccThietBiDaDoiNgay(r) && (
                <>
                  <Tag sev="warning">Mốc đã đổi ngày</Tag>
                  <ResyncThietBiMilestoneDatesButton id={r.id} />
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
            <CongViecThietBiList items={r.congViec} />
          </div>
        </div>
        <ThietBiStatusSelects row={r} />
        <div className="flex flex-col gap-1 items-end">
          <EditThietBiDuAnForm row={r} nccOptions={nccOptions} milestones={milestoneOptions} />
          <DeleteThietBiDuAnButton id={r.id} tenHangMuc={r.tenHangMuc} />
        </div>
      </div>
    </div>
  );
}

/** Danh sách thiết bị nhóm theo nhóm cấp 1, mỗi nhóm thu gọn/mở rộng được */
export function EquipmentGroupedList({
  rows,
  nccOptions,
  milestoneOptions,
}: {
  rows: ThietBiDuAnRow[];
  nccOptions: NccOption[];
  milestoneOptions: MilestoneOption[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = [...new Set(rows.map((r) => r.nhomCap1))];
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
        const groupRows = rows.filter((r) => r.nhomCap1 === g);
        const groupTong = groupRows.reduce((s, r) => s + (r.thanhTienDuKien ?? 0), 0);
        const isCollapsed = collapsed.has(g);
        return (
          <Card key={g}>
            <button type="button" onClick={() => toggle(g)} className="w-full flex items-center gap-2 mb-2 text-left">
              <h2 className="font-bold text-[14px]">{g}</h2>
              <span className="text-xs text-muted">({groupRows.length} thiết bị · {fmtVND(groupTong)})</span>
              <span className="ml-auto text-muted text-xs shrink-0">{isCollapsed ? "▶" : "▼"}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-2">
                {groupRows.map((r) => (
                  <EquipmentRow key={r.id} r={r} nccOptions={nccOptions} milestoneOptions={milestoneOptions} today={today} />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
