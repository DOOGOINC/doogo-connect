"use client";

import { useEffect, useState } from "react";
import { Coins, Gift, Loader2, Save, Users } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type PointSettingsResponse = {
  settings: {
    referrerRewardPoints: number;
    refereeRewardPoints: number;
  };
  stats: {
    referralCount: number;
    totalBalance: number;
    totalEarned: number;
    walletCount: number;
  };
};

export function PointSettingsAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    referrerRewardPoints: 0,
    refereeRewardPoints: 0,
  });
  const [stats, setStats] = useState({
    referralCount: 0,
    totalBalance: 0,
    totalEarned: 0,
    walletCount: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authFetch("/api/admin/point-settings");
        const payload = (await response.json()) as PointSettingsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "포인트 설정을 불러오지 못했습니다.");
        }
        setSettings(payload.settings);
        setStats(payload.stats);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "포인트 설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await authFetch("/api/admin/point-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as { error?: string; settings?: PointSettingsResponse["settings"] };
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "포인트 설정 저장에 실패했습니다.");
      }

      setSettings(payload.settings);
      setMessage("포인트 지급 기준을 저장했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "포인트 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#191F28]">포인트 설정</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[14px] border border-[#F2F4F6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#0064FF]" />
              <p className="text-sm font-semibold text-[#4E5968]">누적 추천 성공</p>
            </div>
            <p className="mt-4 text-[30px] font-bold text-[#191F28]">{stats.referralCount.toLocaleString()}건</p>
          </div>

          <div className="rounded-[14px] border border-[#F2F4F6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-[#00A86B]" />
              <p className="text-sm font-semibold text-[#4E5968]">전체 잔여 포인트</p>
            </div>
            <p className="mt-4 text-[30px] font-bold text-[#191F28]">{stats.totalBalance.toLocaleString()} P</p>
          </div>

          <div className="rounded-[14px] border border-[#F2F4F6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-[#7C3AED]" />
              <p className="text-sm font-semibold text-[#4E5968]">누적 지급 포인트</p>
            </div>
            <p className="mt-4 text-[30px] font-bold text-[#191F28]">{stats.totalEarned.toLocaleString()} P</p>
          </div>
        </div>

        <section className="mt-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#191F28]">지급 기준</h2>
          <p className="mt-2 text-sm text-[#667085]">추천인을 공유한 사람과 추천 링크로 가입한 사람의 적립 포인트를 별도로 설정할 수 있습니다.</p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-[20px] border border-[#EEF2F6] bg-[#FCFDFF] p-5">
              <p className="text-sm font-semibold text-[#344054]">추천인을 공유한 사람 지급 포인트</p>
              <input
                type="number"
                min={0}
                step={1}
                value={settings.referrerRewardPoints}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    referrerRewardPoints: Math.max(0, Math.floor(Number(event.target.value || 0))),
                  }))
                }
                className="mt-4 h-14 w-full rounded-2xl border border-[#E5E8EB] px-4 text-[18px] font-bold text-[#191F28] outline-none focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10"
              />
            </div>

            <div className="rounded-[20px] border border-[#EEF2F6] bg-[#FCFDFF] p-5">
              <p className="text-sm font-semibold text-[#344054]">추천 링크로 가입한 사람 지급 포인트</p>
              <input
                type="number"
                min={0}
                step={1}
                value={settings.refereeRewardPoints}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    refereeRewardPoints: Math.max(0, Math.floor(Number(event.target.value || 0))),
                  }))
                }
                className="mt-4 h-14 w-full rounded-2xl border border-[#E5E8EB] px-4 text-[18px] font-bold text-[#191F28] outline-none focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0064FF] px-5 text-sm font-semibold text-white transition hover:bg-[#0052D4] disabled:bg-[#AAB4C8]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              저장하기
            </button>
            {message ? <p className="text-sm font-medium text-[#00A86B]">{message}</p> : null}
            {error ? <p className="text-sm font-medium text-[#E5484D]">{error}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
