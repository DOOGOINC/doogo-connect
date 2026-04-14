import type { SupabaseClient } from "@supabase/supabase-js";

export function sanitizeReferralCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return normalized || null;
}

function createReferralCodeCandidate() {
  return `DGC${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function ensureUserReferralCode(supabase: SupabaseClient, userId: string, existingCode?: string | null) {
  const normalizedExisting = sanitizeReferralCode(existingCode);
  if (normalizedExisting) return normalizedExisting;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createReferralCodeCandidate();
    const { data } = await supabase.from("profiles").select("id").eq("referral_code", candidate).maybeSingle();

    if (data?.id) continue;

    const { error } = await supabase
      .from("profiles")
      .update({
        referral_code: candidate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .is("referral_code", null);

    if (!error) {
      const { data: profileAfterUpdate, error: profileAfterUpdateError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .maybeSingle();

      if (profileAfterUpdateError) {
        throw new Error(profileAfterUpdateError.message);
      }

      const assignedCode = sanitizeReferralCode(profileAfterUpdate?.referral_code);
      if (assignedCode) {
        return assignedCode;
      }
    }
  }

  throw new Error("추천인 코드 생성에 실패했습니다.");
}

type ApplyReferralResult =
  | {
      applied: true;
      reason: "applied";
      referrerProfileId: string;
      referralCode: string;
      referrerPoints: number;
      refereePoints: number;
    }
  | {
      applied: false;
      reason: "missing" | "profile_missing" | "already_referred" | "invalid_code" | "self_referral";
      referrerProfileId?: null;
      referralCode?: null;
      referrerPoints?: 0;
      refereePoints?: 0;
    };

export async function applyReferralAttribution(
  supabase: SupabaseClient,
  _userId: string,
  rawReferralCode: unknown,
  source: "link" | "manual" = "link"
) {
  const referralCode = sanitizeReferralCode(rawReferralCode);
  if (!referralCode) {
    return { applied: false, reason: "missing" } satisfies ApplyReferralResult;
  }

  const { data, error } = await supabase.rpc("apply_referral_code", {
    p_referral_code: referralCode,
    p_source: source,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return { applied: false, reason: "profile_missing" } satisfies ApplyReferralResult;
  }

  return {
    applied: Boolean(result.applied),
    reason: result.reason,
    referrerProfileId: result.referrer_profile_id || null,
    referralCode: result.referral_code || null,
    referrerPoints: Number(result.referrer_points || 0),
    refereePoints: Number(result.referee_points || 0),
  } as ApplyReferralResult;
}
