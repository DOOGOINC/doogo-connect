"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { ContainerCatalogManager } from "./catalog/ContainerCatalogManager";
import { DesignExtraCatalogManager } from "./catalog/DesignExtraCatalogManager";
import { DesignPackageCatalogManager } from "./catalog/DesignPackageCatalogManager";
import { DesignServiceCatalogManager } from "./catalog/DesignServiceCatalogManager";
import { ProductCatalogManager } from "./catalog/ProductCatalogManager";

const CATALOG_TABS = [
  { id: "containers", label: "용기 옵션" },
  { id: "products", label: "제품 카탈로그" },
  { id: "services", label: "디자인 서비스" },
  { id: "packages", label: "디자인 패키지" },
  { id: "extras", label: "추가 옵션" },
] as const;

type CatalogTabId = (typeof CATALOG_TABS)[number]["id"];

export function ProductRegistration() {
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [catalogCurrency, setCatalogCurrency] = useState<CurrencyCode>("USD");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<CatalogTabId>("containers");

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
        setMessage("연결된 제조사 정보가 없습니다. 심사가 완료되면 제조사 계정이 연결됩니다.");
        setLoading(false);
        return;
      }

      setManufacturerId(manufacturer.id);
      setCatalogCurrency((manufacturer.catalog_currency as CurrencyCode | null) || "USD");
      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  if (!manufacturerId) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
        <div className="mx-auto max-w-[1100px] rounded-[12px] border border-[#F2F4F6] bg-white p-10 text-sm font-medium text-[#4E5968] shadow-sm">
          {message}
        </div>
      </div>
    );
  }

  const handleCatalogCurrencyChange = async (nextCurrency: CurrencyCode) => {
    if (!manufacturerId || nextCurrency === catalogCurrency) return;

    const shouldProceed = window.confirm("통화를 변경하시겠습니까? 가격이 등록된 카탈로그가 있으면 서버에서 차단합니다.");
    if (!shouldProceed) return;

    setSavingCurrency(true);
    const response = await authFetch("/api/manufacturers/catalog-currency", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currencyCode: nextCurrency,
      }),
    });
    setSavingCurrency(false);

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      alert(`통화 변경에 실패했습니다: ${payload.error || "알 수 없는 오류"}`);
      return;
    }

    setCatalogCurrency(nextCurrency);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "containers":
        return <ContainerCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} />;
      case "products":
        return <ProductCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} />;
      case "services":
        return <DesignServiceCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} />;
      case "packages":
        return <DesignPackageCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} />;
      case "extras":
        return <DesignExtraCatalogManager manufacturerId={manufacturerId} currencyCode={catalogCurrency} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="mx-auto max-w-[1100px] space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#191F28]">제조사 카탈로그 관리</h1>
        </div>

        <div className="rounded-[16px] border border-[#E5E8EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#191F28]">카탈로그 공통 결제 통화</h2>
              <p className="mt-1 text-[13px] text-[#8B95A1]">
                제품, 용기 옵션, 디자인 서비스, 디자인 패키지, 추가 옵션의 가격 표시와 주문 합산 기준 통화입니다.
              </p>
              <p className="mt-2 text-[12px] font-medium text-[#d97706]">
                통화를 바꿔도 기존 금액 숫자는 자동 환산되지 않습니다. 변경 후 각 가격을 다시 확인해 주세요.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={catalogCurrency}
                disabled={savingCurrency}
                onChange={(event) => void handleCatalogCurrencyChange(event.target.value as CurrencyCode)}
                className="h-11 min-w-[140px] rounded-[12px] border border-[#D8E0E8] bg-white px-4 text-[14px] font-semibold text-[#191F28] outline-none transition focus:border-[#3182F6]"
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              {savingCurrency ? <Loader2 className="h-5 w-5 animate-spin text-[#3182F6]" /> : null}
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#E5E8EB] bg-white p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {CATALOG_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[12px] px-5 py-3 text-[14px] font-bold transition-all ${activeTab === tab.id
                  ? "bg-[#191F28] text-white shadow-sm"
                  : "bg-transparent text-[#4E5968] hover:bg-[#F2F4F6]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div>{renderActiveTab()}</div>
      </div>
    </div>
  );
}
