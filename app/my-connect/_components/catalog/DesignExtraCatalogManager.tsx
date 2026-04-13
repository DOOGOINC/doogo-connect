"use client";

import { useEffect, useState } from "react";
import { Edit3, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";

import { supabase } from "@/lib/supabase";

import { CatalogModal } from "./CatalogModal";
import { CatalogToast } from "./CatalogToast";

type Row = { id: string; name: string; description: string | null; price: number; sort_order: number | null };
type Form = { id: string; name: string; description: string; price: string; sortOrder: string };

const createForm = (): Form => ({ id: "", name: "", description: "", price: "0", sortOrder: "0" });

const inputClassName =
  "h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 disabled:bg-[#F2F4F6] disabled:text-[#98A2B3]";

export function DesignExtraCatalogManager({ manufacturerId, currencyCode }: { manufacturerId: number; currencyCode: CurrencyCode }) {
  const [items, setItems] = useState<Row[]>([]);
  const [form, setForm] = useState<Form>(createForm());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  const isEdit = editingId !== null;

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("manufacturer_design_extras")
      .select("*")
      .eq("manufacturer_id", manufacturerId)
      .order("sort_order", { ascending: true });
    setItems((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    const initialize = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("manufacturer_design_extras")
        .select("*")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true });
      if (!ignore) {
        setItems((data || []) as Row[]);
        setLoading(false);
      }
    };
    void initialize();
    return () => {
      ignore = true;
    };
  }, [manufacturerId]);

  const resetForm = () => {
    setForm(createForm());
    setOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const nextId = form.id.trim();

    if (!nextId || !form.name.trim()) return alert("추가 옵션 ID와 이름은 필수입니다.");
    if (!isEdit && items.some((item) => item.id === nextId)) {
      alert("이미 사용 중인 추가 옵션 ID입니다. 다른 ID를 입력해주세요.");
      return;
    }

    setSaving(true);
    const payload = {
      manufacturer_id: manufacturerId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price || 0),
      sort_order: Number(form.sortOrder || 0),
      is_active: true,
    };
    const result = isEdit
      ? await supabase.from("manufacturer_design_extras").update(payload).eq("id", editingId)
      : await supabase.from("manufacturer_design_extras").insert({ id: nextId, ...payload });
    setSaving(false);

    if (result.error) return alert(`저장 실패: ${result.error.message}`);
    await loadItems();
    resetForm();
    setToastMessage(isEdit ? "추가 옵션이 수정되었습니다." : "추가 옵션이 추가되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말로 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("manufacturer_design_extras").delete().eq("id", id);
    if (error) return alert(`삭제 실패: ${error.message}`);
    await loadItems();
  };

  return (
    <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm md:p-8">
      {toastMessage ? <CatalogToast message={toastMessage} onClose={() => setToastMessage("")} /> : null}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold text-[#191F28]">추가 디자인 옵션</h2>
            <span className="rounded-[999px] bg-[#F2F8FF] px-2.5 py-1 text-[12px] font-semibold text-[#3182F6]">
              {items.length}
            </span>
          </div>
          <p className="mt-1 text-[14px] text-[#8B95A1]">기본 구성 외에 별도 비용이 붙는 추가 작업을 관리합니다.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(createForm());
            setEditingId(null);
            setOpen(true);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#3182F6] px-5 text-[14px] font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-[#1B64DA]"
        >
          <Plus className="h-4 w-4" />
          옵션 추가
        </button>
      </div>

      <CatalogModal
        open={open}
        onClose={resetForm}
        badge={isEdit ? "추가 옵션 수정" : "추가 옵션 추가"}
        title={isEdit ? "추가 옵션" : "추가 옵션"}
        description=""
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="h-12 rounded-[14px] border border-[#D8E0E8] px-6 text-[14px] font-semibold text-[#4E5968] transition hover:bg-[#F8FAFC]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-7 text-[14px] font-semibold text-white transition hover:bg-black disabled:bg-[#CBD5E1]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "수정 저장" : "옵션 저장"}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#4E5968]">추가 옵션 ID</label>
            <input
              value={form.id}
              disabled={isEdit}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              className={inputClassName}
              placeholder="예: EXTRA-GOLD"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#4E5968]">추가 옵션명</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClassName}
              placeholder="예: 금박 가공"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[13px] font-semibold text-[#4E5968]">상세 설명</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="h-28 w-full rounded-[14px] border border-[#D8E0E8] bg-white p-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
              placeholder="추가 옵션의 범위와 결과물을 설명하세요."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#4E5968]">가격 ({currencyCode})</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              className={`${inputClassName} font-semibold text-[#3182F6]`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#4E5968]">정렬 순서</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              className={inputClassName}
            />
          </div>
        </div>
      </CatalogModal>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#F2F4F6] text-left">
              <th className="pb-4 pl-2 text-[13px] font-semibold text-[#8B95A1]">정렬</th>
              <th className="pb-4 text-[13px] font-semibold text-[#8B95A1]">옵션 ID / 이름</th>
              <th className="hidden pb-4 text-[13px] font-semibold text-[#8B95A1] md:table-cell">설명</th>
              <th className="pb-4 text-right text-[13px] font-semibold text-[#8B95A1]">가격</th>
              <th className="pb-4 text-center text-[13px] font-semibold text-[#8B95A1]">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#3182F6]" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-[14px] text-[#8B95A1]">
                  등록된 추가 옵션이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="group hover:bg-[#F9FAFB]">
                  <td className="py-4 pl-2 text-[12px] font-medium text-[#ADB5BD]">{item.sort_order}</td>
                  <td className="py-4">
                    <div className="min-w-[120px]">
                      <div className="text-[12px] font-medium text-[#8B95A1]">{item.id}</div>
                      <div className="text-[15px] font-bold text-[#191F28]">{item.name}</div>
                    </div>
                  </td>
                  <td className="hidden max-w-xs py-4 text-[14px] text-[#4E5968] md:table-cell">
                    <p className="truncate">{item.description || "-"}</p>
                  </td>
                  <td className="py-4 text-right">
                    <span className="text-[15px] font-bold text-[#191F28]">{formatCurrency(item.price, currencyCode)}</span>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            id: item.id,
                            name: item.name,
                            description: item.description || "",
                            price: String(item.price),
                            sortOrder: String(item.sort_order || 0),
                          });
                          setEditingId(item.id);
                          setOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#4E5968] hover:bg-[#E5E8EB]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#F04452] hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
