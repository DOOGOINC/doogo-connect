"use client";

import { useEffect, useState } from "react";
import { Edit3, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { CURRENCY_LABELS, CURRENCY_OPTIONS, formatCurrency, type CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { CatalogModal } from "./CatalogModal";
import { CatalogToast } from "./CatalogToast";

type Row = { id: string; name: string; description: string | null; price: number; sort_order: number | null; payment_currency: CurrencyCode | null };
type Form = { id: string; name: string; description: string; price: string; sortOrder: string; paymentCurrency: CurrencyCode };

const createForm = (currencyCode: CurrencyCode): Form => ({ id: "", name: "", description: "", price: "", sortOrder: "", paymentCurrency: currencyCode });
const inputClassName = "h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 disabled:bg-[#F2F4F6] disabled:text-[#98A2B3]";

export function DesignExtraCatalogManager({ manufacturerId, currencyCode, activeCurrency }: { manufacturerId: number; currencyCode: CurrencyCode; activeCurrency?: CurrencyCode }) {
  const visibleCurrency = activeCurrency || currencyCode;
  const [items, setItems] = useState<Row[]>([]);
  const [form, setForm] = useState<Form>(createForm(visibleCurrency));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  const isEdit = editingId !== null;
  const filteredItems = items.filter((item) => (item.payment_currency || "USD") === visibleCurrency);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("manufacturer_design_extras").select("id, name, description, price, sort_order, payment_currency").eq("manufacturer_id", manufacturerId).order("sort_order", { ascending: true });
    setItems((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    const initialize = async () => {
      const { data } = await supabase.from("manufacturer_design_extras").select("id, name, description, price, sort_order, payment_currency").eq("manufacturer_id", manufacturerId).order("sort_order", { ascending: true });
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
    setForm(createForm(visibleCurrency));
    setOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const nextId = form.id.trim();
    const lockedCurrency = isEdit ? items.find((item) => item.id === editingId)?.payment_currency || form.paymentCurrency : form.paymentCurrency;
    if (!nextId || !form.name.trim()) return alert("추가 옵션 ID와 이름은 필수입니다.");
    if (!isEdit && items.some((item) => item.id === nextId)) return alert("이미 사용 중인 추가 옵션 ID입니다.");

    setSaving(true);
    const payload = {
      manufacturer_id: manufacturerId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price || 0),
      sort_order: Number(form.sortOrder || 0),
      payment_currency: lockedCurrency,
      is_active: true,
    };
    const result = isEdit ? await supabase.from("manufacturer_design_extras").update(payload).eq("id", editingId) : await supabase.from("manufacturer_design_extras").insert({ id: nextId, ...payload });
    setSaving(false);
    if (result.error) return alert(`저장 실패: ${result.error.message}`);
    await loadItems();
    resetForm();
    setToastMessage(isEdit ? "추가 옵션이 수정되었습니다." : "추가 옵션이 등록되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 추가 옵션을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("manufacturer_design_extras").delete().eq("id", id);
    if (error) return alert(`삭제 실패: ${error.message}`);
    await loadItems();
  };

  return (
    <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm md:p-8">
      {toastMessage ? <CatalogToast message={toastMessage} onClose={() => setToastMessage("")} /> : null}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><h2 className="text-[20px] font-bold text-[#191F28]">추가 디자인 옵션</h2><span className="rounded-[999px] bg-[#F2F8FF] px-2.5 py-1 text-[12px] font-semibold text-[#3182F6]">{filteredItems.length}</span></div><p className="mt-1 text-[14px] text-[#8B95A1]">{visibleCurrency} 통화 옵션만 표시됩니다.</p></div>
        <button type="button" onClick={() => { setForm(createForm(visibleCurrency)); setEditingId(null); setOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#3182F6] px-5 text-[14px] font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-[#1B64DA]"><Plus className="h-4 w-4" />옵션 추가</button>
      </div>

      <CatalogModal open={open} onClose={resetForm} badge={isEdit ? "옵션 수정" : "옵션 등록"} title={isEdit ? "추가 옵션을 수정합니다." : "새 추가 옵션을 등록합니다."} description="결제통화는 최초 저장 후 수정할 수 없습니다." maxWidthClassName="max-w-2xl" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={resetForm} className="h-12 rounded-[14px] border border-[#D8E0E8] px-6 text-[14px] font-semibold text-[#4E5968] transition hover:bg-[#F8FAFC]">취소</button><button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-7 text-[14px] font-semibold text-white transition hover:bg-black disabled:bg-[#CBD5E1]">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isEdit ? "수정 저장" : "옵션 저장"}</button></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label className="text-[13px] font-semibold text-[#4E5968]">옵션 ID</label><input value={form.id} disabled={isEdit} onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))} className={inputClassName} /></div>
          <div className="space-y-2"><label className="text-[13px] font-semibold text-[#4E5968]">옵션명</label><input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className={inputClassName} /></div>
          <div className="space-y-2 sm:col-span-2"><label className="text-[13px] font-semibold text-[#4E5968]">설명</label><textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="h-28 w-full rounded-[14px] border border-[#D8E0E8] bg-white p-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10" /></div>
          <div className="space-y-2"><label className="text-[13px] font-semibold text-[#4E5968]">가격 ({form.paymentCurrency})</label><input type="number" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className={`${inputClassName} font-semibold text-[#3182F6]`} /></div>
          <div className="space-y-2"><label className="text-[13px] font-semibold text-[#4E5968]">결제통화</label><select value={form.paymentCurrency} disabled={isEdit} onChange={(event) => setForm((prev) => ({ ...prev, paymentCurrency: event.target.value as CurrencyCode }))} className={inputClassName}>{CURRENCY_OPTIONS.map((option) => <option key={option} value={option}>{CURRENCY_LABELS[option]}</option>)}</select></div>
          <div className="space-y-2"><label className="text-[13px] font-semibold text-[#4E5968]">정렬 순서</label><input type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))} className={inputClassName} /></div>
        </div>
      </CatalogModal>

      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#3182F6]" /></div> : filteredItems.length === 0 ? <div className="rounded-[16px] border border-dashed border-[#E5E8EB] bg-[#FBFCFD] py-20 text-center text-[14px] text-[#8B95A1]">{visibleCurrency} 통화 옵션이 없습니다.</div> : <div className="grid gap-4">{filteredItems.map((item) => (
        <div key={item.id} className="group relative flex flex-col gap-5 rounded-[18px] border border-[#E5E8EB] bg-white p-5 transition-all hover:border-[#3182F6] hover:shadow-[0_8px_24px_rgba(49,130,246,0.08)] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#8B95A1]"><span>{item.id}</span><span className="h-3 w-px bg-[#D8E0E8]" /><span>정렬 {item.sort_order ?? 0}</span><span className="h-3 w-px bg-[#D8E0E8]" /><span>{item.payment_currency || "USD"}</span></div>
            <div className="mt-1 text-[18px] font-bold text-[#191F28]">{item.name}</div>
            <p className="mt-2 line-clamp-2 text-[14px] text-[#6B7684]">{item.description || "설명 없음"}</p>
          </div>
          <div className="flex flex-col items-end gap-4 sm:min-w-[180px]">
            <div className="text-right"><div className="text-[18px] font-extrabold text-[#191F28]">{formatCurrency(item.price, item.payment_currency || "USD")}</div><div className="text-[12px] text-[#8B95A1]">옵션 가격</div></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => { setForm({ id: item.id, name: item.name, description: item.description || "", price: String(item.price), sortOrder: String(item.sort_order || 0), paymentCurrency: item.payment_currency || "USD" }); setEditingId(item.id); setOpen(true); }} className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#E5E8EB] bg-white px-4 text-[13px] font-semibold text-[#4E5968] transition hover:bg-[#F8F9FA]"><Edit3 className="h-4 w-4" />수정</button><button type="button" onClick={() => handleDelete(item.id)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#FFE5E5] bg-white text-[#F04452] transition hover:bg-[#FFF5F5]"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        </div>
      ))}</div>}
    </section>
  );
}
