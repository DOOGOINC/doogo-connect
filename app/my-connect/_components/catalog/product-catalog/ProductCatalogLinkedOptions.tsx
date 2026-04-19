/* eslint-disable @next/next/no-img-element */
import type { ChangeEvent, ReactNode, RefObject } from "react";
import { Boxes, Loader2, PackagePlus, Palette, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import type { ContainerRow, ProductForm } from "../productCatalogShared";
import { SelectionCard } from "./SelectionCard";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
};

type PackageRow = {
  id: string;
  name: string;
  badge: string | null;
  description: string | null;
};

type ExtraRow = {
  id: string;
  name: string;
  description: string | null;
};

export type NewContainerForm = {
  name: string;
  description: string;
  addPrice: string;
  sortOrder: string;
  image: string;
};

export type NewOptionForm = {
  name: string;
  description: string;
  price: string;
  sortOrder: string;
};

export type NewPackageForm = NewOptionForm & {
  badge: string;
  includedText: string;
};

type ProductCatalogLinkedOptionsProps = {
  form: ProductForm;
  containers: ContainerRow[];
  designServices: ServiceRow[];
  designPackages: PackageRow[];
  designExtras: ExtraRow[];
  newContainers: NewContainerForm[];
  newServices: NewOptionForm[];
  newPackages: NewPackageForm[];
  newExtras: NewOptionForm[];
  containerImageUploading: boolean;
  containerImageInputRef: RefObject<HTMLInputElement | null>;
  onNewContainersChange: (updater: (prev: NewContainerForm[]) => NewContainerForm[]) => void;
  onNewServicesChange: (updater: (prev: NewOptionForm[]) => NewOptionForm[]) => void;
  onNewPackagesChange: (updater: (prev: NewPackageForm[]) => NewPackageForm[]) => void;
  onNewExtrasChange: (updater: (prev: NewOptionForm[]) => NewOptionForm[]) => void;
  onToggleContainer: (containerId: string) => void;
  onToggleDesignService: (serviceId: string) => void;
  onToggleDesignPackage: (packageId: string) => void;
  onToggleDesignExtra: (extraId: string) => void;
  onContainerImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenContainerImagePicker: (index: number) => void;
  onContainerImageRemove: (index: number) => void;
  resolveImageUrl: (pathOrUrl: string | null | undefined) => string;
};

const inputClassName =
  "h-11 w-full rounded-[10px] border border-[#E5E8EB] bg-white px-4 text-[13px] text-[#191F28] outline-none transition placeholder:text-[#ADB5BD] focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/5";

const textareaClassName =
  "w-full rounded-[10px] border border-[#E5E8EB] bg-white p-4 text-[13px] text-[#191F28] outline-none transition placeholder:text-[#ADB5BD] focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/5";

function OptionCreator({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[12px] border border-[#E5E8EB] bg-[#F9FAFB]">
      <div className="border-b border-[#E5E8EB] px-4 py-3 text-[13px] font-bold text-[#4E5968]">{title}</div>
      <div className="bg-white p-5">{children}</div>
    </div>
  );
}

function DraftRowShell({
  title,
  index,
  removable,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  removable: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[#E5E8EB] bg-[#FCFCFD] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[13px] font-bold text-[#191F28]">
          {title} {index + 1}
        </div>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#FFE5E5] bg-white text-[#F04452] transition hover:bg-[#FFF5F5]"
            aria-label={`${title} 삭제`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

export function ProductCatalogLinkedOptions({
  form,
  containers,
  designServices,
  designPackages,
  designExtras,
  newContainers,
  newServices,
  newPackages,
  newExtras,
  containerImageUploading,
  containerImageInputRef,
  onNewContainersChange,
  onNewServicesChange,
  onNewPackagesChange,
  onNewExtrasChange,
  onToggleContainer,
  onToggleDesignService,
  onToggleDesignPackage,
  onToggleDesignExtra,
  onContainerImageSelect,
  onOpenContainerImagePicker,
  onContainerImageRemove,
  resolveImageUrl,
}: ProductCatalogLinkedOptionsProps) {
  const currencyCode = form.paymentCurrency;

  return (
    <div className="space-y-8">
      <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F8FF]">
              <PackagePlus className="h-4 w-4 text-[#3182F6]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#191F28]">이 상품에 사용할 용기</h3>
          </div>
          <span className="text-[12px] font-medium text-[#8B95A1]">중복 선택 가능</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {containers.length ? (
            containers.map((container) => (
              <SelectionCard
                key={container.id}
                title={container.name}
                subtitle={container.id}
                selected={form.containerIds.includes(container.id)}
                onClick={() => onToggleContainer(container.id)}
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D1D5DB] py-10">
              <p className="text-[13px] text-[#8B95A1]">선택한 결제통화에 맞는 용기가 없습니다.</p>
            </div>
          )}
        </div>

        <OptionCreator title="+ 이 상품에 사용할 용기 생성">
          <div className="space-y-4">
            <input ref={containerImageInputRef} type="file" hidden accept="image/*" onChange={onContainerImageSelect} />
            {newContainers.map((container, index) => (
              <DraftRowShell
                key={`new-container-${index}`}
                title="용기"
                index={index}
                removable={newContainers.length > 1}
                onRemove={() => onNewContainersChange((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
              >
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">용기명</label>
                  <input
                    value={container.name}
                    onChange={(e) =>
                      onNewContainersChange((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: e.target.value } : item))
                      )
                    }
                    className={inputClassName}
                    placeholder="용기 이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">설명</label>
                  <textarea
                    value={container.description}
                    onChange={(e) =>
                      onNewContainersChange((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, description: e.target.value } : item))
                      )
                    }
                    className={`${textareaClassName} h-24 resize-none`}
                    placeholder="용기 설명을 입력하세요"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">추가 금액 ({currencyCode})</label>
                    <input
                      value={container.addPrice}
                      onChange={(e) =>
                        onNewContainersChange((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, addPrice: e.target.value } : item))
                        )
                      }
                      className={inputClassName}
                      placeholder="추가 금액"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">정렬 순서</label>
                    <input
                      value={container.sortOrder}
                      onChange={(e) =>
                        onNewContainersChange((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, sortOrder: e.target.value } : item))
                        )
                      }
                      className={inputClassName}
                      placeholder="정렬 순서"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">용기 이미지</label>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onOpenContainerImagePicker(index)}
                      className="flex h-11 items-center gap-2 rounded-[10px] bg-[#191F28] px-4 text-[13px] font-bold text-white transition hover:bg-black"
                    >
                      {containerImageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      파일 선택
                    </button>
                    {resolveImageUrl(container.image) ? (
                      <div className="flex items-center gap-3 rounded-[10px] border border-[#E5E8EB] bg-white p-1.5 pr-4">
                        <img src={resolveImageUrl(container.image)} alt="용기" className="h-8 w-8 rounded-[6px] object-cover" />
                        <span className="text-[12px] text-[#4E5968]">이미지 선택됨</span>
                        <button type="button" onClick={() => onContainerImageRemove(index)} className="ml-auto text-[#F04452]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#8B95A1]">선택된 파일 없음</span>
                    )}
                  </div>
                </div>
              </DraftRowShell>
            ))}

            <button
              type="button"
              onClick={() =>
                onNewContainersChange((prev) => [...prev, { name: "", description: "", addPrice: "", sortOrder: "", image: "" }])
              }
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] py-3 text-[13px] font-bold text-[#3182F6] transition hover:bg-[#F2F8FF]"
            >
              <Plus className="h-4 w-4" />
              용기 추가
            </button>
          </div>
        </OptionCreator>
      </section>

      <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F8FF]">
            <Palette className="h-4 w-4 text-[#3182F6]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#191F28]">디자인 서비스</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {designServices.length ? (
            designServices.map((service) => (
              <SelectionCard
                key={service.id}
                title={service.name}
                subtitle={service.description || service.id}
                selected={form.designServiceIds.includes(service.id)}
                onClick={() => onToggleDesignService(service.id)}
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D1D5DB] py-10">
              <p className="text-[13px] text-[#8B95A1]">선택한 결제통화에 맞는 디자인 서비스가 없습니다.</p>
            </div>
          )}
        </div>

        <OptionCreator title="+ 디자인 서비스 생성">
          <div className="space-y-4">
            {newServices.map((service, index) => (
              <DraftRowShell
                key={`new-service-${index}`}
                title="디자인 서비스"
                index={index}
                removable={newServices.length > 1}
                onRemove={() => onNewServicesChange((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
              >
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">서비스명</label>
                  <input
                    value={service.name}
                    onChange={(e) =>
                      onNewServicesChange((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: e.target.value } : item))
                      )
                    }
                    className={inputClassName}
                    placeholder="서비스 이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">설명</label>
                  <textarea
                    value={service.description}
                    onChange={(e) =>
                      onNewServicesChange((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, description: e.target.value } : item))
                      )
                    }
                    className={`${textareaClassName} h-24 resize-none`}
                    placeholder="서비스 설명을 입력하세요"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">가격 ({currencyCode})</label>
                    <input
                      value={service.price}
                      onChange={(e) =>
                        onNewServicesChange((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, price: e.target.value } : item))
                        )
                      }
                      className={inputClassName}
                      placeholder="가격"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">정렬 순서</label>
                    <input
                      value={service.sortOrder}
                      onChange={(e) =>
                        onNewServicesChange((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, sortOrder: e.target.value } : item))
                        )
                      }
                      className={inputClassName}
                      placeholder="정렬 순서"
                    />
                  </div>
                </div>
              </DraftRowShell>
            ))}

            <button
              type="button"
              onClick={() => onNewServicesChange((prev) => [...prev, { name: "", description: "", price: "", sortOrder: "" }])}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] py-3 text-[13px] font-bold text-[#3182F6] transition hover:bg-[#F2F8FF]"
            >
              <Plus className="h-4 w-4" />
              디자인 서비스 추가
            </button>
          </div>
        </OptionCreator>
      </section>

      <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F8FF]">
            <Boxes className="h-4 w-4 text-[#3182F6]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#191F28]">디자인 패키지</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {designPackages.length ? (
            designPackages.map((item) => (
              <SelectionCard
                key={item.id}
                title={item.name}
                subtitle={item.badge || item.description || item.id}
                selected={form.designPackageIds.includes(item.id)}
                onClick={() => onToggleDesignPackage(item.id)}
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D1D5DB] py-10">
              <p className="text-[13px] text-[#8B95A1]">선택한 결제통화에 맞는 디자인 패키지가 없습니다.</p>
            </div>
          )}
        </div>

        <OptionCreator title="+ 디자인 패키지 생성">
          <div className="space-y-4">
            {newPackages.map((item, index) => (
              <DraftRowShell
                key={`new-package-${index}`}
                title="디자인 패키지"
                index={index}
                removable={newPackages.length > 1}
                onRemove={() => onNewPackagesChange((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">패키지명</label>
                    <input
                      value={item.name}
                      onChange={(e) =>
                        onNewPackagesChange((prev) =>
                          prev.map((draft, itemIndex) => (itemIndex === index ? { ...draft, name: e.target.value } : draft))
                        )
                      }
                      className={inputClassName}
                      placeholder="패키지 이름"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">배지</label>
                    <input
                      value={item.badge}
                      onChange={(e) =>
                        onNewPackagesChange((prev) =>
                          prev.map((draft, itemIndex) => (itemIndex === index ? { ...draft, badge: e.target.value } : draft))
                        )
                      }
                      className={inputClassName}
                      placeholder="예: BEST"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">설명</label>
                  <input
                    value={item.description}
                    onChange={(e) =>
                      onNewPackagesChange((prev) =>
                        prev.map((draft, itemIndex) => (itemIndex === index ? { ...draft, description: e.target.value } : draft))
                      )
                    }
                    className={inputClassName}
                    placeholder="간단한 설명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">포함 항목</label>
                  <textarea
                    value={item.includedText}
                    onChange={(e) =>
                      onNewPackagesChange((prev) =>
                        prev.map((draft, itemIndex) => (itemIndex === index ? { ...draft, includedText: e.target.value } : draft))
                      )
                    }
                    className={`${textareaClassName} h-24 resize-none`}
                    placeholder={"예: 로고 디자인\n라벨 디자인"}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">가격 ({currencyCode})</label>
                    <input
                      value={item.price}
                      onChange={(e) =>
                        onNewPackagesChange((prev) =>
                          prev.map((draft, itemIndex) => (itemIndex === index ? { ...draft, price: e.target.value } : draft))
                        )
                      }
                      className={inputClassName}
                      placeholder="가격"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">정렬 순서</label>
                    <input
                      value={item.sortOrder}
                      onChange={(e) =>
                        onNewPackagesChange((prev) =>
                          prev.map((draft, itemIndex) => (itemIndex === index ? { ...draft, sortOrder: e.target.value } : draft))
                        )
                      }
                      className={inputClassName}
                      placeholder="정렬 순서"
                    />
                  </div>
                </div>
              </DraftRowShell>
            ))}

            <button
              type="button"
              onClick={() =>
                onNewPackagesChange((prev) => [...prev, { name: "", description: "", price: "", sortOrder: "", badge: "", includedText: "" }])
              }
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] py-3 text-[13px] font-bold text-[#3182F6] transition hover:bg-[#F2F8FF]"
            >
              <Plus className="h-4 w-4" />
              디자인 패키지 추가
            </button>
          </div>
        </OptionCreator>
      </section>

      <section className="rounded-[16px] border border-[#E5E8EB] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F8FF]">
            <Sparkles className="h-4 w-4 text-[#3182F6]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#191F28]">추가 디자인 옵션</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {designExtras.length ? (
            designExtras.map((extra) => (
              <SelectionCard
                key={extra.id}
                title={extra.name}
                subtitle={extra.description || extra.id}
                selected={form.designExtraIds.includes(extra.id)}
                onClick={() => onToggleDesignExtra(extra.id)}
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D1D5DB] py-10">
              <p className="text-[13px] text-[#8B95A1]">선택한 결제통화에 맞는 추가 옵션이 없습니다.</p>
            </div>
          )}
        </div>

        <OptionCreator title="+ 추가 디자인 옵션 생성">
          <div className="space-y-4">
            {newExtras.map((extra, index) => (
              <DraftRowShell
                key={`new-extra-${index}`}
                title="추가 옵션"
                index={index}
                removable={newExtras.length > 1}
                onRemove={() => onNewExtrasChange((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
              >
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">옵션명</label>
                  <input
                    value={extra.name}
                    onChange={(e) =>
                      onNewExtrasChange((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: e.target.value } : item))
                      )
                    }
                    className={inputClassName}
                    placeholder="옵션 이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">설명</label>
                  <textarea
                    value={extra.description}
                    onChange={(e) =>
                      onNewExtrasChange((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, description: e.target.value } : item))
                      )
                    }
                    className={`${textareaClassName} h-24 resize-none`}
                    placeholder="옵션 설명을 입력하세요"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">가격 ({currencyCode})</label>
                    <input
                      value={extra.price}
                      onChange={(e) =>
                        onNewExtrasChange((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, price: e.target.value } : item))
                        )
                      }
                      className={inputClassName}
                      placeholder="가격"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-[#4E5968]">정렬 순서</label>
                    <input
                      value={extra.sortOrder}
                      onChange={(e) =>
                        onNewExtrasChange((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, sortOrder: e.target.value } : item))
                        )
                      }
                      className={inputClassName}
                      placeholder="정렬 순서"
                    />
                  </div>
                </div>
              </DraftRowShell>
            ))}

            <button
              type="button"
              onClick={() => onNewExtrasChange((prev) => [...prev, { name: "", description: "", price: "", sortOrder: "" }])}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] py-3 text-[13px] font-bold text-[#3182F6] transition hover:bg-[#F2F8FF]"
            >
              <Plus className="h-4 w-4" />
              추가 옵션 추가
            </button>
          </div>
        </OptionCreator>
      </section>
    </div>
  );
}
