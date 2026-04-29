"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { type RfqRequestRow, type RfqRequestStatus } from "@/lib/rfq";

interface ManufacturerDashboardProps {
  displayName: string;
  requests: RfqRequestRow[];
  onRequestSelect: (requestId: string) => void;
  onTabChange: (tabId: string) => void;
  onApproveRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string, reason: string) => Promise<void>;
}

const ACTIVE_PRODUCTION_STATUSES: RfqRequestStatus[] = [
  "production_started",
  "production_in_progress",
  "ordered",
];

const PRODUCTION_VISIBLE_STATUSES: RfqRequestStatus[] = [
  "payment_completed",
  "production_waiting",
  "quoted",
  "production_started",
  "ordered",
  "production_in_progress",
  "manufacturing_completed",
  "completed",
  "delivery_completed",
];

function getProgress(status: RfqRequestStatus) {
  switch (status) {
    case "payment_completed":
      return 15;
    case "production_waiting":
    case "quoted":
      return 30;
    case "production_started":
    case "ordered":
      return 55;
    case "production_in_progress":
      return 75;
    case "manufacturing_completed":
    case "completed":
    case "delivery_completed":
      return 100;
    default:
      return 0;
  }
}

function getProductionLabel(status: RfqRequestStatus) {
  switch (status) {
    case "payment_completed":
      return "결제 확인";
    case "production_waiting":
    case "quoted":
      return "생산 대기";
    case "production_started":
    case "ordered":
    case "production_in_progress":
      return "생산 진행";
    case "manufacturing_completed":
    case "completed":
      return "생산 완료";
    case "delivery_completed":
      return "납품 완료";
    default:
      return "대기";
  }
}

function getProductionBadgeClass(status: RfqRequestStatus) {
  switch (status) {
    case "payment_completed":
      return "bg-[#e8f0ff] text-[#2563eb]";
    case "production_waiting":
    case "quoted":
      return "bg-[#eef2ff] text-[#4f46e5]";
    case "production_started":
    case "ordered":
    case "production_in_progress":
      return "bg-[#dbeafe] text-[#2563eb]";
    case "manufacturing_completed":
    case "completed":
      return "bg-[#dcfce7] text-[#16a34a]";
    case "delivery_completed":
      return "bg-[#fef3c7] text-[#ca8a04]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDashboardCurrency(value: number, currencyCode?: string | null) {
  const safeCurrency = (currencyCode || "NZD").toUpperCase();
  return `${safeCurrency} ${Number(value || 0).toLocaleString("en-US")}`;
}

function getCurrencySortOrder(currencyCode: string) {
  if (currencyCode === "NZD") return 0;
  if (currencyCode === "USD") return 1;
  if (currencyCode === "KRW") return 2;
  return 3;
}

function isSameMonth(value: string, now: Date) {
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function ManufacturerDashboard({
  displayName,
  requests,
  onRequestSelect,
  onTabChange,
  onApproveRequest,
  onRejectRequest,
}: ManufacturerDashboardProps) {
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );
  const activeProductionRequests = useMemo(
    () => requests.filter((request) => ACTIVE_PRODUCTION_STATUSES.includes(request.status)),
    [requests]
  );
  const messageCount = useMemo(
    () =>
      requests.filter((request) =>
        ["pending", "reviewing", "payment_in_progress"].includes(request.status)
      ).length,
    [requests]
  );
  const salesAmounts = useMemo(() => {
    const now = new Date();
    const salesRequests = requests.filter(
      (request) => request.status === "fulfilled" && isSameMonth(request.updated_at || request.created_at, now)
    );
    const totalsByCurrency = new Map<string, number>();

    salesRequests.forEach((request) => {
      const currencyCode = (request.currency_code || "NZD").toUpperCase();
      totalsByCurrency.set(currencyCode, (totalsByCurrency.get(currencyCode) || 0) + Number(request.total_price || 0));
    });

    if (!totalsByCurrency.size) {
      return [formatDashboardCurrency(0, requests[0]?.currency_code || "NZD")];
    }

    return Array.from(totalsByCurrency.entries())
      .sort((a, b) => {
        const orderDiff = getCurrencySortOrder(a[0]) - getCurrencySortOrder(b[0]);
        return orderDiff !== 0 ? orderDiff : a[0].localeCompare(b[0]);
      })
      .map(([currencyCode, total]) => formatDashboardCurrency(total, currencyCode));
  }, [requests]);
  const recentRequests = useMemo(
    () =>
      [...pendingRequests]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4),
    [pendingRequests]
  );
  const productionRequests = useMemo(
    () =>
      requests
        .filter((request) => PRODUCTION_VISIBLE_STATUSES.includes(request.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3),
    [requests]
  );

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f9fafb] px-2">
      <div className="flex w-full flex-col gap-6">
        <section className="rounded-[14px] px-6 py-5">
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#1b2b48] md:text-[22px]">
                안녕하세요, {displayName} <span className="text-[18px]">👋</span>
              </h1>
              <p className="mt-1 text-[16px] font-medium text-[#7d8aa5]">
                오늘도 함께 성장하는 두고커넥트입니다.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              {[
                {
                  label: "신규 요청",
                  value: `${pendingRequests.length}건`,
                  icon: "📋",
                  iconWrap: "bg-[#fff1e8]",
                  iconColor: "text-[24px]",
                },
                {
                  label: "생산 진행중",
                  value: `${activeProductionRequests.length}건`,
                  icon: "🏭",
                  iconWrap: "bg-[#edf3ff]",
                  iconColor: "text-[24px]",
                },
                {
                  label: "이번달 매출",
                  value: salesAmounts.join(" · "),
                  compact: true,
                  icon: "💰",
                  iconWrap: "bg-[#ebfbf2]",
                  iconColor: "text-[24px]",
                },
                {
                  label: "미확인 메시지",
                  value: `${messageCount}건`,
                  icon: "💬",
                  iconWrap: "bg-[#f4efff]",
                  iconColor: "text-[24px]",
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-[22px] border border-[#e9edf3] bg-white px-6 py-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${card.iconWrap}`}>
                    <span className={card.iconColor}>{card.icon}</span>
                  </div>
                  <div className="mt-5">
                    <p
                      className={`font-bold tracking-[-0.03em] text-[#1b2b48] ${
                        "compact" in card && card.compact ? "text-[15px] md:text-[16px]" : "text-[20px] md:text-[22px]"
                      }`}
                    >
                      {card.value}
                    </p>
                    <p className="mt-1 text-[15px] font-medium text-[#7d8aa5]">{card.label}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[22px] bg-[linear-gradient(135deg,#2f67ff_0%,#2848c9_100%)] px-6 py-7 text-white shadow-[0_10px_30px_rgba(47,103,255,0.18)]">
                <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[13px] font-bold">
                  [NEW]
                </span>
                <h2 className="mt-4 text-[18px] font-bold tracking-[-0.03em] md:text-[20px]">
                  상품 등록하고 의뢰자 만나기
                </h2>
                <p className="mt-2 text-[15px] font-medium text-white/82">
                  제조 가능한 상품을 등록하세요
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange("product-create")}
                  className="mt-5 inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-[#2f67ff] transition hover:bg-[#f4f7ff]"
                >
                  상품 등록하기
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>

              <article className="rounded-[22px] bg-[linear-gradient(135deg,#0ebf7b_0%,#0c9665_100%)] px-6 py-7 text-white shadow-[0_10px_30px_rgba(12,150,101,0.18)]">
                <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[13px] font-bold">
                  [안내]
                </span>
                <h2 className="mt-4 text-[18px] font-bold tracking-[-0.03em] md:text-[20px]">
                  정산 수수료 안내
                </h2>
                <p className="mt-2 text-[15px] font-medium text-white/82">
                  완료된 거래의 3% 수수료가 누적됩니다
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange("fee-settlement")}
                  className="mt-5 inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-[#0c9665] transition hover:bg-[#f4fffb]"
                >
                  수수료 내역
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-[#e9edf3] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#edf1f5] px-6 py-5">
            <h2 className="text-[18px] font-bold tracking-[-0.03em] text-[#1b2b48]">최근 신규 요청</h2>
            <button
              type="button"
              onClick={() => onTabChange("manufacturing-requests-new")}
              className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#2f67ff] transition hover:text-[#1c53ef]"
            >
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-3">
            {recentRequests.length ? (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-4 rounded-[18px] px-3 py-3 transition hover:bg-[#f8fbff]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onRequestSelect(request.id);
                        onTabChange("rfq-inbox");
                      }}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff1df] text-[18px] font-bold text-[#ff7a1a]">
                        {request.contact_name.trim().charAt(0) || "고"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-bold text-[#24324a]">{request.product_name}</p>
                        <p className="mt-1 truncate text-[14px] font-medium text-[#7d8aa5]">
                          {request.contact_name} · {request.quantity.toLocaleString()}개 · {formatDashboardCurrency(request.total_price, request.currency_code)}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onApproveRequest(request.id);
                          alert("승인됬습니다 생산 진행으로 이동합니다.");
                          onRequestSelect(request.id);
                          onTabChange("production");
                        }}
                        className="rounded-full bg-[#2f67ff] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[#1f58f0]"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const reason = window.prompt("거절 사유를 입력해주세요.");
                          if (!reason || !reason.trim()) {
                            return;
                          }
                          await onRejectRequest(request.id, reason.trim());
                          onRequestSelect(request.id);
                          onTabChange("manufacturing-requests-history");
                        }}
                        className="rounded-full bg-[#f3f5f8] px-4 py-2 text-[14px] font-bold text-[#667085] transition hover:bg-[#e8ecf1]"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="text-[15px] font-bold text-[#2d3748]">신규 요청이 없습니다.</p>
                <p className="mt-2 text-[14px] text-[#8b95a1]">새로운 요청이 접수되면 이 영역에 표시됩니다.</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#e9edf3] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#edf1f5] px-6 py-5">
            <h2 className="text-[18px] font-bold tracking-[-0.03em] text-[#1b2b48]">생산 현황</h2>
            <button
              type="button"
              onClick={() => onTabChange("production")}
              className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#2f67ff] transition hover:text-[#1c53ef]"
            >
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {productionRequests.length ? (
              <div className="space-y-8">
                {productionRequests.map((request) => {
                  const progress = getProgress(request.status);
                  const progressClass =
                    request.status === "manufacturing_completed" || request.status === "completed"
                      ? "bg-[#17c964]"
                      : request.status === "delivery_completed"
                        ? "bg-[#f4c73f]"
                        : "bg-[#2f67ff]";
                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => {
                        onRequestSelect(request.id);
                        onTabChange("production");
                      }}
                      className="block w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[16px] font-bold text-[#24324a]">{request.product_name}</p>
                          <p className="mt-1 text-[14px] font-medium text-[#7d8aa5]">
                            {request.contact_name} · {request.quantity.toLocaleString()}개 · {formatDashboardCurrency(request.total_price, request.currency_code)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${getProductionBadgeClass(request.status)}`}>
                          {getProductionLabel(request.status)}
                        </span>
                      </div>
                      <div className="mt-4 h-[8px] overflow-hidden rounded-full bg-[#edf1f5]">
                        <div className={`h-full rounded-full ${progressClass}`} style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-2 text-[14px] font-medium text-[#98a2b3]">
                        납기일: {formatDate(request.updated_at || request.created_at)} · {progress}%
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="text-[15px] font-bold text-[#2d3748]">진행 중인 생산 건이 없습니다.</p>
                <p className="mt-2 text-[14px] text-[#8b95a1]">생산 상태가 변경되면 이 영역에서 빠르게 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
