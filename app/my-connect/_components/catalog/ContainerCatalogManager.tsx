"use client";
/* eslint-disable @next/next/no-img-element */

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Edit3, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { fetchCatalogSignedUrls, resolveCatalogImageUrl } from "@/lib/catalogImageUrls";
import { CURRENCY_LABELS, CURRENCY_OPTIONS, formatCurrency, type CurrencyCode } from "@/lib/currency";
import { uploadCatalogImage } from "@/lib/catalogImageUpload";
import { supabase } from "@/lib/supabase";
import { CatalogModal } from "./CatalogModal";
import { CatalogToast } from "./CatalogToast";

type ContainerRow = {
  id: string;
  name: string;
  description: string | null;
  add_price: number;
  image: string | null;
  sort_order: number | null;
  payment_currency: CurrencyCode | null;
};

type ContainerForm = {
  id: string;
  name: string;
  description: string;
  addPrice: string;
  image: string;
  sortOrder: string;
  paymentCurrency: CurrencyCode;
};

const createForm = (currencyCode: CurrencyCode): ContainerForm => ({
  id: "",
  name: "",
  description: "",
  addPrice: "",
  image: "",
  sortOrder: "",
  paymentCurrency: currencyCode,
});

const inputClassName =
  "h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 disabled:bg-[#F2F4F6] disabled:text-[#98A2B3]";

export function ContainerCatalogManager({
  manufacturerId,
  currencyCode,
  activeCurrency,
}: {
  manufacturerId: number;
  currencyCode: CurrencyCode;
  activeCurrency?: CurrencyCode;
}) {
  const visibleCurrency = activeCurrency || currencyCode;
  const [items, setItems] = useState<ContainerRow[]>([]);
  const [form, setForm] = useState<ContainerForm>(createForm(visibleCurrency));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEdit = editingId !== null;
  const filteredItems = items.filter((item) => (item.payment_currency || "USD") === visibleCurrency);
  const resolveImageUrl = (pathOrUrl: string | null | undefined) => resolveCatalogImageUrl(pathOrUrl, signedImageUrls);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("manufacturer_container_options")
      .select("id, name, description, add_price, image, sort_order, payment_currency")
      .eq("manufacturer_id", manufacturerId)
      .order("sort_order", { ascending: true });

    setItems((data || []) as ContainerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      const { data } = await supabase
        .from("manufacturer_container_options")
        .select("id, name, description, add_price, image, sort_order, payment_currency")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true });

      if (!ignore) {
        setItems((data || []) as ContainerRow[]);
        setLoading(false);
      }
    };

    setLoading(true);
    void initialize();
    return () => {
      ignore = true;
    };
  }, [manufacturerId]);

  useEffect(() => {
    const paths = [...items.map((item) => item.image), form.image].filter((path): path is string => Boolean(path));
    let ignore = false;

    const loadSignedUrls = async () => {
      try {
        const urls = await fetchCatalogSignedUrls(paths);
        if (!ignore) {
          setSignedImageUrls((prev) => ({ ...prev, ...urls }));
        }
      } catch (error) {
        console.error("[container catalog image urls]", error);
      }
    };

    void loadSignedUrls();

    return () => {
      ignore = true;
    };
  }, [form.image, items]);

  const resetForm = () => {
    setForm(createForm(visibleCurrency));
    setOpen(false);
    setEditingId(null);
    setImageUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const imageUrl = await uploadCatalogImage({
        file,
        manufacturerId,
        entity: "containers",
        entityId: form.id.trim() || `draft-${manufacturerId}`,
      });
      setForm((prev) => ({ ...prev, image: imageUrl }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    const nextId = form.id.trim();
    const lockedCurrency = isEdit ? items.find((item) => item.id === editingId)?.payment_currency || form.paymentCurrency : form.paymentCurrency;

    if (!nextId || !form.name.trim()) {
      alert("용기 ID와 이름은 필수입니다.");
      return;
    }

    if (!isEdit && items.some((item) => item.id === nextId)) {
      alert("이미 사용 중인 용기 ID입니다.");
      return;
    }

    const payload = {
      manufacturer_id: manufacturerId,
      name: form.name.trim(),
      description: form.description.trim(),
      add_price: Number(form.addPrice || 0),
      image: form.image || null,
      sort_order: Number(form.sortOrder || 0),
      payment_currency: lockedCurrency,
      is_active: true,
    };

    setSaving(true);
    const result = isEdit
      ? await supabase.from("manufacturer_container_options").update(payload).eq("id", editingId)
      : await supabase.from("manufacturer_container_options").insert({ id: nextId, ...payload });
    setSaving(false);

    if (result.error) {
      alert(`저장 실패: ${result.error.message}`);
      return;
    }

    await loadItems();
    resetForm();
    setToastMessage(isEdit ? "용기가 수정되었습니다." : "용기가 등록되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 용기를 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("manufacturer_container_options").delete().eq("id", id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }
    await loadItems();
  };

  return (
    <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm md:p-8">
      {toastMessage ? <CatalogToast message={toastMessage} onClose={() => setToastMessage("")} /> : null}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold text-[#191F28]">저장된 용기</h2>
            <span className="rounded-[999px] bg-[#F2F8FF] px-2.5 py-1 text-[12px] font-semibold text-[#3182F6]">{filteredItems.length}</span>
          </div>
          <p className="mt-1 text-[14px] text-[#8B95A1]">{visibleCurrency} 통화 용기만 표시됩니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(createForm(visibleCurrency));
            setEditingId(null);
            setOpen(true);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#3182F6] px-5 text-[14px] font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-[#1B64DA]"
        >
          <Plus className="h-4 w-4" />
          용기 추가
        </button>
      </div>

      <CatalogModal
        open={open}
        onClose={resetForm}
        badge={isEdit ? "용기 수정" : "용기 등록"}
        title={isEdit ? "용기 정보를 수정합니다." : "새 용기를 등록합니다."}
        description="결제통화는 최초 저장 후 수정할 수 없습니다."
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className="h-12 rounded-[14px] border border-[#D8E0E8] px-6 text-[14px] font-semibold text-[#4E5968] transition hover:bg-[#F8FAFC]">
              취소
            </button>
            <button type="button" onClick={handleSave} disabled={saving || imageUploading} className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-7 text-[14px] font-semibold text-white transition hover:bg-black disabled:bg-[#CBD5E1]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "수정 저장" : "용기 저장"}
            </button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">용기 ID</label>
              <input disabled={isEdit} value={form.id} onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))} className={inputClassName} placeholder="예: BTL-500-GLASS" />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">용기명</label>
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className={inputClassName} placeholder="예: 500ml 유리병" />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">추가 금액 ({form.paymentCurrency})</label>
              <input type="number" value={form.addPrice} onChange={(event) => setForm((prev) => ({ ...prev, addPrice: event.target.value }))} className={`${inputClassName} font-semibold text-[#3182F6]`} />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">결제통화</label>
              <select value={form.paymentCurrency} disabled={isEdit} onChange={(event) => setForm((prev) => ({ ...prev, paymentCurrency: event.target.value as CurrencyCode }))} className={inputClassName}>
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {CURRENCY_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">정렬 순서</label>
              <input type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))} className={inputClassName} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">설명</label>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="h-28 w-full rounded-[14px] border border-[#D8E0E8] bg-white p-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10" placeholder="용기 특징이나 주의사항을 입력하세요." />
            </div>
          </div>

          <div className="rounded-[14px] border border-[#E7EDF3] bg-[#FCFDFE] p-5">
            <p className="text-[15px] font-semibold text-[#191F28]">용기 이미지</p>
            <p className="mt-1 text-[12px] leading-5 text-[#8B95A1]">권장 사이즈 800x800px</p>
            <div className="relative mt-4 flex h-52 items-center justify-center overflow-hidden rounded-[20px] border border-[#E5E8EB] bg-white">
              {resolveImageUrl(form.image) ? <img src={resolveImageUrl(form.image)} alt="용기 미리보기" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-[#B8C4D1]" />}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#191F28] px-4 text-[13px] font-semibold text-white transition hover:bg-black">
                {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {form.image ? "이미지 변경" : "이미지 업로드"}
              </button>
              {form.image ? (
                <button type="button" onClick={() => setForm((prev) => ({ ...prev, image: "" }))} className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#F7D7DA] bg-white px-4 text-[13px] font-semibold text-[#D92D20] transition hover:bg-[#FFF5F5]">
                  <Trash2 className="h-4 w-4" />
                  제거
                </button>
              ) : null}
            </div>
            <input ref={imageInputRef} type="file" hidden accept="image/*" onChange={handleImageSelect} />
          </div>
        </div>
      </CatalogModal>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#3182F6]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#E5E8EB] bg-[#FBFCFD] py-20 text-center text-[14px] text-[#8B95A1]">
          {visibleCurrency} 통화 용기가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="group relative flex flex-col gap-5 rounded-[18px] border border-[#E5E8EB] bg-white p-5 transition-all hover:border-[#3182F6] hover:shadow-[0_8px_24px_rgba(49,130,246,0.08)] sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border border-[#F2F4F6] bg-[#F8FAFC]">
                  {resolveImageUrl(item.image) ? <img src={resolveImageUrl(item.image)} className="h-full w-full object-cover" alt="" /> : <ImageIcon className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-[#ADB5BD]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#8B95A1]">
                    <span>{item.id}</span>
                    <span className="h-3 w-px bg-[#D8E0E8]" />
                    <span>정렬 {item.sort_order ?? 0}</span>
                    <span className="h-3 w-px bg-[#D8E0E8]" />
                    <span>{item.payment_currency || "USD"}</span>
                  </div>
                  <div className="mt-1 text-[18px] font-bold text-[#191F28]">{item.name}</div>
                  <p className="mt-2 line-clamp-2 text-[14px] text-[#6B7684]">{item.description || "설명 없음"}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-4 sm:min-w-[180px]">
                <div className="text-right">
                  <div className="text-[18px] font-extrabold text-[#3182F6]">+{formatCurrency(item.add_price, item.payment_currency || "USD")}</div>
                  <div className="text-[12px] text-[#8B95A1]">추가 금액</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        id: item.id,
                        name: item.name,
                        description: item.description || "",
                        addPrice: String(item.add_price),
                        image: item.image || "",
                        sortOrder: String(item.sort_order || 0),
                        paymentCurrency: item.payment_currency || "USD",
                      });
                      setEditingId(item.id);
                      setOpen(true);
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#E5E8EB] bg-white px-4 text-[13px] font-semibold text-[#4E5968] transition hover:bg-[#F8F9FA]"
                  >
                    <Edit3 className="h-4 w-4" />
                    수정
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#FFE5E5] bg-white text-[#F04452] transition hover:bg-[#FFF5F5]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
