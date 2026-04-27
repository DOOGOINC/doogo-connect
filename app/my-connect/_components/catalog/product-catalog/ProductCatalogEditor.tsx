/* eslint-disable @next/next/no-img-element */
import type { ChangeEvent, RefObject } from "react";
import { AlertCircle, ChevronLeft, ImagePlus, Info, Loader2, PlusCircle, Save, Settings2, Trash2 } from "lucide-react";
import { CURRENCY_LABELS, type CurrencyCode } from "@/lib/currency";
import type { DiscountRow, ProductForm } from "../productCatalogShared";
import {
  ProductCatalogLinkedOptions,
  type NewContainerForm,
  type NewOptionForm,
  type NewPackageForm,
} from "./ProductCatalogLinkedOptions";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number | null;
};

type PackageRow = {
  id: string;
  name: string;
  badge: string | null;
  description: string | null;
  price: number;
  included: string[] | null;
  sort_order: number | null;
};

type ExtraRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number | null;
};

type ProductCatalogEditorProps = {
  visible: boolean;
  isEdit: boolean;
  form: ProductForm;
  currencyOptions: CurrencyCode[];
  containers: Array<{ id: string; name: string; description?: string | null; add_price?: number; image?: string | null; sort_order?: number | null }>;
  designServices: ServiceRow[];
  designPackages: PackageRow[];
  designExtras: ExtraRow[];
  newContainers: NewContainerForm[];
  newServices: NewOptionForm[];
  newPackages: NewPackageForm[];
  newExtras: NewOptionForm[];
  saving: boolean;
  imageUploading: boolean;
  containerImageUploading: boolean;
  imageInputRef: RefObject<HTMLInputElement | null>;
  containerImageInputRef: RefObject<HTMLInputElement | null>;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (updater: (prev: ProductForm) => ProductForm) => void;
  onNewContainersChange: (updater: (prev: NewContainerForm[]) => NewContainerForm[]) => void;
  onNewServicesChange: (updater: (prev: NewOptionForm[]) => NewOptionForm[]) => void;
  onNewPackagesChange: (updater: (prev: NewPackageForm[]) => NewPackageForm[]) => void;
  onNewExtrasChange: (updater: (prev: NewOptionForm[]) => NewOptionForm[]) => void;
  onToggleContainer: (containerId: string) => void;
  onToggleDesignService: (serviceId: string) => void;
  onToggleDesignPackage: (packageId: string) => void;
  onToggleDesignExtra: (extraId: string) => void;
  onUpdateDiscount: (index: number, field: keyof DiscountRow, value: string) => void;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onContainerImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenContainerImagePicker: (index: number) => void;
  onImageRemove: () => void;
  onContainerImageRemove: (index: number) => void;
  resolveImageUrl: (pathOrUrl: string | null | undefined) => string;
};

const detailFields: Array<{
  label: string;
  value: keyof Pick<ProductForm, "keyFeatures" | "ingredients" | "directions" | "cautions">;
}> = [
    { label: "주요 특징", value: "keyFeatures" },
    { label: "성분", value: "ingredients" },
    { label: "사용 방법", value: "directions" },
    { label: "주의 사항", value: "cautions" },
  ];

const labelClassName = "mb-2 block text-[14px] font-bold text-[#3A3E41]";

const inputClassName =
  "h-12 w-full rounded-[10px] border border-[#E5E8EB] bg-white px-4 text-[14px] text-[#191F28] outline-none transition placeholder:text-[#ADB5BD] focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/5";

const textareaClassName =
  "w-full rounded-[10px] border border-[#E5E8EB] bg-white p-4 text-[14px] text-[#191F28] outline-none transition placeholder:text-[#ADB5BD] focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/5";

export function ProductCatalogEditor({
  visible,
  isEdit,
  form,
  currencyOptions,
  containers,
  designServices,
  designPackages,
  designExtras,
  newContainers,
  newServices,
  newPackages,
  newExtras,
  saving,
  imageUploading,
  containerImageUploading,
  imageInputRef,
  containerImageInputRef,
  onCancel,
  onSave,
  onFormChange,
  onNewContainersChange,
  onNewServicesChange,
  onNewPackagesChange,
  onNewExtrasChange,
  onToggleContainer,
  onToggleDesignService,
  onToggleDesignPackage,
  onToggleDesignExtra,
  onUpdateDiscount,
  onImageSelect,
  onContainerImageSelect,
  onOpenContainerImagePicker,
  onImageRemove,
  onContainerImageRemove,
  resolveImageUrl,
}: ProductCatalogEditorProps) {
  if (!visible) return null;

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E8EB] bg-white text-[#4E5968] transition hover:bg-[#F8F9FA]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-[24px] font-bold text-[#191F28]">{isEdit ? "상품 수정" : "상품 등록"}</h2>
            <p className="text-[14px] text-[#8B95A1]">
              {isEdit ? "기존 상품 정보를 수정합니다." : "제조 가능한 상품 정보를 상세히 입력해주세요."}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-[12px] border border-[#E5E8EB] bg-white px-6 text-[14px] font-bold text-[#4E5968] transition hover:bg-[#F8F9FA]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || imageUploading || containerImageUploading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#3182F6] px-8 text-[14px] font-bold text-white transition hover:bg-[#1B64DA] disabled:bg-[#CBD5E1]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "수정 완료" : "상품 저장"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F8FF]">
                <Info className="h-4 w-4 text-[#3182F6]" />
              </div>
              <h3 className="text-[18px] font-bold text-[#191F28]">기본 정보</h3>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className={labelClassName}>상품 ID</label>
                  <input value={form.id} disabled className={`${inputClassName} bg-[#F9FAFB] text-[#8B95A1]`} placeholder="자동 생성" />
                </div>
                <div>
                  <label className={labelClassName}>카테고리</label>
                  <input
                    value={form.category}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, category: e.target.value }))}
                    className={inputClassName}
                    placeholder="예: 스킨케어, 헤어케어"
                  />
                </div>
              </div>

              <div>
                <label className={labelClassName}>상품명</label>
                <input
                  value={form.name}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClassName}
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div>
                <label className={labelClassName}>상품 설명</label>
                <textarea
                  value={form.description}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, description: e.target.value }))}
                  className={`${textareaClassName} h-32 resize-none`}
                  placeholder="상품 설명을 입력하세요"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClassName}>결제 통화</label>
                  <select
                    value={form.paymentCurrency}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, paymentCurrency: e.target.value as CurrencyCode }))}
                    className={inputClassName}
                    disabled={isEdit}
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {CURRENCY_LABELS[currency]}
                      </option>
                    ))}
                  </select>
                  {isEdit ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[#F04452]">
                      <AlertCircle className="h-3 w-3" />
                      저장 후에는 결제 통화를 바꿀 수 없습니다.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={labelClassName}>기본 가격</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={form.basePrice}
                      onChange={(e) => onFormChange((prev) => ({ ...prev, basePrice: e.target.value }))}
                      className={`${inputClassName} pr-14 font-bold text-[#3182F6]`}
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-[#8B95A1]">
                      {form.paymentCurrency}
                    </span>
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>원가</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={form.costPrice}
                      onChange={(e) => onFormChange((prev) => ({ ...prev, costPrice: e.target.value }))}
                      className={inputClassName}
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-[#8B95A1]">
                      {form.paymentCurrency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F8FF]">
                <Settings2 className="h-4 w-4 text-[#3182F6]" />
              </div>
              <h3 className="text-[18px] font-bold text-[#191F28]">상세 정보</h3>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {detailFields.map((field) => (
                <div key={field.value}>
                  <label className={labelClassName}>{field.label}</label>
                  <textarea
                    value={form[field.value]}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, [field.value]: e.target.value }))}
                    className={`${textareaClassName} h-40 resize-none`}
                    placeholder={`${field.label}을 줄바꿈으로 입력하세요`}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[16px] border border-[#E5E8EB] bg-[#F8FAFC] p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#191F28]">수량별 할인</h3>
                <span className="text-[13px] text-[#8B95A1]">최소 주문 수량 기준 할인율</span>
              </div>
              <button
                type="button"
                onClick={() => onFormChange((prev) => ({ ...prev, discountRows: [...prev.discountRows, { qty: "", discount: "" }] }))}
                className="flex items-center gap-1 text-[14px] font-bold text-[#3182F6] transition hover:text-[#1B64DA]"
              >
                <PlusCircle className="h-4 w-4" />
                구간 추가
              </button>
            </div>

            {form.discountRows.length ? (
              <div className="space-y-4">
                {form.discountRows.map((row, index) => (
                  <div key={`discount-row-${index}`} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          value={row.qty}
                          onChange={(e) => onUpdateDiscount(index, "qty", e.target.value)}
                          className={inputClassName}
                          placeholder="최소 수량"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[#8B95A1]">개 이상</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          value={row.discount}
                          onChange={(e) => onUpdateDiscount(index, "discount", e.target.value)}
                          className={`${inputClassName} font-bold text-[#3182F6]`}
                          placeholder="할인율"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#3182F6]">% 할인</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFormChange((prev) => ({ ...prev, discountRows: prev.discountRows.filter((_, rowIndex) => rowIndex !== index) }))}
                      className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#FFE5E5] bg-white text-[#F04452] transition hover:bg-[#FFF0F0]"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D1D5DB] py-8 text-[14px] text-[#8B95A1]">
                등록된 할인 구간이 없습니다.
              </div>
            )}
          </section>

          <ProductCatalogLinkedOptions
            form={form}
            containers={containers}
            designServices={designServices}
            designPackages={designPackages}
            designExtras={designExtras}
            newContainers={newContainers}
            newServices={newServices}
            newPackages={newPackages}
            newExtras={newExtras}
            containerImageUploading={containerImageUploading}
            containerImageInputRef={containerImageInputRef}
            onNewContainersChange={onNewContainersChange}
            onNewServicesChange={onNewServicesChange}
            onNewPackagesChange={onNewPackagesChange}
            onNewExtrasChange={onNewExtrasChange}
            onToggleContainer={onToggleContainer}
            onToggleDesignService={onToggleDesignService}
            onToggleDesignPackage={onToggleDesignPackage}
            onToggleDesignExtra={onToggleDesignExtra}
            onContainerImageSelect={onContainerImageSelect}
            onOpenContainerImagePicker={onOpenContainerImagePicker}
            onContainerImageRemove={onContainerImageRemove}
            resolveImageUrl={resolveImageUrl}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-[16px] font-bold text-[#191F28]">상품 이미지</h3>
              <div className="group relative aspect-square overflow-hidden rounded-[12px] border border-[#E5E8EB] bg-[#F9FAFB]">
                {resolveImageUrl(form.image) ? (
                  <>
                    <img src={resolveImageUrl(form.image)} alt="상품 이미지" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#191F28]"
                      >
                        이미지 교체
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#8B95A1] transition hover:bg-[#F2F8FF] hover:text-[#3182F6]"
                  >
                    {imageUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <ImagePlus className="h-10 w-10" />}
                    <span className="text-[14px] font-medium">이미지 업로드</span>
                  </button>
                )}
                <input ref={imageInputRef} type="file" hidden accept="image/*" onChange={onImageSelect} />
              </div>

              {form.image ? (
                <button
                  type="button"
                  onClick={onImageRemove}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#FFE5E5] bg-white py-2.5 text-[13px] font-bold text-[#F04452] transition hover:bg-[#FFF0F0]"
                >
                  <Trash2 className="h-4 w-4" />
                  이미지 삭제
                </button>
              ) : null}

              <div className="mt-6 border-t border-[#F2F4F6] pt-6">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#8B95A1]">등록 상태</span>
                  <span className="font-bold text-[#3182F6]">{isEdit ? "수정 중" : "신규 등록"}</span>
                </div>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || imageUploading || containerImageUploading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#191F28] py-4 text-[15px] font-bold text-white transition hover:bg-black disabled:bg-[#CBD5E1]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? "변경 사항 저장" : "상품 저장"}
                </button>
              </div>
            </section>

            <section className="rounded-[16px] border border-[#E5E8EB] bg-[#F2F8FF] p-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#3182F6]" />
                <div className="text-[13px] leading-relaxed text-[#4E5968]">
                  <p className="font-bold text-[#3182F6]">안내</p>
                  <p className="mt-1">카테고리와 상품명은 필수입니다. 결제 통화는 등록 시에만 선택할 수 있고 저장 후에는 잠깁니다.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
