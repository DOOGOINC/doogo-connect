/* eslint-disable @next/next/no-img-element */
import type { ChangeEvent, RefObject } from "react";
import { Boxes, ImagePlus, Info, Loader2, Save, Settings2, Trash2, Upload } from "lucide-react";
import type { CurrencyCode } from "@/lib/currency";
import { getCatalogImageUrl } from "@/lib/catalogImageUpload";

import { CatalogModal } from "./CatalogModal";
import { ContainerRow, DiscountRow, ProductForm } from "./productCatalogShared";

type ProductCatalogFormProps = {
  open: boolean;
  isEdit: boolean;
  form: ProductForm;
  currencyCode: CurrencyCode;
  containers: ContainerRow[];
  saving: boolean;
  imageUploading: boolean;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (updater: (prev: ProductForm) => ProductForm) => void;
  onToggleContainer: (containerId: string) => void;
  onUpdateDiscount: (index: number, field: keyof DiscountRow, value: string) => void;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
};

const detailFields: Array<{
  label: string;
  value: keyof Pick<ProductForm, "keyFeatures" | "ingredients" | "directions" | "cautions">;
}> = [
    { label: "주요 특징", value: "keyFeatures" },
    { label: "전성분", value: "ingredients" },
    { label: "사용 방법", value: "directions" },
    { label: "주의 사항", value: "cautions" },
  ];

const inputClassName =
  "h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 disabled:bg-[#F2F4F6] disabled:text-[#98A2B3]";

const textareaClassName =
  "w-full rounded-[14px] border border-[#D8E0E8] bg-white p-4 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10";

export function ProductCatalogForm({
  open,
  isEdit,
  form,
  currencyCode,
  containers,
  saving,
  imageUploading,
  imageInputRef,
  onClose,
  onSave,
  onFormChange,
  onToggleContainer,
  onUpdateDiscount,
  onImageSelect,
  onImageRemove,
}: ProductCatalogFormProps) {
  return (
    <CatalogModal
      open={open}
      onClose={onClose}
      badge={isEdit ? "제품 수정" : "제품 등록"}
      title={isEdit ? "제품 정보를 수정합니다" : "새 제품을 등록합니다"}
      description=""
      maxWidthClassName="max-w-5xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-[14px] border border-[#D8E0E8] bg-white px-6 text-[14px] font-semibold text-[#4E5968] transition hover:bg-[#F8FAFC]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || imageUploading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-7 text-[14px] font-semibold text-white transition hover:bg-black disabled:bg-[#CBD5E1]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "수정 저장" : "제품 저장"}
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-[#191F28]">
              <Info className="h-4 w-4 text-[#3182F6]" />
              기본 정보
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#4E5968]">제품 ID</label>
                <input
                  value={form.id}
                  disabled={isEdit}
                  onChange={(event) => onFormChange((prev) => ({ ...prev, id: event.target.value }))}
                  className={inputClassName}
                  placeholder="예: PROD-001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#4E5968]">카테고리</label>
                <input
                  value={form.category}
                  onChange={(event) => onFormChange((prev) => ({ ...prev, category: event.target.value }))}
                  className={inputClassName}
                  placeholder="예: 스킨케어"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[13px] font-semibold text-[#4E5968]">제품명</label>
                <input
                  value={form.name}
                  onChange={(event) => onFormChange((prev) => ({ ...prev, name: event.target.value }))}
                  className={inputClassName}
                  placeholder="고객에게 노출될 제품명을 입력하세요."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[13px] font-semibold text-[#4E5968]">상세 설명</label>
                <textarea
                  value={form.description}
                  onChange={(event) => onFormChange((prev) => ({ ...prev, description: event.target.value }))}
                  className={`${textareaClassName} h-28 resize-none`}
                  placeholder="제품의 핵심 특징과 판매 포인트를 적어주세요."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#4E5968]">기본 가격 ({currencyCode})</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(event) => onFormChange((prev) => ({ ...prev, basePrice: event.target.value }))}
                  className={`${inputClassName} font-semibold text-[#3182F6]`}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[13px] font-semibold text-[#4E5968]">대표 이미지 업로드</label>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-4 text-[14px] font-semibold text-white transition hover:bg-black"
                >
                  {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {form.image ? "이미지 변경" : "이미지 업로드"}
                </button>
                <input ref={imageInputRef} type="file" hidden accept="image/*" onChange={onImageSelect} />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-[#191F28]">
              <Settings2 className="h-4 w-4 text-[#3182F6]" />
              상세 구성
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {detailFields.map((field) => (
                <div key={field.value} className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#4E5968]">{field.label}</label>
                  <textarea
                    value={form[field.value]}
                    onChange={(event) =>
                      onFormChange((prev) => ({
                        ...prev,
                        [field.value]: event.target.value,
                      }))
                    }
                    className={`${textareaClassName} h-32 resize-none`}
                    placeholder={`${field.label}을 한 줄에 하나씩 입력하세요.`}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E7EDF3] bg-[#F8FAFC] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-[#191F28]">수량별 할인 설정</p>
                <p className="mt-1 text-[12px] text-[#8B95A1]">필요한 할인 구간만 추가해서 관리할 수 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onFormChange((prev) => ({
                    ...prev,
                    discountRows: [...prev.discountRows, { qty: "", discount: "" }],
                  }))
                }
                className="text-[13px] font-semibold text-[#3182F6] transition hover:text-[#1D4ED8]"
              >
                + 구간 추가
              </button>
            </div>

            <div className="space-y-3">
              {form.discountRows.map((row, index) => (
                <div key={`${index}-${row.qty}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="relative">
                    <input
                      value={row.qty}
                      onChange={(event) => onUpdateDiscount(index, "qty", event.target.value)}
                      className={`${inputClassName} pr-10`}
                      placeholder="최소 수량"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[#98A2B3]">개</span>
                  </div>
                  <div className="relative">
                    <input
                      value={row.discount}
                      onChange={(event) => onUpdateDiscount(index, "discount", event.target.value)}
                      className={`${inputClassName} pr-10 font-semibold text-[#3182F6]`}
                      placeholder="할인율"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[#98A2B3]">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange((prev) => ({
                        ...prev,
                        discountRows: prev.discountRows.filter((_, rowIndex) => rowIndex !== index),
                      }))
                    }
                    className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#F7D7DA] bg-white px-4 text-[#D92D20] transition hover:bg-[#FFF5F5]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5">
            <p className="text-[15px] font-semibold text-[#191F28]">제품 이미지</p>
            <p className="mt-1 text-[12px] leading-5 text-[#8B95A1]">권장 사이즈 1000x1000px, JPG 또는 PNG</p>

            <div className="mt-4 relative flex h-52 items-center justify-center overflow-hidden rounded-[20px] border border-[#E5E8EB] bg-white">
              {form.image ? (
                <img src={getCatalogImageUrl(form.image)} alt="제품 미리보기" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-8 w-8 text-[#B8C4D1]" />
              )}
            </div>

            {form.image ? (
              <button
                type="button"
                onClick={onImageRemove}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#F7D7DA] bg-white px-4 text-[13px] font-semibold text-[#D92D20] transition hover:bg-[#FFF5F5]"
              >
                <Trash2 className="h-4 w-4" />
                이미지 제거
              </button>
            ) : null}
          </section>

          <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-[#191F28]">
              <Boxes className="h-4 w-4 text-[#3182F6]" />
              연결 용기 옵션
            </div>

            <div className="grid gap-2">
              {containers.length > 0 ? (
                containers.map((container) => {
                  const selected = form.containerIds.includes(container.id);
                  return (
                    <label
                      key={container.id}
                      className={`flex cursor-pointer items-center justify-between rounded-[16px] border px-4 py-3 transition ${selected
                        ? "border-[#3182F6] bg-[#F2F7FF] shadow-[0_8px_18px_rgba(49,130,246,0.10)]"
                        : "border-[#E5E8EB] bg-white hover:border-[#BCD3FF]"
                        }`}
                    >
                      <div>
                        <p className={`text-[14px] font-semibold ${selected ? "text-[#1D4ED8]" : "text-[#344054]"}`}>
                          {container.name}
                        </p>
                        <p className="text-[12px] text-[#98A2B3]">{container.id}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#BFC8D4] text-[#3182F6] focus:ring-[#3182F6]"
                        checked={selected}
                        onChange={() => onToggleContainer(container.id)}
                      />
                    </label>
                  );
                })
              ) : (
                <div className="rounded-[16px] border border-dashed border-[#D8E0E8] bg-white px-4 py-5 text-[13px] text-[#8B95A1]">
                  먼저 용기 카탈로그를 등록하면 여기서 연결할 수 있습니다.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </CatalogModal>
  );
}
