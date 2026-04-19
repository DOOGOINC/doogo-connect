"use client";

import {
  Bell,
  CheckCircle2,
  Clock3,
  Gift,
  Globe,
  Megaphone,
  MessageCircleMore,
  Plus,
  Search,
  Store,
  ArrowRight
} from "lucide-react";
import { formatRfqCurrency, formatRfqDate, type RfqRequestRow } from "@/lib/rfq";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ClientDashboardProps {
  displayName: string;
  requests: RfqRequestRow[];
  onRequestSelect: (requestId: string) => void;
  onTabChange: (tabId: string) => void;
}
const ORDER_STATUSES = ["ordered", "completed", "fulfilled"] as const;
const INQUIRY_STATUSES = ["pending", "reviewing", "quoted"] as const;

const NOTICE_ITEMS = [
  { id: "notice-1", title: "시스템 점검 안내 (4/15)", date: "2026-04-10" },
  { id: "notice-2", title: "유트랜스퍼 해외송금, 포인트 2배 적립!", date: "2026-04-01" },
];

function getStatusLabel(status: RfqRequestRow["status"]) {
  switch (status) {
    case "pending":
      return "견적 접수";
    case "reviewing":
      return "검토중";
    case "quoted":
      return "승인완료";
    case "ordered":
      return "제조중";
    case "completed":
      return "배송중";
    case "fulfilled":
      return "납품완료";
    case "rejected":
      return "반려됨";
    default:
      return "진행중";
  }
}

function getStatusBadgeClass(status: RfqRequestRow["status"]) {
  switch (status) {
    case "ordered":
      return "bg-[#eef4ff] text-[#2f6bff]";
    case "completed":
      return "bg-[#f3e8ff] text-[#a855f7]";
    case "fulfilled":
      return "bg-[#dcfce7] text-[#16a34a]";
    case "reviewing":
      return "bg-[#e0f2fe] text-[#0284c7]";
    case "quoted":
      return "bg-[#ede9fe] text-[#7c3aed]";
    case "pending":
      return "bg-[#fff7ed] text-[#f97316]";
    case "rejected":
      return "bg-[#fef2f2] text-[#dc2626]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

function getProgress(status: RfqRequestRow["status"]) {
  switch (status) {
    case "pending":
      return 15;
    case "reviewing":
      return 35;
    case "quoted":
      return 55;
    case "ordered":
      return 60;
    case "completed":
      return 90;
    case "fulfilled":
      return 100;
    case "rejected":
      return 0;
    default:
      return 0;
  }
}

export function ClientDashboard({ displayName, requests, onRequestSelect, onTabChange }: ClientDashboardProps) {
  const router = useRouter();
  const activeOrders = requests.filter((request) => (ORDER_STATUSES as readonly string[]).includes(request.status));
  const totalOrders = requests.length;
  const pendingInquiries = requests.filter((request) => (INQUIRY_STATUSES as readonly string[]).includes(request.status));
  const alertsCount = Math.min(2, Math.max(0, requests.length));
  const visibleOrders = [...activeOrders, ...pendingInquiries.filter((request) => !activeOrders.some((item) => item.id === request.id))]
    .filter((request) => request.status !== "rejected")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-5 py-6 lg:px-6 lg:py-7">
      <div className="mx-auto flex w-full flex-col gap-5">
        <section className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-tight text-[#1f2a44]">
                안녕하세요, <span className="text-[#2f6bff]">{displayName}</span> 고객님 <span className="text-[26px]">👋</span>
              </h1>
              <p className="mt-2 text-[14px] font-medium text-[#7b8597]">주문 현황과 서비스를 관리하세요.</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center rounded-2xl border border-[#ffd5d5] px-4 py-2.5 text-[14px] font-semibold text-[#ff5d5d] transition hover:bg-[#fff5f5]"
            >
              로그아웃
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {[
              { label: "진행중 주문", value: activeOrders.length, icon: Clock3, iconWrap: "bg-[#eef4ff]", iconColor: "text-[#2f6bff]" },
              { label: "총 주문 횟수", value: totalOrders, icon: CheckCircle2, iconWrap: "bg-[#e9fbef]", iconColor: "text-[#22c55e]" },
              { label: "미답변 문의", value: pendingInquiries.length, icon: MessageCircleMore, iconWrap: "bg-[#f4e8ff]", iconColor: "text-[#c084fc]" },
              { label: "알림", value: alertsCount, icon: Bell, iconWrap: "bg-[#fff4df]", iconColor: "text-[#f59e0b]" },
            ].map((card) => (
              <article key={card.label} className="rounded-[14px] border border-[#edf1f6] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconWrap}`}>
                  <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
                </div>
                <div className="mt-6">
                  <p className="text-[40px] font-bold leading-none text-[#182033]">{card.value}</p>
                  <p className="mt-2 text-[14px] font-bold text-[#8a94a6]">{card.label}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-[14px] bg-[#eef5ff] px-5 py-4">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#2f6bff]">
              <Megaphone className="h-4 w-4" />
              공지사항
              <span className="rounded-full bg-white px-2 py-0.5 text-[12px] text-[#5c88ff]">{NOTICE_ITEMS.length}건</span>
            </div>
            <div className="mt-3 space-y-2">
              {NOTICE_ITEMS.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 text-[14px]">
                  <span className="truncate font-medium text-[#58667d]">✦ {item.title}</span>
                  <span className="flex-shrink-0 text-[13px] font-semibold text-[#9aa6b6]">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* 왼쪽 카드: 해외송금 */}
            <article className="relative overflow-hidden rounded-[14px] bg-[#2f6bff] p-6 text-white shadow-lg transition-all hover:shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-1 opacity-80">
                  <span className="text-[14px]">🆕</span>
                  <p className="text-[13px] font-black tracking-wider">NEW</p>
                </div>
                <h2 className="mt-2 text-[24px] font-extrabold leading-tight">
                  유트랜스퍼 해외송금<br />연동 오픈!
                </h2>
                <p className="mt-2 text-[14px] font-medium text-white/80">
                  해외 제조처 결제가 더욱 간편해졌습니다
                </p>
                <button className="mt-5 rounded-full bg-white/20 px-4 py-2 text-[13px] font-bold backdrop-blur-sm transition hover:bg-white/30">
                  자세히 보기 →
                </button>
              </div>

              {/* 배경 이모지 오버레이: 크기랑 위치 조정 */}
              <div className="pointer-events-none absolute -bottom-6 -right-4 select-none opacity-20">
                <span className="text-[100px] leading-none">🌏</span>
              </div>
            </article>

            {/* 오른쪽 카드: 이벤트 */}
            <article className="relative overflow-hidden rounded-[14px] bg-[#12c85b] p-6 text-white shadow-lg transition-all hover:shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-1 opacity-80">
                  <span className="text-[14px]">⚡</span>
                  <p className="text-[13px] font-black tracking-wider">EVENT</p>
                </div>
                <h2 className="mt-2 text-[24px] font-extrabold leading-tight">
                  첫 OEM 의뢰 시<br />포인트 2배 적립!
                </h2>
                <p className="mt-2 text-[14px] font-medium text-white/80">
                  5,000P 의뢰 → 10,000P 적립 혜택
                </p>
                <button className="mt-5 rounded-full bg-white/20 px-4 py-2 text-[13px] font-bold backdrop-blur-sm transition hover:bg-white/30">
                  이벤트 참여 →
                </button>
              </div>

              {/* 배경 이모지 오버레이 */}
              <div className="pointer-events-none absolute -bottom-4 -right-4 select-none opacity-20">
                <span className="text-[80px] leading-none">🎁</span>
              </div>
            </article>
          </div>

          <section className="rounded-[14px] border border-[#edf1f6] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf1f6] px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#20293f]">주문 내역</h2>
              <button
                type="button"
                onClick={() => {
                  onTabChange("project");
                  router.push("/estimate");
                }}
                className="inline-flex items-center rounded-[10px] bg-[#2f6bff] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[#1f5af0]"
              >
                <Plus className="mr-1 h-4 w-4" />
                새 견적 내기
              </button>
            </div>

            <div className="px-4 py-3">
              {visibleOrders.length ? (
                <div className="space-y-4">
                  {visibleOrders.map((request) => {
                    const progress = getProgress(request.status);
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => {
                          onRequestSelect(request.id);
                          onTabChange(request.status === "pending" || request.status === "reviewing" || request.status === "quoted" ? "delivery" : "project");
                        }}
                        className="block w-full rounded-[20px] px-2 py-2 text-left transition hover:bg-[#f8fbff]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-[16px] font-bold text-[#27324a]">
                              {request.product_name} <span className="text-[#b0b8c6]">/</span> {request.manufacturer_name}
                            </p>
                            <p className="mt-1 text-[13px] font-medium text-[#8a94a6]">
                              {request.quantity.toLocaleString()}개 · {formatRfqDate(request.created_at)} · {formatRfqCurrency(request.total_price, request.currency_code)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${getStatusBadgeClass(request.status)}`}>{getStatusLabel(request.status)}</span>
                            <span className="text-[13px] font-bold text-[#8a94a6]">{progress}%</span>
                          </div>
                        </div>
                        <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#edf1f6]">
                          <div className="h-full rounded-full bg-[#2f6bff]" style={{ width: `${progress}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-12 text-center">
                  <p className="text-[16px] font-bold text-[#344054]">아직 주문 내역이 없습니다.</p>
                  <p className="mt-2 text-[14px] text-[#8a94a6]">새 견적을 등록하면 이 영역에서 진행 상황을 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { id: "project", label: "새 견적 내기", icon: Plus, path: "/estimate" },
              { id: "delivery", label: "제조사 찾기", icon: Search, path: "/manufacturers" },
              { id: "manufacturer-list", label: "제조사 목록", icon: Store, path: "" },
            ].map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => {
                  if (onTabChange) onTabChange(shortcut.id);
                  if (shortcut.path) router.push(shortcut.path);
                }}
                className="flex min-h-[110px] flex-col items-center justify-center rounded-[6px] border border-[#edf1f6] bg-white text-center shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:bg-[#fbfdff]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eaf1ff] text-[#2f6bff]">
                  <shortcut.icon className="h-5 w-5" />
                </div>
                <span className="mt-4 text-[16px] font-bold text-[#27324a]">{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
