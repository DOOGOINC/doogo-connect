"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/currency";
import { CatalogToast } from "./CatalogToast";
import { ProductCatalogList } from "./ProductCatalogList";
import { ProductCatalogEditor } from "./product-catalog/ProductCatalogEditor";
import type { NewContainerForm, NewOptionForm, NewPackageForm } from "./product-catalog/ProductCatalogLinkedOptions";
import { type ProductForm, createProductForm } from "./productCatalogShared";
import {
  createNewContainerForm,
  createNewOptionForm,
  createNewPackageForm,
  type ProductManagementSection,
} from "./productCatalogManager.types";
import { useProductCatalogActions } from "./useProductCatalogActions";
import { useProductCatalogData } from "./useProductCatalogData";

type ProductCatalogManagerProps = {
  manufacturerId: number;
  currencyCode: CurrencyCode;
  activeSection: ProductManagementSection;
  onSectionChange: (section: ProductManagementSection) => void;
};

export function ProductCatalogManager({
  manufacturerId,
  currencyCode,
  activeSection,
  onSectionChange,
}: ProductCatalogManagerProps) {
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>("USD");
  const [form, setForm] = useState<ProductForm>(() => ({ ...createProductForm(), paymentCurrency: currencyCode }));
  const [newContainers, setNewContainers] = useState<NewContainerForm[]>([createNewContainerForm()]);
  const [newServices, setNewServices] = useState<NewOptionForm[]>([createNewOptionForm()]);
  const [newPackages, setNewPackages] = useState<NewPackageForm[]>([createNewPackageForm()]);
  const [newExtras, setNewExtras] = useState<NewOptionForm[]>([createNewOptionForm()]);
  const [open, setOpen] = useState(activeSection === "product-create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [containerImageUploading, setContainerImageUploading] = useState(false);
  const [activeContainerDraftIndex, setActiveContainerDraftIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const containerImageInputRef = useRef<HTMLInputElement>(null);

  const data = useProductCatalogData({
    manufacturerId,
    currencyCode,
    activeCurrency,
    form,
    newContainers,
  });

  const actions = useProductCatalogActions({
    manufacturerId,
    activeCurrency,
    activeSection,
    onSectionChange,
    items: data.items,
    formContainers: data.formContainers,
    formServices: data.formServices,
    formPackages: data.formPackages,
    formExtras: data.formExtras,
    loadItems: data.loadItems,
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
  });

  return (
    <section className="space-y-8">
      {toastMessage ? <CatalogToast message={toastMessage} onClose={() => setToastMessage("")} /> : null}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:p-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-bold text-[#191F28]">{activeSection === "product-create" ? "OEM 상품 등록" : "OEM 상품 리스트"}</h2>
            <span className="rounded-full  px-3 py-1 text-[13px] font-bold text-[#3182F6]">총 {data.filteredProducts.length}개</span>
          </div>
        </div>

        {activeSection === "product-list" ? (
          <button
            type="button"
            onClick={actions.openCreateForm}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#3182F6] px-6 text-[15px] font-bold text-white shadow-lg shadow-[#3182F6]/20 transition hover:bg-[#1B64DA]"
          >
            <Plus className="h-5 w-5" />
            상품 추가하기
          </button>
        ) : null}
      </div>

      <div className="rounded-[14px] border border-[#E5E8EB] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8EB] px-4 py-4 sm:px-6">
          {CURRENCY_OPTIONS.map((option) => {
            const isActive = activeCurrency === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setActiveCurrency(option)}
                className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${isActive ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E9EEF5]"
                  }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {open ? (
            <ProductCatalogEditor
              visible={open}
              isEdit={actions.isEdit}
              form={form}
              currencyOptions={CURRENCY_OPTIONS}
              containers={data.formContainers}
              designServices={data.formServices}
              designPackages={data.formPackages}
              designExtras={data.formExtras}
              newContainers={newContainers}
              newServices={newServices}
              newPackages={newPackages}
              newExtras={newExtras}
              saving={saving}
              imageUploading={imageUploading}
              containerImageUploading={containerImageUploading}
              imageInputRef={imageInputRef}
              containerImageInputRef={containerImageInputRef}
              onCancel={actions.closeEditor}
              onSave={actions.handleSave}
              onFormChange={setForm}
              onNewContainersChange={setNewContainers}
              onNewServicesChange={setNewServices}
              onNewPackagesChange={setNewPackages}
              onNewExtrasChange={setNewExtras}
              onToggleContainer={(containerId) => actions.toggleSelection("containerIds", containerId)}
              onToggleDesignService={(serviceId) => actions.toggleSelection("designServiceIds", serviceId)}
              onToggleDesignPackage={(packageId) => actions.toggleSelection("designPackageIds", packageId)}
              onToggleDesignExtra={(extraId) => actions.toggleSelection("designExtraIds", extraId)}
              onUpdateDiscount={actions.updateDiscount}
              onImageSelect={actions.handleImageSelect}
              onContainerImageSelect={actions.handleContainerImageSelect}
              onOpenContainerImagePicker={(index) => {
                setActiveContainerDraftIndex(index);
                containerImageInputRef.current?.click();
              }}
              onImageRemove={() => setForm((prev) => ({ ...prev, image: "" }))}
              onContainerImageRemove={(index) =>
                setNewContainers((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, image: "" } : item)))
              }
              resolveImageUrl={data.resolveImageUrl}
            />
          ) : data.loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="h-10 w-10 animate-spin text-[#3182F6]" />
              <p className="mt-4 text-[15px] font-medium text-[#8B95A1]">상품 정보를 불러오는 중입니다...</p>
            </div>
          ) : activeSection === "product-list" ? (
            <ProductCatalogList
              items={data.filteredProducts}
              currencyCode={activeCurrency}
              containerNames={data.containerNames}
              serviceNames={data.serviceNames}
              packageNames={data.packageNames}
              extraNames={data.extraNames}
              onDelete={actions.handleDelete}
              onToggleActive={actions.handleToggleActive}
              onEdit={(nextForm) => {
                actions.resetEditorState();
                setActiveCurrency(nextForm.paymentCurrency);
                setForm(nextForm);
                setEditingId(nextForm.id);
                setOpen(true);
                onSectionChange("product-create");
              }}
              mapItemToForm={data.mapItemToForm}
              resolveImageUrl={data.resolveImageUrl}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
