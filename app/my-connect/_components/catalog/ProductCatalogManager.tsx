"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { CurrencyCode } from "@/lib/currency";

import { supabase } from "@/lib/supabase";
import { uploadCatalogImage } from "@/lib/catalogImageUpload";

import { CatalogToast } from "./CatalogToast";
import { ProductCatalogForm } from "./ProductCatalogForm";
import { ProductCatalogList } from "./ProductCatalogList";
import {
  ContainerRow,
  DiscountRow,
  ProductForm,
  ProductRow,
  createDiscountRows,
  createProductForm,
  joinLines,
  parseLines,
} from "./productCatalogShared";

export function ProductCatalogManager({ manufacturerId, currencyCode }: { manufacturerId: number; currencyCode: CurrencyCode }) {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [form, setForm] = useState<ProductForm>(createProductForm());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEdit = editingId !== null;

  const containerNames = useMemo(
    () => Object.fromEntries(containers.map((container) => [container.id, container.name])),
    [containers]
  );

  const loadItems = async () => {
    setLoading(true);
    const [productsResult, containersResult] = await Promise.all([
      supabase
        .from("manufacturer_products")
        .select("*")
        .eq("manufacturer_id", manufacturerId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("manufacturer_container_options")
        .select("id, name")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true }),
    ]);

    setItems((productsResult.data || []) as ProductRow[]);
    setContainers((containersResult.data || []) as ContainerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      setLoading(true);
      const [productsResult, containersResult] = await Promise.all([
        supabase
          .from("manufacturer_products")
          .select("*")
          .eq("manufacturer_id", manufacturerId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("manufacturer_container_options")
          .select("id, name")
          .eq("manufacturer_id", manufacturerId)
          .order("sort_order", { ascending: true }),
      ]);

      if (!ignore) {
        setItems((productsResult.data || []) as ProductRow[]);
        setContainers((containersResult.data || []) as ContainerRow[]);
        setLoading(false);
      }
    };

    void initialize();

    return () => {
      ignore = true;
    };
  }, [manufacturerId]);

  const resetForm = () => {
    setForm(createProductForm());
    setOpen(false);
    setEditingId(null);
    setImageUploading(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const openCreateModal = () => {
    setForm(createProductForm());
    setEditingId(null);
    setOpen(true);
  };

  const toggleContainer = (containerId: string) => {
    setForm((prev) => ({
      ...prev,
      containerIds: prev.containerIds.includes(containerId)
        ? prev.containerIds.filter((id) => id !== containerId)
        : [...prev.containerIds, containerId],
    }));
  };

  const updateDiscount = (index: number, field: keyof DiscountRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      discountRows: prev.discountRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
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
        entity: "products",
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

    if (!nextId || !form.category.trim() || !form.name.trim()) {
      alert("제품 ID, 카테고리, 제품명은 필수입니다.");
      return;
    }

    if (!isEdit && items.some((item) => item.id === nextId)) {
      alert("이미 사용 중인 제품 ID입니다. 다른 ID를 입력해주세요.");
      return;
    }

    const discountConfig = Object.fromEntries(
      form.discountRows
        .map((row) => [row.qty.trim(), row.discount.trim()] as const)
        .filter(([qty, discount]) => qty && discount)
        .map(([qty, discount]) => [qty, Number(discount)])
    );

    const payload = {
      manufacturer_id: manufacturerId,
      category: form.category.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      payment_currency: currencyCode,
      base_price: Number(form.basePrice || 0),
      discount_config: discountConfig,
      image: form.image || null,
      key_features: parseLines(form.keyFeatures),
      ingredients: parseLines(form.ingredients),
      directions: parseLines(form.directions),
      cautions: parseLines(form.cautions),
      container_ids: form.containerIds,
      is_active: true,
    };

    setSaving(true);
    const result = isEdit
      ? await supabase.from("manufacturer_products").update(payload).eq("id", editingId)
      : await supabase.from("manufacturer_products").insert({
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
    setToastMessage(isEdit ? "상품 수정 내용이 반영되었습니다." : "새 상품이 카탈로그에 등록되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말로 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("manufacturer_products").delete().eq("id", id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }

    await loadItems();
  };

  const handleToggleActive = async (item: ProductRow) => {
    const nextActive = item.is_active === false;
    const actionLabel = nextActive ? "활성화" : "비활성화";

    if (!window.confirm(`이 제품을 ${actionLabel}하시겠습니까?`)) return;

    const { error } = await supabase
      .from("manufacturer_products")
      .update({ is_active: nextActive })
      .eq("id", item.id);

    if (error) {
      alert(`${actionLabel} 실패: ${error.message}`);
      return;
    }

    await loadItems();
    setToastMessage(nextActive ? "제품이 다시 활성화되었습니다." : "제품이 비활성화되었습니다.");
  };

  const mapItemToForm = (item: ProductRow): ProductForm => ({
    id: item.id,
    category: item.category,
    name: item.name,
    description: item.description || "",
    paymentCurrency: item.payment_currency || "USD",
    basePrice: String(item.base_price),
    image: item.image || "",
    keyFeatures: joinLines(item.key_features),
    ingredients: joinLines(item.ingredients),
    directions: joinLines(item.directions),
    cautions: joinLines(item.cautions),
    containerIds: item.container_ids || [],
    discountRows:
      item.discount_config && Object.keys(item.discount_config).length > 0
        ? Object.entries(item.discount_config).map(([qty, discount]) => ({
          qty,
          discount: String(discount),
        }))
        : createDiscountRows(),
  });

  return (
    <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm md:p-8">
      {toastMessage ? <CatalogToast message={toastMessage} onClose={() => setToastMessage("")} /> : null}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold text-[#191F28]">제품 카탈로그</h2>
            <span className="rounded-[999px] bg-[#F2F8FF] px-2.5 py-1 text-[12px] font-semibold text-[#3182F6]">
              {items.length}
            </span>
          </div>
          <p className="mt-1 text-[14px] text-[#8B95A1]">상품 기본 정보와 연결 용기, 할인 구간을 관리합니다.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#3182F6] px-5 text-[14px] font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-[#1B64DA]"
        >
          <Plus className="h-4 w-4" />
          제품 추가
        </button>
      </div>

      <ProductCatalogForm
        open={open}
        isEdit={isEdit}
        form={form}
        currencyCode={currencyCode}
        containers={containers}
        saving={saving}
        imageUploading={imageUploading}
        imageInputRef={imageInputRef}
        onClose={resetForm}
        onSave={handleSave}
        onFormChange={setForm}
        onToggleContainer={toggleContainer}
        onUpdateDiscount={updateDiscount}
        onImageSelect={handleImageSelect}
        onImageRemove={() => setForm((prev) => ({ ...prev, image: "" }))}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-[#3182F6]" />
          <p className="mt-4 text-sm font-medium text-[#8B95A1]">데이터를 불러오고 있습니다...</p>
        </div>
      ) : (
        <ProductCatalogList
          items={items}
          containerNames={containerNames}
          mapItemToForm={mapItemToForm}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onEdit={(nextForm) => {
            setForm(nextForm);
            setEditingId(nextForm.id);
            setOpen(true);
          }}
        />
      )}
    </section>
  );
}
