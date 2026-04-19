import { Check, RotateCcw, CheckCircle2 } from "lucide-react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import {
  type DesignExtraItem,
  type DesignOption,
  type DesignPackageItem,
  type DesignServiceItem,
  type EstimateSelection,
  type Product,
  getDefaultDesignOption,
} from "../_data/catalog";

export function Step4Design({
  designOptions,
  designServices,
  designPackages,
  designExtras,
  selection,
  setSelection,
  onReset,
  selectedProduct,
}: {
  designOptions: DesignOption[];
  designServices: DesignServiceItem[];
  designPackages: DesignPackageItem[];
  designExtras: DesignExtraItem[];
  selection: EstimateSelection;
  setSelection: (value: EstimateSelection) => void;
  onReset: () => void;
  selectedProduct: Product | null;
}) {
  const currencyCode: CurrencyCode = selectedProduct?.paymentCurrency || "USD";
  const selectedOption =
    designOptions.find((option) => option.id === selection.design) || getDefaultDesignOption(designOptions);
  const selectedServices = selection.designServices || [];
  const selectedPackage = selection.designPackage || null;
  const selectedExtras = selection.designExtras || [];
  const selectedServiceItems = designServices.filter((service) => selectedServices.includes(service.id));
  const selectedPackageItem = designPackages.find((item) => item.id === selectedPackage) || null;
  const selectedExtraItems = designExtras.filter((extra) => selectedExtras.includes(extra.id));

  const toggleService = (serviceId: string) => {
    if (selectedPackage) return;
    const nextServices = selectedServices.includes(serviceId)
      ? selectedServices.filter((id: string) => id !== serviceId)
      : [...selectedServices, serviceId];
    setSelection({ ...selection, designServices: nextServices });
  };

  const selectPackage = (packageId: string) => {
    setSelection({
      ...selection,
      designPackage: selectedPackage === packageId ? null : packageId,
      designServices: [],
    });
  };

  const toggleExtra = (extraId: string) => {
    const nextExtras = selectedExtras.includes(extraId)
      ? selectedExtras.filter((id: string) => id !== extraId)
      : [...selectedExtras, extraId];
    setSelection({ ...selection, designExtras: nextExtras });
  };

  const servicesTotal = selectedServiceItems.reduce((sum, service) => sum + service.price, 0);
  const packageTotal = selectedPackageItem?.price || 0;
  const extrasTotal = selectedExtraItems.reduce((sum, extra) => sum + extra.price, 0);
  const optionTotal =
    !selectedServiceItems.length && !selectedPackageItem && !selectedExtraItems.length ? selectedOption?.price || 0 : 0;
  const designTotal = optionTotal + servicesTotal + packageTotal + extrasTotal;

  const receiptItems = [
    ...(!selectedServiceItems.length && !selectedPackageItem && !selectedExtraItems.length && selectedOption
      ? [
        {
          id: selectedOption.id,
          receiptKey: `option-${selectedOption.id}`,
          name: selectedOption.name,
          price: selectedOption.price,
          type: "option" as const,
        },
      ]
      : []),
    ...selectedServiceItems.map((item) => ({
      id: item.id,
      receiptKey: `service-${item.id}`,
      name: item.name,
      price: item.price,
      type: "service" as const,
    })),
    ...(selectedPackageItem
      ? [
        {
          id: selectedPackageItem.id,
          receiptKey: `package-${selectedPackageItem.id}`,
          name: selectedPackageItem.name,
          price: selectedPackageItem.price,
          type: "package" as const,
        },
      ]
      : []),
    ...selectedExtraItems.map((item) => ({
      id: item.id,
      receiptKey: `extra-${item.id}`,
      name: item.name,
      price: item.price,
      type: "extra" as const,
    })),
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#f2f4f6] pb-6">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[#191f28]">디자인 옵션</h2>
          <p className="mt-1 text-[14px] text-[#4e5968]">제품에 맞는 전문 디자인 서비스를 선택하세요.</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 py-2 text-[12px] font-bold text-[#4e5968] hover:bg-[#e5e8eb] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 처음으로
        </button>
      </div>

      <div className="space-y-8">
        {/* 디자인 서비스 & 패키지 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#191f28]">전문 디자인 서비스</h3>
          </div>

          <div className="space-y-6">
            <div className="grid gap-3">
              {designServices.map((service) => {
                const isSelected = selectedServices.includes(service.id);
                const isDisabled = !!selectedPackage;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    disabled={isDisabled}
                    className={`flex items-center justify-between rounded-[8px] border p-4 transition-all ${isSelected
                      ? "border-[#3182f6] bg-[#f2f8ff]"
                      : "border-[#e5e8eb] bg-white hover:border-[#3182f6]"
                      } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-[4px] border ${isSelected ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db]"
                        }`}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[14px] font-bold text-[#191f28]">{service.name}</p>
                        <p className="text-[12px] text-[#8b95a1]">{service.description}</p>
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-[#191f28]">{formatCurrency(service.price, currencyCode)}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[12px] bg-[#f7f9fa]">
              <p className="mb-3 text-[14px] font-bold text-[#4e5968]">디자인 패키지 (할인 적용)</p>
              <div className="grid gap-3">
                {designPackages.map((item) => {
                  const isSelected = selectedPackage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectPackage(item.id)}
                      className={`flex flex-col rounded-[8px] border p-4 text-left transition-all ${isSelected
                        ? "border-[#3182f6] bg-[#f2f8ff] shadow-sm"
                        : "border-[#e5e8eb] bg-white hover:border-[#3182f6]"
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-bold text-[#191f28]">{item.name}</p>
                            {item.badge && (
                              <span className="rounded-[4px] bg-[#3182f6] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[12px] text-[#8b95a1]">{item.description}</p>
                        </div>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db]"
                          }`}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.included.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 rounded-[4px] bg-[#f2f4f6] px-2 py-0.5 text-[11px] font-medium text-[#6b7684]">
                            <CheckCircle2 className="h-3 w-3 text-[#3182f6]" /> {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[#f2f4f6] pt-3">
                        <span className="text-[12px] font-medium text-[#8b95a1]">패키지 할인가</span>
                        <p className="text-[16px] font-bold text-[#3182f6]">{formatCurrency(item.price, currencyCode)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 추가 옵션 */}
        <section className="space-y-3">
          <h3 className="text-[16px] font-bold text-[#191f28]">기타 추가 서비스</h3>
          <div className="grid gap-2">
            {designExtras.map((extra) => {
              const isSelected = selectedExtras.includes(extra.id);
              return (
                <button
                  key={extra.id}
                  type="button"
                  onClick={() => toggleExtra(extra.id)}
                  className={`flex items-center justify-between rounded-[8px] border p-4 transition-all ${isSelected
                    ? "border-[#3182f6] bg-[#f2f8ff]"
                    : "border-[#e5e8eb] bg-white hover:border-[#3182f6]"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-[4px] border ${isSelected ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db]"
                      }`}>
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <p className="text-[15px] font-bold text-[#191f28]">{extra.name}</p>
                  </div>
                  <p className="text-[15px] font-bold text-[#191f28]">{formatCurrency(extra.price, currencyCode)}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 합계 영수증 섹션 */}
        <section className="rounded-[12px] bg-[#11161f] p-6 text-white">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-[17px] font-bold">디자인 선택 상세</h3>
            <span className="text-[12px] font-medium text-white/40 uppercase tracking-widest">Receipt</span>
          </div>

          <div className="space-y-3 py-2">
            {receiptItems.length > 0 ? (
              receiptItems.map((item) => (
                <div key={item.receiptKey} className="flex items-center justify-between text-[14px]">
                  <span className="text-white/60">{item.name}</span>
                  <span className="font-bold">{formatCurrency(item.price, currencyCode)}</span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-[13px] text-white/40">선택된 디자인 옵션이 없습니다.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-[14px] font-bold">디자인 총 합계</span>
            <p className="text-[24px] font-black text-[#4da1ff]">{formatCurrency(designTotal, currencyCode)}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
