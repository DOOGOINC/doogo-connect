"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Megaphone,
  MessageCircleMore,
  Plus,
  Search,
  Store,
  Building2,
  MessageCircle,
  X
} from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { formatRfqCurrency, formatRfqDate, type RfqRequestRow } from "@/lib/rfq";
import { buildStorageObjectUrl, MANUFACTURER_ASSET_BUCKET } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ClientDashboardProps {
  displayName: string;
  refreshKey?: number;
  requests: RfqRequestRow[];
  onRequestSelect: (requestId: string) => void;
  onTabChange: (tabId: string) => void;
}
const ORDER_STATUSES = [
  "payment_completed",
  "production_waiting",
  "quoted",
  "production_started",
  "ordered",
  "production_in_progress",
  "manufacturing_completed",
  "completed",
  "delivery_completed",
  "fulfilled",
] as const;
const INQUIRY_STATUSES = ["pending", "reviewing", "payment_in_progress"] as const;

type NoticeItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

function resolveManufacturerLogoUrl(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return buildStorageObjectUrl(MANUFACTURER_ASSET_BUCKET, value);
}

function formatNoticeDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatusLabel(status: RfqRequestRow["status"]) {
  switch (status) {
    case "pending":
      return "견적 접수";
    case "reviewing":
      return "결제대기";
    case "payment_in_progress":
      return "결제대기";
    case "payment_completed":
      return "결제완료";
    case "production_waiting":
      return "생산대기";
    case "quoted":
      return "승인완료";
    case "production_started":
      return "제조시작";
    case "ordered":
      return "제조시작";
    case "production_in_progress":
      return "제조중";
    case "manufacturing_completed":
      return "제조완료";
    case "completed":
      return "제조완료";
    case "delivery_completed":
      return "납품완료";
    case "fulfilled":
      return "거래완료";
    case "rejected":
      return "반려됨";
    case "request_cancelled":
      return "요청취소";
    default:
      return "진행중";
  }
}

function getStatusBadgeClass(status: RfqRequestRow["status"]) {
  switch (status) {
    case "production_started":
    case "ordered":
      return "bg-[#eef4ff] text-[#2f6bff]";
    case "manufacturing_completed":
    case "completed":
      return "bg-[#f3e8ff] text-[#a855f7]";
    case "delivery_completed":
    case "fulfilled":
      return "bg-[#dcfce7] text-[#16a34a]";
    case "reviewing":
      return "bg-[#e0f2fe] text-[#0284c7]";
    case "payment_in_progress":
      return "bg-[#fef3c7] text-[#b45309]";
    case "payment_completed":
      return "bg-[#dcfce7] text-[#15803d]";
    case "production_waiting":
    case "quoted":
      return "bg-[#ede9fe] text-[#7c3aed]";
    case "pending":
      return "bg-[#fff7ed] text-[#f97316]";
    case "rejected":
      return "bg-[#fef2f2] text-[#dc2626]";
    case "request_cancelled":
      return "bg-[#f3f4f6] text-[#4b5563]";
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
    case "payment_in_progress":
      return 40;
    case "payment_completed":
      return 45;
    case "production_waiting":
    case "quoted":
      return 55;
    case "production_started":
    case "ordered":
      return 60;
    case "production_in_progress":
      return 75;
    case "manufacturing_completed":
    case "completed":
      return 90;
    case "delivery_completed":
      return 95;
    case "fulfilled":
      return 100;
    case "rejected":
      return 0;
    case "request_cancelled":
      return 0;
    default:
      return 0;
  }
}

export function ClientDashboard({ displayName, refreshKey = 0, requests, onRequestSelect, onTabChange }: ClientDashboardProps) {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [manufacturerLogos, setManufacturerLogos] = useState<Record<number, string>>({});
  const activeOrders = requests.filter((request) => (ORDER_STATUSES as readonly string[]).includes(request.status));
  const totalOrders = requests.length;
  const pendingInquiries = requests.filter((request) => (INQUIRY_STATUSES as readonly string[]).includes(request.status));
  const alertsCount = Math.min(2, Math.max(0, requests.length));
  const visibleOrders = [...activeOrders, ...pendingInquiries.filter((request) => !activeOrders.some((item) => item.id === request.id))]
    .filter((request) => request.status !== "rejected" && request.status !== "request_cancelled")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);
  const visibleManufacturerIds = Array.from(new Set(visibleOrders.map((request) => request.manufacturer_id).filter(Boolean)));
  const visibleManufacturerKey = visibleManufacturerIds.join(",");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const fetchNotices = useCallback(async () => {
    try {
      const response = await authFetch("/api/notices?limit=2");
      const payload = (await response.json()) as { error?: string; notices?: NoticeItem[] };

      if (!response.ok) {
        throw new Error(payload.error || "공지사항을 불러오지 못했습니다.");
      }

      setNotices(payload.notices || []);
    } catch (error) {
      console.error(error);
      setNotices([]);
    }
  }, []);

  useEffect(() => {
    void fetchNotices();
  }, [fetchNotices, refreshKey]);

  useEffect(() => {
    const fetchManufacturerLogos = async () => {
      const manufacturerIds = visibleManufacturerKey
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);

      if (!manufacturerIds.length) {
        setManufacturerLogos({});
        return;
      }

      const { data, error } = await supabase.from("manufacturers").select("id, logo, image").in("id", manufacturerIds);
      if (error) {
        console.error("Failed to fetch dashboard manufacturer logos:", error.message);
        return;
      }

      setManufacturerLogos(
        Object.fromEntries(
          ((data as Array<{ id: number; logo: string | null; image: string | null }> | null) || [])
            .map((manufacturer) => [
              manufacturer.id,
              resolveManufacturerLogoUrl(manufacturer.logo || manufacturer.image),
            ])
            .filter((entry): entry is [number, string] => Boolean(entry[1]))
        )
      );
    };

    void fetchManufacturerLogos();
  }, [visibleManufacturerKey]);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-3 py-2 ">
      <div className="mx-auto flex w-full flex-col gap-5">
        <section className="flex flex-col gap-4 p-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1f2a44]">
                안녕하세요, <span className="text-[#2f6bff]">{displayName}</span> 고객님 <span className="text-[26px]">👋</span>
              </h1>
              <p className="mt-1 text-[14px] font-medium text-[#7b8597]">주문 현황과 서비스를 관리하세요.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {[
              { label: "진행중 주문", value: activeOrders.length, icon: Clock3, iconWrap: "bg-[#eef4ff]", iconColor: "text-[#2f6bff]" },
              { label: "총 주문 횟수", value: totalOrders, icon: CheckCircle2, iconWrap: "bg-[#e9fbef]", iconColor: "text-[#22c55e]" },
              { label: "미답변 문의", value: pendingInquiries.length, icon: MessageCircleMore, iconWrap: "bg-[#f4e8ff]", iconColor: "text-[#c084fc]" },
              { label: "알림", value: alertsCount, icon: Bell, iconWrap: "bg-[#fff4df]", iconColor: "text-[#f59e0b]" },
            ].map((card) => (
              <article key={card.label} className="rounded-[14px] border border-[#edf1f6] bg-white p-3.5 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconWrap}`}>
                  <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
                </div>
                <div className="mt-4">
                  <p className="text-[24px] font-bold leading-none text-[#182033]">{card.value} 건</p>
                  <p className="mt-1 text-[14px] font-semibold text-[#8a94a6]">{card.label}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-[14px] bg-[#eef5ff] px-5 py-4">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#2f6bff]">📢
              공지사항
              <span className="rounded-full bg-white px-2 py-0.5 text-[12px] text-[#5c88ff]">{notices.length}건</span>
            </div>
            <div className="mt-3 space-y-2">
              {notices.length > 0 ? notices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedNotice(item)}
                  className="flex w-full items-center justify-between gap-4 text-left text-[14px]"
                >
                  <span className="truncate font-medium text-[#58667d] hover:text-blue-600 hover:underline cursor-pointer">
                    📌 {item.title}
                  </span>
                  <span className="flex-shrink-0 text-[13px] font-semibold text-[#9aa6b6]">{formatNoticeDate(item.created_at)}</span>
                </button>
              )) : (
                <div className="text-[14px] font-medium text-[#8a94a6]">등록된 공지사항이 없습니다.</div>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-[14px] bg-[#2f6bff] p-3.5 text-white shadow-sm transition-all hover:shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-1 opacity-80">
                  <span className="text-[12px]">🆕</span>
                  <p className="text-[12px] font-black tracking-wider">NEW</p>
                </div>
                <h2 className="mt-2 text-[14px] font-extrabold leading-tight">
                  유트랜스퍼 해외송금<br />연동 오픈!
                </h2>
                <p className="mt-2 text-[12px] font-medium text-white/80">
                  해외 제조처 결제가 더욱 간편해졌습니다
                </p>
                <button className="mt-3 rounded-full bg-white/20 px-4 py-1 text-[12px] font-bold backdrop-blur-sm transition hover:bg-white/30">
                  자세히 보기 →
                </button>
              </div>

              <div className="pointer-events-none absolute -bottom-6 -right-4 select-none opacity-20">
                <span className="text-[100px] leading-none">🌏</span>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[14px] bg-[#12c85b] p-3.5 text-white shadow-sm transition-all hover:shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-1 opacity-80">
                  <span className="text-[12px]">⚡</span>
                  <p className="text-[12px] font-black tracking-wider">EVENT</p>
                </div>
                <h2 className="mt-2 text-[14px] font-extrabold leading-tight">
                  첫 OEM 의뢰 시<br />포인트 2배 적립!
                </h2>
                <p className="mt-2 text-[12px] font-medium text-white/80">
                  5,000P 의뢰 → 10,000P 적립 혜택
                </p>
                <button className="mt-3 rounded-full bg-white/20 px-4 py-1 text-[12px] font-bold backdrop-blur-sm transition hover:bg-white/30">
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
              <h2 className="text-[16px] font-bold text-[#20293f]">주문 내역</h2>
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
                    const manufacturerLogo = manufacturerLogos[request.manufacturer_id];
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => {
                          onRequestSelect(request.id);
                          onTabChange(
                            request.status === "pending" ||
                              request.status === "reviewing" ||
                              request.status === "payment_in_progress" ||
                              request.status === "payment_completed" ||
                              request.status === "production_waiting" ||
                              request.status === "quoted" ||
                              request.status === "production_started" ||
                              request.status === "ordered" ||
                              request.status === "production_in_progress" ||
                              request.status === "manufacturing_completed" ||
                              request.status === "completed" ||
                              request.status === "delivery_completed"
                              ? "delivery"
                              : "project"
                          );
                        }}
                        className="block w-full rounded-[14px] px-2 py-2 text-left transition hover:bg-[#f8fbff]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-2">
                            {manufacturerLogo ? (
                              <span className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#f3f4f6]">
                                <Image src={manufacturerLogo} alt="" fill className="object-contain" sizes="34px" />
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate text-[16px] font-bold text-[#27324a]">
                                {request.product_name}
                                <span className="ml-1 text-[12px] font-normal text-[#b0b8c6]">
                                  / {request.manufacturer_name}
                                </span>
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-[#8a94a6]">
                                {request.quantity.toLocaleString()}개 · {formatRfqDate(request.created_at)} · {formatRfqCurrency(request.total_price, request.currency_code)}
                              </p>
                            </div>
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
                  <p className="text-[14px] font-bold text-[#344054]">아직 주문 내역이 없습니다.</p>
                  <p className="mt-2 text-[14px] text-[#8a94a6]">새 견적을 등록하면 이 영역에서 진행 상황을 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { id: "project", label: "새 견적 내기", icon: Plus, path: "/estimate", bg: "bg-[#eef4ff]", color: "text-[#2f6bff]" },
              { id: "delivery", label: "제조사 찾기", icon: Building2, path: "/manufacturers", bg: "bg-[#e9fbef]", color: "text-[#12c85b]" },
              { id: "manufacturer-list", label: "제조사 목록", icon: MessageCircle, path: "", bg: "bg-[#f3e8ff]", color: "text-[#a855f7]" },
            ].map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => {
                  if (onTabChange) onTabChange(shortcut.id);
                  if (shortcut.path) router.push(shortcut.path);
                }}
                className="flex min-h-[110px] flex-col items-center justify-center rounded-[14px] border border-[#edf1f6] bg-white text-center shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fbfdff]"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-[14px] ${shortcut.bg} ${shortcut.color}`}>
                  <shortcut.icon className="h-5 w-5" />
                </div>
                <span className="mt-4 text-[14px] font-bold text-[#27324a]">{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedNotice ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[18px] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-5">
              <h3 className="break-words text-[16px] font-bold leading-7 text-[#111827]">
                {selectedNotice.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="ml-4 shrink-0 rounded-full p-1 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#4b5563]"
                aria-label="공지사항 닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-[12px] font-semibold text-[#8b95a1]">
                {formatNoticeDate(selectedNotice.created_at)} · 두고커넥트
              </p>
              <p className="mt-4 whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed text-[#374151]">
                {selectedNotice.content.trim() || "내용이 없습니다."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
