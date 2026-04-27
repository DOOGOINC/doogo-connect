"use client";

import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import { useEffect } from "react";
import { uploadCatalogImage } from "@/lib/catalogImageUpload";
import type { CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import {
  type ContainerRow,
  type DiscountRow,
  type ProductForm,
  type ProductRow,
  createCatalogEntityId,
  createProductForm,
  parseLines,
} from "./productCatalogShared";
import {
  createNewContainerForm,
  createNewOptionForm,
  createNewPackageForm,
  type ExtraRow,
  type PackageRow,
  type ProductManagementSection,
  type ServiceRow,
} from "./productCatalogManager.types";
import type { NewContainerForm, NewOptionForm, NewPackageForm } from "./product-catalog/ProductCatalogLinkedOptions";

type UseProductCatalogActionsParams = {
  manufacturerId: number;
  activeCurrency: CurrencyCode;
  activeSection: ProductManagementSection;
  onSectionChange: (section: ProductManagementSection) => void;
  items: ProductRow[];
  formContainers: ContainerRow[];
  formServices: ServiceRow[];
  formPackages: PackageRow[];
  formExtras: ExtraRow[];
  loadItems: () => Promise<void>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  containerImageInputRef: RefObject<HTMLInputElement | null>;
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  newContainers: NewContainerForm[];
  setNewContainers: Dispatch<SetStateAction<NewContainerForm[]>>;
  newServices: NewOptionForm[];
  setNewServices: Dispatch<SetStateAction<NewOptionForm[]>>;
  newPackages: NewPackageForm[];
  setNewPackages: Dispatch<SetStateAction<NewPackageForm[]>>;
  newExtras: NewOptionForm[];
  setNewExtras: Dispatch<SetStateAction<NewOptionForm[]>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  editingId: string | null;
  setEditingId: Dispatch<SetStateAction<string | null>>;
  setActiveCurrency: Dispatch<SetStateAction<CurrencyCode>>;
  setToastMessage: Dispatch<SetStateAction<string>>;
  setImageUploading: Dispatch<SetStateAction<boolean>>;
  setContainerImageUploading: Dispatch<SetStateAction<boolean>>;
  activeContainerDraftIndex: number | null;
  setActiveContainerDraftIndex: Dispatch<SetStateAction<number | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
};

export function useProductCatalogActions({
  manufacturerId,
  activeCurrency,
  activeSection,
  onSectionChange,
  items,
  formContainers,
  formServices,
  formPackages,
  formExtras,
  loadItems,
  imageInputRef,
  containerImageInputRef,
  form,
  setForm,
  newContainers,
  setNewContainers,
  newServices,
  setNewServices,
  newPackages,
  setNewPackages,
  newExtras,
  setNewExtras,
  setOpen,
  editingId,
  setEditingId,
  setActiveCurrency,
  setToastMessage,
  setImageUploading,
  setContainerImageUploading,
  activeContainerDraftIndex,
  setActiveContainerDraftIndex,
  setSaving,
}: UseProductCatalogActionsParams) {
  const isEdit = editingId !== null;

  useEffect(() => {
    if (activeSection === "product-create") {
      setOpen(true);
      if (!editingId) {
        setForm((prev) => (prev.id || prev.name || prev.category ? prev : { ...createProductForm(), paymentCurrency: activeCurrency }));
      }
      return;
    }

    if (!editingId) {
      setOpen(false);
    }
  }, [activeCurrency, activeSection, editingId, setForm, setOpen]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      containerIds: prev.containerIds.filter((id) => formContainers.some((item) => item.id === id)),
      designServiceIds: prev.designServiceIds.filter((id) => formServices.some((item) => item.id === id)),
      designPackageIds: prev.designPackageIds.filter((id) => formPackages.some((item) => item.id === id)),
      designExtraIds: prev.designExtraIds.filter((id) => formExtras.some((item) => item.id === id)),
    }));
  }, [form.paymentCurrency, formContainers, formExtras, formPackages, formServices, setForm]);

  const resetEditorState = () => {
    setForm({ ...createProductForm(), paymentCurrency: activeCurrency });
    setNewContainers([createNewContainerForm()]);
    setNewServices([createNewOptionForm()]);
    setNewPackages([createNewPackageForm()]);
    setNewExtras([createNewOptionForm()]);
    setEditingId(null);
    setImageUploading(false);
    setContainerImageUploading(false);
    setActiveContainerDraftIndex(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (containerImageInputRef.current) containerImageInputRef.current.value = "";
  };

  const closeEditor = () => {
    resetEditorState();
    setOpen(false);
    onSectionChange("product-list");
  };

  const openCreateForm = () => {
    resetEditorState();
    setForm({ ...createProductForm(), paymentCurrency: activeCurrency });
    setOpen(true);
    onSectionChange("product-create");
  };

  const toggleSelection = (field: "containerIds" | "designServiceIds" | "designPackageIds" | "designExtraIds", id: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id) ? prev[field].filter((itemId) => itemId !== id) : [...prev[field], id],
    }));
  };

  const updateDiscount = (index: number, field: keyof DiscountRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      discountRows: prev.discountRows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    }));
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const imageUrl = await uploadCatalogImage({
        file,
        manufacturerId,
        entity: "products",
        entityId: form.id.trim() || `draft-${manufacturerId}`,
      });
      setForm((prev) => ({ ...prev, image: imageUrl }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "상품 이미지 업로드에 실패했습니다.");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const handleContainerImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || activeContainerDraftIndex === null) return;

    setContainerImageUploading(true);
    try {
      const imageUrl = await uploadCatalogImage({
        file,
        manufacturerId,
        entity: "containers",
        entityId: `draft-${manufacturerId}`,
      });
      setNewContainers((prev) =>
        prev.map((item, index) => (index === activeContainerDraftIndex ? { ...item, image: imageUrl } : item))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "용기 이미지 업로드에 실패했습니다.");
    } finally {
      setContainerImageUploading(false);
      setActiveContainerDraftIndex(null);
      event.target.value = "";
    }
  };

  const createPendingOptions = async () => {
    const created: Array<{ table: string; id: string }> = [];
    const nextContainerIds = [...form.containerIds];
    const nextServiceIds = [...form.designServiceIds];
    const nextPackageIds = [...form.designPackageIds];
    const nextExtraIds = [...form.designExtraIds];

    for (const container of newContainers) {
      if (!container.name.trim()) continue;
      const id = createCatalogEntityId("CONT");
      const result = await supabase.from("manufacturer_container_options").insert({
        id,
        manufacturer_id: manufacturerId,
        name: container.name.trim(),
        description: container.description.trim(),
        add_price: Number(container.addPrice || 0),
        image: container.image || null,
        sort_order: Number(container.sortOrder || 0),
        payment_currency: form.paymentCurrency,
        is_active: true,
      });
      if (result.error) throw new Error(result.error.message);
      created.push({ table: "manufacturer_container_options", id });
      nextContainerIds.push(id);
    }

    for (const service of newServices) {
      if (!service.name.trim()) continue;
      const id = createCatalogEntityId("SRV");
      const result = await supabase.from("manufacturer_design_services").insert({
        id,
        manufacturer_id: manufacturerId,
        name: service.name.trim(),
        description: service.description.trim(),
        price: Number(service.price || 0),
        sort_order: Number(service.sortOrder || 0),
        payment_currency: form.paymentCurrency,
        is_active: true,
      });
      if (result.error) throw new Error(result.error.message);
      created.push({ table: "manufacturer_design_services", id });
      nextServiceIds.push(id);
    }

    for (const item of newPackages) {
      if (!item.name.trim()) continue;
      const id = createCatalogEntityId("PKG");
      const result = await supabase.from("manufacturer_design_packages").insert({
        id,
        manufacturer_id: manufacturerId,
        name: item.name.trim(),
        badge: item.badge.trim(),
        description: item.description.trim(),
        price: Number(item.price || 0),
        included: parseLines(item.includedText),
        sort_order: Number(item.sortOrder || 0),
        payment_currency: form.paymentCurrency,
        is_active: true,
      });
      if (result.error) throw new Error(result.error.message);
      created.push({ table: "manufacturer_design_packages", id });
      nextPackageIds.push(id);
    }

    for (const extra of newExtras) {
      if (!extra.name.trim()) continue;
      const id = createCatalogEntityId("EXT");
      const result = await supabase.from("manufacturer_design_extras").insert({
        id,
        manufacturer_id: manufacturerId,
        name: extra.name.trim(),
        description: extra.description.trim(),
        price: Number(extra.price || 0),
        sort_order: Number(extra.sortOrder || 0),
        payment_currency: form.paymentCurrency,
        is_active: true,
      });
      if (result.error) throw new Error(result.error.message);
      created.push({ table: "manufacturer_design_extras", id });
      nextExtraIds.push(id);
    }

    return {
      created,
      containerIds: Array.from(new Set(nextContainerIds)),
      designServiceIds: Array.from(new Set(nextServiceIds)),
      designPackageIds: Array.from(new Set(nextPackageIds)),
      designExtraIds: Array.from(new Set(nextExtraIds)),
    };
  };

  const handleSave = async () => {
    const nextId = form.id.trim() || createCatalogEntityId("PROD");
    const lockedCurrency = isEdit ? (items.find((item) => item.id === editingId)?.payment_currency || form.paymentCurrency) : form.paymentCurrency;

    if (!form.category.trim() || !form.name.trim()) {
      alert("카테고리와 상품명은 필수입니다.");
      return;
    }

    if (!isEdit && items.some((item) => item.id === nextId)) {
      alert("같은 ID의 상품이 이미 존재합니다.");
      return;
    }

    const discountConfig = Object.fromEntries(
      form.discountRows
        .map((row) => [row.qty.trim(), row.discount.trim()] as const)
        .filter(([qty, discount]) => qty && discount)
        .map(([qty, discount]) => [qty, Number(discount)])
    );

    setSaving(true);
    let createdRecords: Array<{ table: string; id: string }> = [];

    try {
      const createdOptions = await createPendingOptions();
      createdRecords = createdOptions.created;

      const payload = {
        manufacturer_id: manufacturerId,
        category: form.category.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        payment_currency: lockedCurrency,
        cost_price: form.costPrice.trim() ? Number(form.costPrice) : 0,
        base_price: Number(form.basePrice || 0),
        discount_config: discountConfig,
        image: form.image || null,
        key_features: parseLines(form.keyFeatures),
        ingredients: parseLines(form.ingredients),
        directions: parseLines(form.directions),
        cautions: parseLines(form.cautions),
        container_ids: createdOptions.containerIds,
        design_service_ids: createdOptions.designServiceIds,
        design_package_ids: createdOptions.designPackageIds,
        design_extra_ids: createdOptions.designExtraIds,
        is_active: true,
      };

      const result = isEdit
        ? await supabase.from("manufacturer_products").update(payload).eq("id", editingId)
        : await supabase.from("manufacturer_products").insert({ id: nextId, ...payload });

      if (result.error) throw new Error(result.error.message);

      await loadItems();
      setActiveCurrency(lockedCurrency);
      setToastMessage(isEdit ? "상품 정보가 수정되었습니다." : "상품이 등록되었습니다.");
      closeEditor();
    } catch (error) {
      for (const record of createdRecords.reverse()) {
        await supabase.from(record.table).delete().eq("id", record.id);
      }
      alert(error instanceof Error ? error.message : "상품 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 상품을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("manufacturer_products").delete().eq("id", id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }
    await loadItems();
  };

  const handleToggleActive = async (item: ProductRow) => {
    const nextActive = item.is_active === false;
    const { error } = await supabase.from("manufacturer_products").update({ is_active: nextActive }).eq("id", item.id);
    if (error) {
      alert(`상태 변경 실패: ${error.message}`);
      return;
    }
    await loadItems();
    setToastMessage(nextActive ? "상품이 활성화되었습니다." : "상품이 비활성화되었습니다.");
  };

  return {
    isEdit,
    open,
    closeEditor,
    openCreateForm,
    resetEditorState,
    toggleSelection,
    updateDiscount,
    handleImageSelect,
    handleContainerImageSelect,
    handleSave,
    handleDelete,
    handleToggleActive,
  };
}
