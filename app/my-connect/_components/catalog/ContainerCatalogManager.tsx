"use client";
/* eslint-disable @next/next/no-img-element */

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Edit3, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { getCatalogImageUrl } from "@/lib/catalogImageUpload";

import { supabase } from "@/lib/supabase";
import { uploadCatalogImage } from "@/lib/catalogImageUpload";

import { CatalogModal } from "./CatalogModal";
import { CatalogToast } from "./CatalogToast";

type ContainerRow = {
  id: string;
  name: string;
  description: string | null;
  add_price: number;
  image: string | null;
  sort_order: number | null;
};

type ContainerForm = {
  id: string;
  name: string;
  description: string;
  addPrice: string;
  image: string;
  sortOrder: string;
};

const createForm = (): ContainerForm => ({
  id: "",
  name: "",
  description: "",
  addPrice: "0",
  image: "",
  sortOrder: "0",
});

const inputClassName =
  "h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 disabled:bg-[#F2F4F6] disabled:text-[#98A2B3]";

export function ContainerCatalogManager({ manufacturerId, currencyCode }: { manufacturerId: number; currencyCode: CurrencyCode }) {
  const [items, setItems] = useState<ContainerRow[]>([]);
  const [form, setForm] = useState<ContainerForm>(createForm());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEdit = editingId !== null;

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("manufacturer_container_options")
      .select("*")
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
        .select("*")
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

  const resetForm = () => {
    setForm(createForm());
    setOpen(false);
    setEditingId(null);
    setImageUploading(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageEntityId = form.id.trim() || `draft-${manufacturerId}`;

    setImageUploading(true);
    try {
      const imageUrl = await uploadCatalogImage({
        file,
        manufacturerId,
        entity: "containers",
        entityId: imageEntityId,
      });

      setForm((prev) => ({ ...prev, image: imageUrl }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
      alert(message);
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    const nextId = form.id.trim();

    if (!nextId || !form.name.trim()) {
      alert("용기 ID와 이름은 필수입니다.");
      return;
    }

    if (!isEdit && items.some((item) => item.id === nextId)) {
      alert("이미 사용 중인 용기 ID입니다. 다른 ID를 입력해주세요.");
      return;
    }

    const payload = {
      manufacturer_id: manufacturerId,
      name: form.name.trim(),
      description: form.description.trim(),
      add_price: Number(form.addPrice || 0),
      image: form.image || null,
      sort_order: Number(form.sortOrder || 0),
      is_active: true,
    };

    setSaving(true);
    const result = isEdit
      ? await supabase.from("manufacturer_container_options").update(payload).eq("id", editingId)
      : await supabase.from("manufacturer_container_options").insert({
          id: nextId,
          ...payload,
        });
    setSaving(false);

    if (result.error) {
      alert(`저장 실패: ${result.error.message}`);
      return;
    }

    await loadItems();
    resetForm();
    setToastMessage(isEdit ? "용기 정보가 수정되었습니다." : "새 용기가 등록되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말로 삭제하시겠습니까? 관련 데이터에 영향이 있을 수 있습니다.")) return;
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
            <h2 className="text-[20px] font-bold text-[#191F28]">용기 카탈로그</h2>
            <span className="rounded-[999px] bg-[#F2F8FF] px-2.5 py-1 text-[12px] font-semibold text-[#3182F6]">
              {items.length}
            </span>
          </div>
          <p className="mt-1 text-[14px] text-[#8B95A1]">상품과 연결되는 용기 규격과 추가 비용을 관리합니다.</p>
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
          용기 추가
        </button>
      </div>

      <CatalogModal
        open={open}
        onClose={resetForm}
        badge={isEdit ? "용기 수정" : "용기 등록"}
        title={isEdit ? "용기 정보를 수정합니다" : "새 용기를 등록합니다"}
        description="이미지, 추가 금액, 상세 설명."
        maxWidthClassName="max-w-4xl"
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
              disabled={saving || imageUploading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-7 text-[14px] font-semibold text-white transition hover:bg-black disabled:bg-[#CBD5E1]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "수정 저장" : "용기 저장"}
            </button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">용기 고유 ID</label>
              <input
                disabled={isEdit}
                value={form.id}
                onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                className={inputClassName}
                placeholder="예: BTL-500-GL"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">표시 이름</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className={inputClassName}
                placeholder="예: 500ml 유리병"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">추가 금액 ({currencyCode})</label>
              <input
                type="number"
                value={form.addPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, addPrice: event.target.value }))}
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
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[13px] font-semibold text-[#4E5968]">상세 설명</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="h-28 w-full rounded-[14px] border border-[#D8E0E8] bg-white p-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                placeholder="용기의 특징이나 주의사항을 적어주세요."
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5">
            <p className="text-[15px] font-semibold text-[#191F28]">용기 이미지</p>
            <p className="mt-1 text-[12px] leading-5 text-[#8B95A1]">권장 사이즈 800x800px, JPG 또는 PNG</p>

            <div className="mt-4 relative flex h-52 items-center justify-center overflow-hidden rounded-[20px] border border-[#E5E8EB] bg-white">
              {form.image ? (
                <img src={getCatalogImageUrl(form.image)} alt="용기 미리보기" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-[#B8C4D1]" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#191F28] px-4 text-[13px] font-semibold text-white transition hover:bg-black"
              >
                {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {form.image ? "이미지 변경" : "이미지 업로드"}
              </button>
              {form.image ? (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
                  className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#F7D7DA] bg-white px-4 text-[13px] font-semibold text-[#D92D20] transition hover:bg-[#FFF5F5]"
                >
                  <Trash2 className="h-4 w-4" />
                  제거
                </button>
              ) : null}
            </div>
            <input ref={imageInputRef} type="file" hidden accept="image/*" onChange={handleImageSelect} />
          </div>
        </div>
      </CatalogModal>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#F2F4F6] text-left">
              <th className="pb-4 pl-2 text-[13px] font-semibold text-[#8B95A1]">정렬</th>
              <th className="pb-4 text-[13px] font-semibold text-[#8B95A1]">용기 ID / 이름</th>
              <th className="hidden pb-4 text-[13px] font-semibold text-[#8B95A1] md:table-cell">상세 설명</th>
              <th className="pb-4 text-right text-[13px] font-semibold text-[#8B95A1]">추가 비용</th>
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
                  등록된 용기 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="group hover:bg-[#F9FAFB]">
                  <td className="py-4 pl-2 text-[12px] font-medium text-[#ADB5BD]">{item.sort_order}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[#F2F4F6] bg-[#F7F9FA]">
                        {item.image ? (
                          <img src={getCatalogImageUrl(item.image)} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <ImageIcon className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-[#ADB5BD]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-[#8B95A1]">{item.id}</div>
                        <div className="truncate text-[15px] font-bold text-[#191F28]">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden max-w-xs py-4 text-[14px] text-[#4E5968] md:table-cell">
                    <p className="truncate">{item.description || "-"}</p>
                  </td>
                  <td className="py-4 text-right">
                    <span className="text-[15px] font-bold text-[#3182F6]">+{formatCurrency(item.add_price, currencyCode)}</span>
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
                            addPrice: String(item.add_price),
                            image: item.image || "",
                            sortOrder: String(item.sort_order || 0),
                          });
                          setEditingId(item.id);
                          setOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#4E5968] hover:bg-[#E5E8EB] hover:text-[#191F28]"
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
