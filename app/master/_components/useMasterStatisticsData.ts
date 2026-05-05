"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

type StatisticsRequestRow = {
  id: string;
  status: string;
  total_price: number | null;
  commission_rate_percent: number | null;
  commission_amount: number | null;
  commission_locked_at: string | null;
  currency_code: string | null;
  created_at: string;
};

type StatisticsAuditLogRow = {
  rfq_request_id: string;
  next_status: string | null;
  created_at: string;
};

type StatisticsProfileRow = {
  role: string | null;
  created_at: string;
};

type StatisticsManufacturerRow = {
  created_at: string;
};

type StatisticsWalletRow = {
  balance: number | null;
  lifetime_earned: number | null;
  lifetime_spent: number | null;
};

type StatisticsPointPurchaseRow = {
  amount_krw: number | null;
  created_at: string;
  completed_at: string | null;
};

export const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
export const SALES_CURRENCIES: CurrencyCode[] = ["NZD", "KRW", "USD"];

const SALES_RECORDED_STATUSES = new Set(["fulfilled"]);

function isSalesRecordedRequest(request: StatisticsRequestRow) {
  return SALES_RECORDED_STATUSES.has(request.status);
}

function getSalesRecordedAt(request: StatisticsRequestRow, salesRecordedAtMap: Map<string, string>) {
  return salesRecordedAtMap.get(request.id) || request.commission_locked_at || request.created_at;
}

function getPointPurchaseRecordedAt(purchase: StatisticsPointPurchaseRow) {
  return purchase.completed_at || purchase.created_at;
}

function toAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return amount;
}

export function useMasterStatisticsData(selectedYear: number) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<StatisticsRequestRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<StatisticsAuditLogRow[]>([]);
  const [profiles, setProfiles] = useState<StatisticsProfileRow[]>([]);
  const [manufacturers, setManufacturers] = useState<StatisticsManufacturerRow[]>([]);
  const [wallets, setWallets] = useState<StatisticsWalletRow[]>([]);
  const [pointPurchases, setPointPurchases] = useState<StatisticsPointPurchaseRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchStatistics = async () => {
      setLoading(true);
      setError("");

      const rangeStart = new Date(currentYear - 4, 0, 1).toISOString();

      const [requestResult, profileResult, manufacturerResult, walletResult, pointPurchaseResult] = await Promise.all([
        supabase
          .from("rfq_requests")
          .select("id, status, total_price, commission_rate_percent, commission_amount, commission_locked_at, currency_code, created_at")
          .gte("created_at", rangeStart)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("role, created_at").gte("created_at", rangeStart).order("created_at", { ascending: true }),
        supabase.from("manufacturers").select("created_at").gte("created_at", rangeStart).order("created_at", { ascending: true }),
        supabase.from("user_point_wallets").select("balance, lifetime_earned, lifetime_spent"),
        supabase
          .from("point_purchases")
          .select("amount_krw, created_at, completed_at")
          .eq("status", "completed")
          .gte("created_at", rangeStart)
          .order("completed_at", { ascending: true }),
      ]);

      if (requestResult.error) {
        if (!cancelled) {
          setError("통계 데이터를 불러오지 못했습니다.");
          setLoading(false);
        }
        console.error("Failed to fetch statistics requests:", requestResult.error.message);
        return;
      }

      const requestRows = (requestResult.data as StatisticsRequestRow[] | null) || [];
      const completedRequestIds = requestRows.filter((request) => isSalesRecordedRequest(request)).map((request) => request.id);
      const auditResult =
        completedRequestIds.length > 0
          ? await supabase
              .from("rfq_audit_logs")
              .select("rfq_request_id, next_status, created_at")
              .in("next_status", Array.from(SALES_RECORDED_STATUSES))
              .in("rfq_request_id", completedRequestIds)
              .order("created_at", { ascending: true })
          : { data: [], error: null };

      if (cancelled) return;

      if (profileResult.error || manufacturerResult.error || walletResult.error || pointPurchaseResult.error || auditResult.error) {
        setError("통계 데이터를 불러오지 못했습니다.");
        if (profileResult.error) console.error("Failed to fetch statistics profiles:", profileResult.error.message);
        if (manufacturerResult.error) console.error("Failed to fetch statistics manufacturers:", manufacturerResult.error.message);
        if (walletResult.error) console.error("Failed to fetch statistics wallets:", walletResult.error.message);
        if (pointPurchaseResult.error) console.error("Failed to fetch statistics point purchases:", pointPurchaseResult.error.message);
        if (auditResult.error) console.error("Failed to fetch statistics audit logs:", auditResult.error.message);
        setLoading(false);
        return;
      }

      setRequests(requestRows);
      setAuditLogs((auditResult.data as StatisticsAuditLogRow[] | null) || []);
      setProfiles((profileResult.data as StatisticsProfileRow[] | null) || []);
      setManufacturers((manufacturerResult.data as StatisticsManufacturerRow[] | null) || []);
      setWallets((walletResult.data as StatisticsWalletRow[] | null) || []);
      setPointPurchases((pointPurchaseResult.data as StatisticsPointPurchaseRow[] | null) || []);
      setLoading(false);
    };

    void fetchStatistics();

    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    requests.forEach((row) => years.add(new Date(row.created_at).getFullYear()));
    profiles.forEach((row) => years.add(new Date(row.created_at).getFullYear()));
    manufacturers.forEach((row) => years.add(new Date(row.created_at).getFullYear()));
    pointPurchases.forEach((row) => years.add(new Date(getPointPurchaseRecordedAt(row)).getFullYear()));

    if (years.size === 0) years.add(currentYear);

    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, manufacturers, pointPurchases, profiles, requests]);

  const activeYear = availableYears.includes(selectedYear) ? selectedYear : (availableYears[0] || currentYear);

  const salesRecordedAtMap = useMemo(() => {
    const map = new Map<string, string>();

    auditLogs.forEach((log) => {
      if (!log.next_status || !SALES_RECORDED_STATUSES.has(log.next_status) || map.has(log.rfq_request_id)) return;
      map.set(log.rfq_request_id, log.created_at);
    });

    return map;
  }, [auditLogs]);

  const requesterProfiles = useMemo(() => profiles.filter((profile) => profile.role === "member"), [profiles]);
  const yearlyRequests = useMemo(() => requests.filter((request) => new Date(request.created_at).getFullYear() === activeYear), [activeYear, requests]);
  const yearlyManufacturers = useMemo(
    () => manufacturers.filter((manufacturer) => new Date(manufacturer.created_at).getFullYear() === activeYear),
    [activeYear, manufacturers]
  );
  const yearlyPointPurchases = useMemo(
    () => pointPurchases.filter((purchase) => new Date(getPointPurchaseRecordedAt(purchase)).getFullYear() === activeYear),
    [activeYear, pointPurchases]
  );
  const yearlyCompletedRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (!isSalesRecordedRequest(request)) return false;
        return new Date(getSalesRecordedAt(request, salesRecordedAtMap)).getFullYear() === activeYear;
      }),
    [activeYear, requests, salesRecordedAtMap]
  );

  const monthlySales = useMemo(() => {
    const totals: Record<CurrencyCode, number[]> = {
      NZD: Array.from({ length: 12 }, () => 0),
      KRW: Array.from({ length: 12 }, () => 0),
      USD: Array.from({ length: 12 }, () => 0),
    };

    yearlyCompletedRequests.forEach((request) => {
      const month = new Date(getSalesRecordedAt(request, salesRecordedAtMap)).getMonth();
      const currencyCode = normalizeCurrencyCode(request.currency_code);
      totals[currencyCode][month] += toAmount(request.total_price);
    });

    return totals;
  }, [salesRecordedAtMap, yearlyCompletedRequests]);

  const monthlyRequesterMembers = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const monthEnd = new Date(activeYear, index + 1, 0, 23, 59, 59, 999);
        return requesterProfiles.filter((profile) => new Date(profile.created_at) <= monthEnd).length;
      }),
    [activeYear, requesterProfiles]
  );

  const yearlySalesSummary = useMemo(
    () =>
      yearlyCompletedRequests.reduce<Record<CurrencyCode, { sales: number; commission: number }>>(
        (acc, request) => {
          const currencyCode = normalizeCurrencyCode(request.currency_code);
          const totalPrice = toAmount(request.total_price);
          const storedCommission = toAmount(request.commission_amount);
          const commission = storedCommission > 0 ? storedCommission : totalPrice * ((toAmount(request.commission_rate_percent) || 3) / 100);

          acc[currencyCode].sales += totalPrice;
          acc[currencyCode].commission += commission;
          return acc;
        },
        {
          NZD: { sales: 0, commission: 0 },
          KRW: { sales: 0, commission: 0 },
          USD: { sales: 0, commission: 0 },
        }
      ),
    [yearlyCompletedRequests]
  );

  const totalPointBalance = useMemo(() => wallets.reduce((sum, wallet) => sum + toAmount(wallet.balance), 0), [wallets]);
  const totalPointsIssued = useMemo(() => wallets.reduce((sum, wallet) => sum + toAmount(wallet.lifetime_earned), 0), [wallets]);
  const totalPointsSpent = useMemo(() => wallets.reduce((sum, wallet) => sum + toAmount(wallet.lifetime_spent), 0), [wallets]);

  return {
    activeYear,
    availableYears,
    error,
    loading,
    monthlyRequesterMembers,
    monthlySales,
    requesterProfiles,
    totalPointBalance,
    totalPointsIssued,
    totalPointsSpent,
    yearlyCompletedRequests,
    yearlyManufacturers,
    yearlyPointPurchases,
    yearlyRequests,
    yearlySalesSummary,
    manufacturers,
  };
}
