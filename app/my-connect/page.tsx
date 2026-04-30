"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortalPageHeader } from "@/components/header/PortalPageHeader";
import { getPortalHomeByRole, type AppRole } from "@/lib/auth/roles";
import { authFetch } from "@/lib/client/auth-fetch";
import type { RfqRequestRow, RfqRequestStatus } from "@/lib/rfq";
import { supabase } from "@/lib/supabase";
import { AccountSettings } from "./_components/AccountSettings";
import { ChatSystem } from "./_components/ChatSystem";
import { ClientDailyPopup } from "./_components/ClientDailyPopup";
import { ClientDashboard } from "./_components/ClientDashboard";
import { ClientDeliveryHub } from "./_components/ClientDeliveryHub";
import { ClientManufacturerDirectory } from "./_components/ClientManufacturerDirectory";
import { ClientPaymentManagement } from "./_components/ClientPaymentManagement";
import { ClientProjectDetail } from "./_components/ClientProjectDetail";
import { ClientQuoteRequestHub } from "./_components/ClientQuoteRequestHub";
import { ClientRefundDisputeCenter } from "./_components/ClientRefundDisputeCenter";
import { EmptyState } from "./_components/EmptyState";
import { ManufacturerDashboard } from "./_components/ManufacturerDashboard";
import { ManufacturerRequestHub } from "./_components/ManufacturerRequestHub";
import { OrdersManagement } from "./_components/OrdersManagement";
import { PointsWallet } from "./_components/PointsWallet";
import { ProductionManagement } from "./_components/ProductionManagement";
import { ProductRegistration, type ProductManagementTab } from "./_components/ProductRegistration";
import { ProjectList } from "./_components/ProjectList";
import { RfqInboxDetail } from "./_components/RfqInboxDetail";
import { Sidebar } from "./_components/Sidebar";
import { SupportChatSystem } from "./_components/SupportChatSystem";
import { TransactionsSettlement } from "./_components/TransactionsSettlement";
import { ManufacturerTradeSupport } from "./_components/ManufacturerTradeSupport";

type ConnectViewMode = "client" | "manufacturer";
type ProjectView = "new" | "rejected" | "expired";

const CLIENT_TAB_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  "quote-request": "제조사 견적요청",
  "manufacturer-list": "제조사 목록",
  project: "프로젝트",
  delivery: "생산",
  chat: "1:1 채팅",
  support: "고객센터",
  payment: "결제 내역",
  "refund-disputes": "환불/ 취소/ 분쟁",
  settings: "설정",
  points: "포인트 관리",
};

const MANUFACTURER_TAB_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  "rfq-inbox": "제조사 견적함",
  orders: "수주 관리",
  "manufacturing-requests-new": "신규 요청",
  "manufacturing-requests-history": "요청 확인/거절",
  production: "생산 진행",
  transactions: "거래 내역",
  "settlement-history": "정산 내역",
  "fee-settlement": "수수료 내역",
  "trade-support": "거래 지원",
  "product-list": "상품 리스트",
  "product-create": "상품 등록",
  chat: "1:1 채팅",
  support: "고객센터",
  settings: "설정",
};

const RFQ_REQUEST_LIST_SELECT = [
  "id",
  "request_number",
  "order_number",
  "client_id",
  "manufacturer_id",
  "manufacturer_name",
  "brand_name",
  "contact_name",
  "contact_email",
  "contact_phone",
  "request_note",
  "admin_memo",
  "has_files",
  "file_link",
  "product_id",
  "product_name",
  "container_id",
  "container_name",
  "design_option_id",
  "design_summary",
  "design_package_id",
  "design_service_ids",
  "design_extra_ids",
  "currency_code",
  "quantity",
  "unit_price",
  "total_price",
  "commission_rate_percent",
  "commission_amount",
  "settlement_amount",
  "commission_locked_at",
  "manufacturer_settlement_requested_at",
  "manufacturer_settlement_requested_by",
  "is_settled",
  "settled_at",
  "settled_by",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const RFQ_REQUEST_PAGE_SIZE = 100;
const PROFILE_LOOKUP_TIMEOUT_MS = 1200;

function resolveSessionDisplayName(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
  return (
    session?.user.user_metadata?.full_name ||
    session?.user.user_metadata?.name ||
    session?.user.identities?.[0]?.identity_data?.full_name ||
    session?.user.identities?.[0]?.identity_data?.name ||
    "고객"
  );
}

function resolveSessionRole(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
  const metadataRole = session?.user.user_metadata?.role;
  return metadataRole === "master" || metadataRole === "manufacturer" || metadataRole === "member" || metadataRole === "partner"
    ? metadataRole
    : null;
}

function resolveClientTab(requestedTab: string | null) {
  if (requestedTab && requestedTab in CLIENT_TAB_LABELS) {
    return requestedTab;
  }

  return "dashboard";
}

function resolveManufacturerTab(requestedTab: string | null) {
  if (requestedTab === "manufacturing-requests") {
    return "manufacturing-requests-new";
  }

  if (requestedTab && requestedTab in MANUFACTURER_TAB_LABELS) {
    return requestedTab;
  }

  return "dashboard";
}

function tabNeedsRfqRequests(viewMode: ConnectViewMode, tab: string) {
  if (viewMode === "manufacturer") {
    return [
      "dashboard",
      "rfq-inbox",
      "orders",
      "manufacturing-requests-new",
      "manufacturing-requests-history",
      "production",
      "transactions",
      "settlement-history",
      "fee-settlement",
      "trade-support",
    ].includes(tab);
  }

  return ["dashboard", "project", "delivery", "payment", "refund-disputes"].includes(tab);
}

export default function MyConnectPage() {
  const [userId, setUserId] = useState<string>("");
  const [displayName, setDisplayName] = useState("고객");
  const [userRole, setUserRole] = useState<AppRole>("member");
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [manufacturerName, setManufacturerName] = useState("");
  const [viewMode, setViewMode] = useState<ConnectViewMode>("client");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [manufacturerInboxView, setManufacturerInboxView] = useState<"new" | "rejected" | "expired">("new");
  const [clientProjectView, setClientProjectView] = useState<ProjectView>("new");
  const [rfqRequests, setRfqRequests] = useState<RfqRequestRow[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [chatInitialRoomId, setChatInitialRoomId] = useState("");
  const rfqRequestFetchIdRef = useRef(0);

  useEffect(() => {
    const initializePage = async () => {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get("tab");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/?auth=login";
        return;
      }

      setUserId(session.user.id);
      setDisplayName(resolveSessionDisplayName(session));

      const fallbackRole = resolveSessionRole(session) || "member";
      setUserRole(fallbackRole);

      const profileLookup = Promise.race([
        supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.warn("Profile role lookup skipped:", error.message);
              return null;
            }

            return data;
          }),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), PROFILE_LOOKUP_TIMEOUT_MS);
        }),
      ]);

      const [profile, { data: manufacturer, error: manufacturerError }] = await Promise.all([
        profileLookup,
        supabase.from("manufacturers").select("id, name").eq("owner_id", session.user.id).maybeSingle(),
      ]);
      if (manufacturerError) {
        console.warn("Manufacturer lookup failed:", manufacturerError.message);
      }

      const hasLinkedManufacturer = Boolean(manufacturer?.id);
      const profileRole = (profile?.role as AppRole | undefined) || fallbackRole;
      const resolvedDisplayName =
        profile?.full_name?.trim() ||
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.identities?.[0]?.identity_data?.full_name ||
        session.user.identities?.[0]?.identity_data?.name ||
        "고객";
      setDisplayName(resolvedDisplayName);
      const nextRole: AppRole =
        profileRole === "master"
          ? "master"
          : profileRole === "partner"
            ? "partner"
            : hasLinkedManufacturer && profileRole === "manufacturer"
              ? "manufacturer"
              : "member";
      setUserRole(nextRole);

      if (nextRole === "master" || nextRole === "partner") {
        window.location.href = getPortalHomeByRole(nextRole);
        return;
      }

      if (nextRole === "manufacturer" && hasLinkedManufacturer) {
        setViewMode("manufacturer");
        setActiveTab(resolveManufacturerTab(requestedTab));

        setManufacturerId(manufacturer?.id ?? null);
        setManufacturerName(manufacturer?.name || "");
      } else {
        setViewMode("client");
        setActiveTab(resolveClientTab(requestedTab));
        setManufacturerId(null);
        setManufacturerName("");
      }

      setIsLoading(false);
    };

    void initializePage();
  }, []);

  const fetchRfqRequests = useCallback(async () => {
    if (!userId) return;

    const fetchId = rfqRequestFetchIdRef.current + 1;
    rfqRequestFetchIdRef.current = fetchId;

    const query =
      viewMode === "manufacturer" && manufacturerId
        ? supabase.from("rfq_requests").select(RFQ_REQUEST_LIST_SELECT).eq("manufacturer_id", manufacturerId)
        : supabase.from("rfq_requests").select(RFQ_REQUEST_LIST_SELECT).eq("client_id", userId);

    let from = 0;
    let hasMore = true;
    let isFirstPage = true;
    const allRequests: RfqRequestRow[] = [];

    while (hasMore) {
      const { data, error } = await query.order("created_at", { ascending: false }).range(from, from + RFQ_REQUEST_PAGE_SIZE - 1);

      if (rfqRequestFetchIdRef.current !== fetchId) {
        return;
      }

      if (error) {
        console.error("Failed to fetch rfq requests:", error.message);
        return;
      }

      const pageRequests = ((data as unknown as RfqRequestRow[] | null) || []);
      allRequests.push(...pageRequests);

      if (isFirstPage) {
        setRfqRequests(pageRequests);
        setSelectedRfqId((prev) => (pageRequests.some((request) => request.id === prev) ? prev : pageRequests[0]?.id ?? null));
        isFirstPage = false;
      } else {
        setRfqRequests([...allRequests]);
        setSelectedRfqId((prev) => (allRequests.some((request) => request.id === prev) ? prev : allRequests[0]?.id ?? null));
      }

      hasMore = pageRequests.length === RFQ_REQUEST_PAGE_SIZE;
      from += RFQ_REQUEST_PAGE_SIZE;

      if (hasMore) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }
  }, [manufacturerId, userId, viewMode]);

  useEffect(() => {
    if (isLoading || !tabNeedsRfqRequests(viewMode, activeTab)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchRfqRequests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, fetchRfqRequests, isLoading, viewMode]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const url = new URL(window.location.href);
    const defaultTab = "dashboard";

    if (activeTab === defaultTab) {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab, isLoading, viewMode]);

  const handleRequestPatch = async (requestId: string, patch: Partial<Pick<RfqRequestRow, "status" | "admin_memo" | "updated_at">>) => {
    const currentRequest = rfqRequests.find((r) => r.id === requestId);
    if (currentRequest?.status === "fulfilled" || currentRequest?.status === "refunded" || currentRequest?.status === "request_cancelled") {
      console.warn("Attempted to update a final request:", requestId);
      return;
    }

    const response = await authFetch(`/api/rfqs/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: patch.status,
        adminMemo: patch.admin_memo,
      }),
    });
    const payload = (await response.json()) as { error?: string; data?: RfqRequestRow };

    if (!response.ok || !payload.data) {
      alert(`주문 정보 변경에 실패했습니다: ${payload.error || "알 수 없는 오류"}`);
      throw new Error(payload.error || "rfq_update_failed");
    }

    setRfqRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
            ...request,
            ...payload.data,
          }
          : request
      )
    );
  };

  const handleRequestStatusChange = async (requestId: string, status: RfqRequestStatus) => {
    await handleRequestPatch(requestId, {
      status,
    });
  };

  const handlePaymentStatusChange = async (requestId: string, status: RfqRequestStatus) => {
    await handleRequestStatusChange(requestId, status);
  };

  const handleAdminMemoChange = async (requestId: string, adminMemo: string) => {
    await handleRequestPatch(requestId, {
      admin_memo: adminMemo.trim() || null,
    });
  };

  const isManufacturer = userRole === "manufacturer";
  const clientProjectRequests = useMemo(() => rfqRequests.filter((request) => request.status === "pending"), [rfqRequests]);
  const clientRejectedRequests = useMemo(
    () => rfqRequests.filter((request) => request.status === "rejected" || request.status === "refunded" || request.status === "request_cancelled"),
    [rfqRequests]
  );
  const clientExpiredRequests = useMemo(
    () => rfqRequests.filter((request) => request.status !== "pending" && request.status !== "rejected" && request.status !== "refunded" && request.status !== "request_cancelled"),
    [rfqRequests]
  );
  const manufacturerInboxRequests = useMemo(() => rfqRequests.filter((request) => request.status === "pending"), [rfqRequests]);
  const manufacturerRejectedRequests = useMemo(() => rfqRequests.filter((request) => request.status === "rejected" || request.status === "refunded" || request.status === "request_cancelled"), [rfqRequests]);
  const manufacturerExpiredRequests = useMemo(
    () => rfqRequests.filter((request) => request.status !== "pending" && request.status !== "rejected" && request.status !== "refunded" && request.status !== "request_cancelled"),
    [rfqRequests]
  );
  const manufacturerOrderRequests = useMemo(
    () =>
      rfqRequests.filter((request) =>
        [
          "reviewing",
          "payment_in_progress",
          "payment_completed",
          "production_waiting",
          "production_started",
          "production_in_progress",
          "manufacturing_completed",
          "delivery_completed",
          "fulfilled",
          "refunded",
          "rejected",
          "quoted",
          "ordered",
          "completed",
        ].includes(request.status)
      ),
    [rfqRequests]
  );
  const visibleManufacturerRequests = useMemo(() => {
    if (manufacturerInboxView === "new") return manufacturerInboxRequests;
    if (manufacturerInboxView === "rejected") return manufacturerRejectedRequests;
    return manufacturerExpiredRequests;
  }, [manufacturerInboxView, manufacturerInboxRequests, manufacturerRejectedRequests, manufacturerExpiredRequests]);
  const visibleClientProjectRequests = useMemo(() => {
    if (clientProjectView === "new") return clientProjectRequests;
    if (clientProjectView === "rejected") return clientRejectedRequests;
    return clientExpiredRequests;
  }, [clientExpiredRequests, clientProjectRequests, clientProjectView, clientRejectedRequests]);
  const selectedClientProjectRequest = useMemo(
    () => visibleClientProjectRequests.find((request) => request.id === selectedRfqId) || visibleClientProjectRequests[0] || null,
    [selectedRfqId, visibleClientProjectRequests]
  );
  const selectedManufacturerInboxRequest = useMemo(
    () => visibleManufacturerRequests.find((request) => request.id === selectedRfqId) || visibleManufacturerRequests[0] || null,
    [visibleManufacturerRequests, selectedRfqId]
  );
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0064FF] border-t-transparent"></div>
      </div>
    );
  }

  const renderClientProjectsWithTabs = () => (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f9fafb]">
      <div className="border-b border-[#e5e8eb] bg-white px-6 py-4">
        <div className="inline-flex rounded-[14px] bg-[#f2f4f7] p-1">
          {[
            { id: "new", label: "신규 요청", count: clientProjectRequests.length },
            { id: "rejected", label: "거절/환불/요청취소", count: clientRejectedRequests.length },
            { id: "expired", label: "완료된 내역", count: clientExpiredRequests.length },
          ].map((tab) => {
            const isActive = clientProjectView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const nextView = tab.id as ProjectView;
                  setClientProjectView(nextView);
                  setSelectedRfqId(
                    (nextView === "new"
                      ? clientProjectRequests[0]?.id
                      : nextView === "rejected"
                        ? clientRejectedRequests[0]?.id
                        : clientExpiredRequests[0]?.id) ?? null
                  );
                }}
                className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold transition ${isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#667085] hover:text-[#111827]"
                  }`}
              >
                {tab.label}
                <span className={`ml-2 ${isActive ? "text-[#0064ff]" : "text-[#98a2b3]"}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ProjectList
          requests={visibleClientProjectRequests}
          activeRequestId={selectedClientProjectRequest?.id ?? null}
          onRequestSelect={setSelectedRfqId}
          title={
            clientProjectView === "new"
              ? "신규 요청 리스트"
              : clientProjectView === "rejected"
                ? "거절/환불/요청취소 리스트"
                : "완료된 내역 리스트"
          }
          emptyLabel={
            clientProjectView === "new"
              ? "신규 요청이 없습니다."
              : clientProjectView === "rejected"
                ? "거절/환불/요청취소된 요청이 없습니다."
                : "완료된 내역이 없습니다."
          }
        />
        {visibleClientProjectRequests.length ? <ClientProjectDetail request={selectedClientProjectRequest} /> : <EmptyState />}
      </div>
    </div>
  );

  const renderManufacturerRfqInbox = () => (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f9fafb]">
      <div className="border-b border-[#e5e8eb] bg-white px-6 py-4">
        <div className="inline-flex rounded-[14px] bg-[#f2f4f7] p-1">
          {[
            { id: "new", label: "신규 요청", count: manufacturerInboxRequests.length },
            { id: "rejected", label: "거절/환불/요청취소", count: manufacturerRejectedRequests.length },
            { id: "expired", label: "완료된 내역", count: manufacturerExpiredRequests.length },
          ].map((tab) => {
            const isActive = manufacturerInboxView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const nextView = tab.id as "new" | "rejected" | "expired";
                  setManufacturerInboxView(nextView);
                  setSelectedRfqId(
                    (nextView === "new"
                      ? manufacturerInboxRequests[0]?.id
                      : nextView === "rejected"
                        ? manufacturerRejectedRequests[0]?.id
                        : manufacturerExpiredRequests[0]?.id) ?? null
                  );
                }}
                className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold transition ${isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#667085] hover:text-[#111827]"
                  }`}
              >
                {tab.label}
                <span className={`ml-2 ${isActive ? "text-[#0064ff]" : "text-[#98a2b3]"}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ProjectList
          requests={visibleManufacturerRequests}
          activeRequestId={selectedManufacturerInboxRequest?.id ?? null}
          onRequestSelect={setSelectedRfqId}
          title={
            manufacturerInboxView === "new"
              ? "견적 요청 리스트"
              : manufacturerInboxView === "rejected"
                ? "거절/환불/요청취소 리스트"
                : "완료된 내역 리스트"
          }
          emptyLabel={
            manufacturerInboxView === "new"
              ? "도착한 견적 요청이 없습니다."
              : manufacturerInboxView === "rejected"
                ? "거절/환불/요청취소된 요청이 없습니다."
                : "승인된 내역이 없습니다."
          }
          showCreateButton={false}
          statusOptions={
            manufacturerInboxView === "new"
              ? [{ value: "pending", label: "신규 요청" }]
              : manufacturerInboxView === "rejected"
                ? [{ value: "rejected", label: "거절" }, { value: "refunded", label: "환불" }, { value: "request_cancelled", label: "요청취소" }]
                : [
                  { value: "reviewing", label: "결제 대기" },
                  { value: "payment_completed", label: "결제 완료" },
                  { value: "production_waiting", label: "생산 대기" },
                  { value: "production_started", label: "제조 시작" },
                  { value: "production_in_progress", label: "제조 진행중" },
                  { value: "manufacturing_completed", label: "제조 완료" },
                  { value: "delivery_completed", label: "납품 완료" },
                  { value: "quoted", label: "제조 대기" },
                  { value: "ordered", label: "제조 시작" },
                  { value: "completed", label: "제조 완료" },
                  { value: "fulfilled", label: "거래 완료" },
                  { value: "refunded", label: "환불" },
                ]
          }
          statusLabelOverrides={
            manufacturerInboxView === "new"
              ? { pending: "신규 요청" }
              : manufacturerInboxView === "rejected"
                ? { rejected: "거절", refunded: "환불", request_cancelled: "요청취소" }
                : undefined
          }
        />
        <RfqInboxDetail
          request={selectedManufacturerInboxRequest}
          onStatusChange={async (requestId, status) => {
            await handleRequestStatusChange(requestId, status);
            const remainingPending = rfqRequests.filter((request) => request.id !== requestId && request.status === "pending");
            setSelectedRfqId(remainingPending[0]?.id ?? null);
            if (status === "reviewing") {
              setManufacturerInboxView("expired");
              setSelectedRfqId(requestId);
            }
          }}
          onReject={async (requestId, reason) => {
            await handleRequestPatch(requestId, {
              status: "rejected",
              admin_memo: reason,
              updated_at: new Date().toISOString(),
            });
            setManufacturerInboxView("rejected");
            setSelectedRfqId(requestId);
          }}
          statusLabelOverrides={{ pending: "신규 요청", rejected: "거절", refunded: "환불", request_cancelled: "요청취소" }}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    if (viewMode === "manufacturer") {
      switch (activeTab) {
        case "dashboard":
          return (
            <ManufacturerDashboard
              displayName={manufacturerName || displayName}
              requests={rfqRequests}
              onRequestSelect={setSelectedRfqId}
              onTabChange={setActiveTab}
              onApproveRequest={(requestId) => handleRequestStatusChange(requestId, "reviewing")}
              onRejectRequest={(requestId, reason) =>
                handleRequestPatch(requestId, {
                  status: "rejected",
                  admin_memo: reason,
                  updated_at: new Date().toISOString(),
                })
              }
            />
          );
        case "chat":
          return <ChatSystem userId={userId} viewMode={viewMode} />;
        case "support":
          return <SupportChatSystem userId={userId} />;
        case "manufacturing-requests-new":
        case "manufacturing-requests-history":
          return (
            <ManufacturerRequestHub
              requests={rfqRequests}
              initialTab={activeTab === "manufacturing-requests-history" ? "history" : "pending"}
              onApprove={(requestId) => handleRequestStatusChange(requestId, "reviewing")}
              onReject={(requestId, reason) =>
                handleRequestPatch(requestId, {
                  status: "rejected",
                  admin_memo: reason,
                  updated_at: new Date().toISOString(),
                })
              }
            />
          );
        case "rfq-inbox":
          return renderManufacturerRfqInbox();
        case "orders":
          return (
            <OrdersManagement
              requests={manufacturerOrderRequests}
              onStatusChange={handleRequestStatusChange}
              onAdminMemoChange={handleAdminMemoChange}
            />
          );
        case "production":
          return <ProductionManagement requests={rfqRequests} onStatusChange={handleRequestStatusChange} />;
        case "transactions":
          return <TransactionsSettlement requests={rfqRequests} view="transactions" onRequestsRefresh={fetchRfqRequests} />;
        case "settlement-history":
          return <TransactionsSettlement requests={rfqRequests} view="settlements" onRequestsRefresh={fetchRfqRequests} />;
        case "fee-settlement":
          return <TransactionsSettlement requests={rfqRequests} view="fees" onRequestsRefresh={fetchRfqRequests} />;
        case "trade-support":
          return <ManufacturerTradeSupport requests={rfqRequests} />;
        case "quote-submissions":
        case "active-projects":
        case "completed-projects":
          return renderClientProjectsWithTabs();
        case "product-list":
        case "product-create":
          return <ProductRegistration activeTab={activeTab as ProductManagementTab} onTabChange={setActiveTab} />;
        case "settings":
          return <AccountSettings />;
        default:
          return <div className="flex flex-1 items-center justify-center bg-[#F8F9FA] font-medium text-gray-500">준비 중인 서비스입니다.</div>;
      }
    }

    switch (activeTab) {
      case "quote-request":
        return <ClientQuoteRequestHub onTabChange={setActiveTab} />;
      case "manufacturer-list":
        return (
          <ClientManufacturerDirectory
            onChatStart={(roomId) => {
              setChatInitialRoomId(roomId);
              setActiveTab("chat");
            }}
          />
        );
      case "dashboard":
        return (
          <ClientDashboard
            displayName={displayName}
            requests={rfqRequests}
            onRequestSelect={setSelectedRfqId}
            onTabChange={setActiveTab}
          />
        );
      case "project":
        return renderClientProjectsWithTabs();
      case "delivery":
        return (
          <ClientDeliveryHub
            requests={rfqRequests}
            onRequestSelect={setSelectedRfqId}
            onTabChange={setActiveTab}
            onPaymentStatusChange={handlePaymentStatusChange}
            onRequestCancel={(requestId) => handleRequestStatusChange(requestId, "request_cancelled")}
          />
        );
      case "chat":
        return <ChatSystem userId={userId} viewMode={viewMode} initialRoomId={chatInitialRoomId} />;
      case "support":
        return <SupportChatSystem userId={userId} />;
      case "payment":
        return <ClientPaymentManagement requests={rfqRequests} />;
      case "refund-disputes":
        return <ClientRefundDisputeCenter requests={rfqRequests} onRefundConfirmed={(updatedRequest) => {
          setRfqRequests((prev) => prev.map((request) => (request.id === updatedRequest.id ? { ...request, ...updatedRequest } : request)));
        }} />;
      case "settings":
        return <AccountSettings />;
      case "points":
        return <PointsWallet />;
      default:
        return <div className="flex flex-1 items-center justify-center bg-[#F8F9FA] font-medium text-gray-500">준비 중인 서비스입니다.</div>;
    }
  };

  const isFixedHeightTab = activeTab === "chat" || activeTab === "support";

  return (
    <div className={`flex flex-col bg-white ${isFixedHeightTab ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}>
      <main className={`flex flex-1 ${isFixedHeightTab ? "min-h-0 overflow-hidden" : ""}`}>
        <Sidebar
          activeTab={activeTab}
          displayName={displayName}
          isManufacturer={isManufacturer}
          onTabChange={setActiveTab}
          viewMode={viewMode}
          manufacturerName={manufacturerName}
        />
        <div className={`flex min-w-0 flex-1 flex-col bg-white ${isFixedHeightTab ? "overflow-hidden" : ""}`}>
          <PortalPageHeader
            portalLabel={viewMode === "manufacturer" ? "제조사 대시보드" : "의뢰자 대시보드"}
            sectionLabel={(viewMode === "manufacturer" ? MANUFACTURER_TAB_LABELS : CLIENT_TAB_LABELS)[activeTab] || "대시보드"}
            displayName={viewMode === "manufacturer" ? manufacturerName : displayName}
            showPoints={viewMode === "client" && userRole === "member"}
          />
          <div className={`flex-1 bg-[#F8F9FA]${isFixedHeightTab ? "min-h-0 overflow-hidden" : ""}`}>{renderContent()}</div>
        </div>
      </main>
      {viewMode === "client" && userRole === "member" ? <ClientDailyPopup /> : null}
    </div>
  );
}
