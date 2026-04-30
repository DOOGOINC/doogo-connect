import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeReferralCode } from "./referral";

export type PartnerStatus = "active" | "inactive";

export type PartnerAdminRow = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  commissionRate: number;
  status: PartnerStatus;
  createdAt: string;
  deletedAt: string | null;
};

type PartnerProfileRow = {
  profile_id: string;
  commission_rate_percent: number | null;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
  deleted_at: string | null;
};

type PartnerCompensationProfileRow = {
  commission_rate_percent: number | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at: string | null;
};

export type PartnerCompensationPeriod = {
  startedAt: string;
  endedAt: string | null;
  commissionRate: number;
};

type PartnerCompensationPeriodRow = {
  started_at: string | null;
  ended_at: string | null;
  commission_rate_percent?: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string | null;
  created_at: string | null;
};

function isMissingCompensationPeriodsRelationError(error: { message?: string } | null | undefined) {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    message.includes("partner_compensation_periods") &&
    (message.includes("schema cache") || message.includes("does not exist") || message.includes("Could not find the table"))
  );
}

export function normalizePartnerStatus(value: unknown): PartnerStatus {
  return value === "inactive" ? "inactive" : "active";
}

export function normalizePartnerCommissionRate(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 2;
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))));
}

export function buildPartnerReferralCodeCandidate() {
  return `PARTNER${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export async function ensureUniquePartnerReferralCode(
  supabase: SupabaseClient,
  requestedCode?: string | null,
  excludeProfileId?: string
) {
  const normalizedRequested = sanitizeReferralCode(requestedCode);

  if (normalizedRequested) {
    let query = supabase.from("profiles").select("id").eq("referral_code", normalizedRequested);
    if (excludeProfileId) {
      query = query.neq("id", excludeProfileId);
    }

    const { data, error } = await query.maybeSingle<{ id: string }>();
    if (error) {
      throw new Error(error.message);
    }
    if (data?.id) {
      throw new Error("이미 사용 중인 추천인 코드입니다.");
    }

    return normalizedRequested;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildPartnerReferralCodeCandidate();
    const { data, error } = await supabase.from("profiles").select("id").eq("referral_code", candidate).maybeSingle<{ id: string }>();
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.id) {
      return candidate;
    }
  }

  throw new Error("파트너 추천인 코드 생성에 실패했습니다.");
}

export async function listPartners(supabase: SupabaseClient) {
  const [{ data: profiles, error: profilesError }, { data: partnerProfiles, error: partnerProfilesError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, referral_code, created_at")
      .eq("role", "partner")
      .order("created_at", { ascending: true }),
    supabase.from("partner_profiles").select("profile_id, commission_rate_percent, status, created_at, deleted_at"),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }
  if (partnerProfilesError) {
    throw new Error(partnerProfilesError.message);
  }

  const partnerProfileMap = new Map(
    (((partnerProfiles as PartnerProfileRow[] | null) || []) as PartnerProfileRow[]).map((row) => [row.profile_id, row])
  );

  return ((((profiles as ProfileRow[] | null) || []) as ProfileRow[]) || [])
    .map((profile) => {
      const partnerProfile = partnerProfileMap.get(profile.id);

      return {
        id: profile.id,
        name: profile.full_name?.trim() || "이름 없음",
        email: profile.email?.trim() || "",
        referralCode: profile.referral_code?.trim() || "",
        commissionRate: normalizePartnerCommissionRate(partnerProfile?.commission_rate_percent),
        status: normalizePartnerStatus(partnerProfile?.status),
        createdAt: partnerProfile?.created_at || profile.created_at || new Date().toISOString(),
        deletedAt: partnerProfile?.deleted_at || null,
      } satisfies PartnerAdminRow;
    })
    .filter((partner) => !partner.deletedAt);
}

export async function getPartnerStatusByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("partner_profiles")
    .select("status, deleted_at")
    .eq("profile_id", userId)
    .maybeSingle<{ status: string | null; deleted_at: string | null }>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.deleted_at) {
    return "inactive";
  }

  return normalizePartnerStatus(data?.status);
}

export async function getPartnerCompensationAccessByUserId(supabase: SupabaseClient, userId: string) {
  const [{ data: profileData, error: profileError }, { data: periodData, error: periodError }] = await Promise.all([
    supabase
      .from("partner_profiles")
      .select("commission_rate_percent, status, created_at, updated_at, deleted_at")
      .eq("profile_id", userId)
      .maybeSingle<PartnerCompensationProfileRow>(),
    supabase
      .from("partner_compensation_periods")
      .select("started_at, ended_at, commission_rate_percent")
      .eq("profile_id", userId)
      .order("started_at", { ascending: true }),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (periodError && !isMissingCompensationPeriodsRelationError(periodError)) {
    throw new Error(periodError.message);
  }

  const status = profileData?.deleted_at ? "inactive" : normalizePartnerStatus(profileData?.status);
  const fallbackCommissionRate = normalizePartnerCommissionRate(profileData?.commission_rate_percent);
  const periods = (((periodData as PartnerCompensationPeriodRow[] | null) || []) as PartnerCompensationPeriodRow[])
    .filter((row) => typeof row.started_at === "string" && row.started_at.trim())
    .map((row) => ({
      startedAt: row.started_at as string,
      endedAt: row.ended_at,
      commissionRate: normalizePartnerCommissionRate(row.commission_rate_percent ?? fallbackCommissionRate),
    }));

  if (!periods.length) {
    const fallbackStart = profileData?.created_at || "1970-01-01T00:00:00.000Z";
    periods.push({
      startedAt: fallbackStart,
      endedAt: status === "active" ? null : profileData?.deleted_at || profileData?.updated_at || fallbackStart,
      commissionRate: fallbackCommissionRate,
    });
  } else if (status === "active" && !periods.some((period) => !period.endedAt)) {
    periods.push({
      startedAt: profileData?.updated_at || periods[periods.length - 1]?.endedAt || profileData?.created_at || "1970-01-01T00:00:00.000Z",
      endedAt: null,
      commissionRate: fallbackCommissionRate,
    });
  } else if (
    status === "active" &&
    periods.length === 1 &&
    !periods[0]?.endedAt &&
    typeof profileData?.created_at === "string" &&
    profileData.created_at &&
    new Date(periods[0].startedAt).getTime() > new Date(profileData.created_at).getTime()
  ) {
    periods[0] = {
      startedAt: profileData.created_at,
      endedAt: null,
      commissionRate: fallbackCommissionRate,
    };
  }

  return {
    status,
    isEligible: status === "active",
    commissionRate: fallbackCommissionRate,
    periods,
  };
}

export function isTimestampWithinPartnerCompensationPeriods(
  timestamp: string | null | undefined,
  periods: PartnerCompensationPeriod[]
) {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;

  return periods.some((period) => {
    const startedAt = new Date(period.startedAt).getTime();
    if (Number.isNaN(startedAt) || time < startedAt) return false;
    if (!period.endedAt) return true;
    const endedAt = new Date(period.endedAt).getTime();
    if (Number.isNaN(endedAt)) return true;
    return time < endedAt;
  });
}

export function getPartnerCommissionRateForTimestamp(
  timestamp: string | null | undefined,
  periods: PartnerCompensationPeriod[],
  fallbackRate: number
) {
  if (!timestamp) {
    return normalizePartnerCommissionRate(fallbackRate);
  }

  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) {
    return normalizePartnerCommissionRate(fallbackRate);
  }

  const matchedPeriod = periods.find((period) => {
    const startedAt = new Date(period.startedAt).getTime();
    if (Number.isNaN(startedAt) || time < startedAt) return false;
    if (!period.endedAt) return true;
    const endedAt = new Date(period.endedAt).getTime();
    if (Number.isNaN(endedAt)) return true;
    return time < endedAt;
  });

  return normalizePartnerCommissionRate(matchedPeriod?.commissionRate ?? fallbackRate);
}
