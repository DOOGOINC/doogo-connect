"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MasterLoadingState } from "./MasterLoadingState";

type BannedProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "member" | "manufacturer" | "master" | "partner" | null;
  ban_type: "none" | "temporary" | "permanent" | null;
  ban_reason: string | null;
  ban_updated_at: string | null;
  ban_expires_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isActiveBan(profile: Pick<BannedProfileRow, "ban_type" | "ban_expires_at">) {
  if (profile.ban_type === "permanent") return true;
  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    return new Date(profile.ban_expires_at).getTime() > Date.now();
  }
  return false;
}

function getRoleLabel(role: BannedProfileRow["role"]) {
  if (role === "manufacturer") return "제조사";
  if (role === "member") return "의뢰자";
  if (role === "partner") return "파트너";
  if (role === "master") return "마스터";
  return "회원";
}

function getStatusMeta(profile: Pick<BannedProfileRow, "ban_type" | "ban_expires_at" | "ban_updated_at">) {
  if (profile.ban_type === "permanent") {
    return {
      label: "영구차단",
      className: "bg-[#fdeaea] text-[#e03131]",
    };
  }

  const updatedAt = profile.ban_updated_at ? new Date(profile.ban_updated_at) : null;
  const expiresAt = profile.ban_expires_at ? new Date(profile.ban_expires_at) : null;
  const diffDays =
    updatedAt && expiresAt
      ? Math.round((expiresAt.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return {
    label: diffDays >= 29 ? "30일정지" : "7일제재",
    className: diffDays >= 29 ? "bg-[#fff1e4] text-[#f06417]" : "bg-[#fff7e8] text-[#df7a0f]",
  };
}

export function MasterBlockedMembers() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<BannedProfileRow[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);

      const primaryQuery = await supabase
        .from("profiles")
        .select("id, full_name, email, role, ban_type, ban_reason, ban_updated_at, ban_expires_at")
        .neq("ban_type", "none")
        .order("ban_updated_at", { ascending: false });

      if (!primaryQuery.error) {
        setProfiles((primaryQuery.data as BannedProfileRow[] | null) || []);
        setLoading(false);
        return;
      }

      if (!primaryQuery.error.message.includes("ban_reason")) {
        console.error("Failed to fetch blocked members:", primaryQuery.error.message);
        setLoading(false);
        return;
      }

      const fallbackQuery = await supabase
        .from("profiles")
        .select("id, full_name, email, role, ban_type, ban_updated_at, ban_expires_at")
        .neq("ban_type", "none")
        .order("ban_updated_at", { ascending: false });

      if (fallbackQuery.error) {
        console.error("Failed to fetch blocked members:", fallbackQuery.error.message);
      } else {
        const nextProfiles = ((fallbackQuery.data as Omit<BannedProfileRow, "ban_reason">[] | null) || []).map((profile) => ({
          ...profile,
          ban_reason: null,
        }));
        setProfiles(nextProfiles);
      }

      setLoading(false);
    };

    void fetchProfiles();
  }, []);

  const blockedMembers = useMemo(
    () => profiles.filter((profile) => isActiveBan(profile) && profile.role !== "master"),
    [profiles]
  );

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-6 py-6">
      <div className="w-full max-w-[2000px]">
        <section>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-[20px] font-bold text-[#1f2a44]">
              🚫<h1>회원차단 리스트</h1>
            </div>
            <p className="text-[14px] text-[#6a7282]">두고커넥트 운영 관리 시스템</p>
          </div>
        </section>

        <section className="mt-6 rounded-[14px] border border-[#e8edf3] bg-white px-4 py-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-[#eef2f6] text-left">
                  {["대상", "유형", "사유", "제재일", "상태"].map((label) => (
                    <th key={label} className="px-4 py-4 text-[14px] font-bold text-[#6a7282]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-20 text-center">
                      <MasterLoadingState variant="inline" />
                    </td>
                  </tr>
                ) : blockedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-20 text-center text-[14px] font-semibold text-[#98a2b3]">
                      현재 제재 중인 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  blockedMembers.map((profile) => {
                    const statusMeta = getStatusMeta(profile);

                    return (
                      <tr key={profile.id} className="border-b border-[#f4f6f8] last:border-b-0">
                        <td className="px-4 py-4 text-[14px] font-medium text-[#344054]">{profile.full_name?.trim() || profile.email?.trim() || "회원"}</td>
                        <td className="px-4 py-4 text-[14px] font-medium text-[#303443]">{getRoleLabel(profile.role)}</td>
                        <td className="px-4 py-4 text-[14px] font-medium text-[#344054]">{profile.ban_reason?.trim() || "-"}</td>
                        <td className="px-4 py-4 text-[14px] font-medium text-[#344054]">{formatDate(profile.ban_updated_at)}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
