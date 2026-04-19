"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { ContainerCatalogManager } from "./catalog/ContainerCatalogManager";
import { DesignExtraCatalogManager } from "./catalog/DesignExtraCatalogManager";
import { DesignPackageCatalogManager } from "./catalog/DesignPackageCatalogManager";
import { DesignServiceCatalogManager } from "./catalog/DesignServiceCatalogManager";
import { ProductCatalogManager } from "./catalog/ProductCatalogManager";

export type ProductManagementTab = "product-list" | "product-create";

type ProductRegistrationProps = {
  activeTab: ProductManagementTab;
  onTabChange: (tab: ProductManagementTab) => void;
};

export function ProductRegistration({ activeTab, onTabChange }: ProductRegistrationProps) {
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [catalogCurrency, setCatalogCurrency] = useState<CurrencyCode>("USD");
  const [optionCurrency, setOptionCurrency] = useState<CurrencyCode>("USD");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      const { data: manufacturer, error } = await supabase
        .from("manufacturers")
        .select("id, catalog_currency")
        .eq("owner_id", session.user.id)
        .single();

      if (error || !manufacturer) {
        setMessage("연결된 제조사 계정을 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      setManufacturerId(manufacturer.id);
      const nextCurrency = (manufacturer.catalog_currency as CurrencyCode | null) || "USD";
      setCatalogCurrency(nextCurrency);
      setOptionCurrency(nextCurrency);
      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064ff]" />
      </div>
    );
  }

  if (!manufacturerId) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-8">
        <div className="mx-auto max-w-[1100px] rounded-[12px] border border-[#f2f4f6] bg-white p-10 text-sm font-medium text-[#4e5968] shadow-sm">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-8">
      <div className="mx-auto max-w-[1400px] space-y-8">
        <ProductCatalogManager
          manufacturerId={manufacturerId}
          currencyCode={catalogCurrency}
          activeSection={activeTab}
          onSectionChange={onTabChange}
        />

        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:p-2">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[24px] font-bold text-[#191F28]">연결 옵션 통합 관리</h2>
              </div>
              <p className="mt-2 text-[15px] text-[#8B95A1]">
                용기, 디자인 서비스, 디자인 패키지, 추가 디자인 옵션을 한곳에서 수정하고 삭제할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#E5E8EB] bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8EB] px-4 py-4 sm:px-6">
              {CURRENCY_OPTIONS.map((option) => {
                const isActive = optionCurrency === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setOptionCurrency(option)}
                    className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${isActive ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E9EEF5]"
                      }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              <ContainerCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} activeCurrency={optionCurrency} />
              <DesignServiceCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} activeCurrency={optionCurrency} />
              <DesignPackageCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} activeCurrency={optionCurrency} />
              <DesignExtraCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} activeCurrency={optionCurrency} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
