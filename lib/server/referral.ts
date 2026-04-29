import type { SupabaseClient } from "@supabase/supabase-js";
import { awardUserPoints, ensurePointSettings } from "./points";
import { createServiceRoleClient } from "./supabase";

export function sanitizeReferralCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return normalized || null;
}

export async function isValidPartnerReferralCode(supabase: SupabaseClient, rawReferralCode: unknown) {
  const referralCode = sanitizeReferralCode(rawReferralCode);
  if (!referralCode) {
    return false;
  }

  const admin = createServiceRoleClient() ?? supabase;
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", referralCode)
    .eq("role", "partner")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
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
  userId: string,
  rawReferralCode: unknown,
  source: "link" | "manual" = "link"
) {
  const referralCode = sanitizeReferralCode(rawReferralCode);
  if (!referralCode) {
    return { applied: false, reason: "missing" } satisfies ApplyReferralResult;
  }

  const admin = createServiceRoleClient() ?? supabase;
  const [currentProfileResult, existingEventResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, referred_by_profile_id, referred_by_code")
      .eq("id", userId)
      .maybeSingle<{
        id: string;
        role: string | null;
        referred_by_profile_id: string | null;
        referred_by_code: string | null;
      }>(),
    admin
      .from("referral_events")
      .select("id, referrer_profile_id, referral_code, referee_points_awarded")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle<{
        id: string;
        referrer_profile_id: string | null;
        referral_code: string | null;
        referee_points_awarded: number | null;
      }>(),
  ]);

  if (currentProfileResult.error) {
    throw new Error(currentProfileResult.error.message);
  }
  if (existingEventResult.error) {
    throw new Error(existingEventResult.error.message);
  }

  const currentProfile = currentProfileResult.data;
  const existingEvent = existingEventResult.data;
  if (!currentProfile) {
    return { applied: false, reason: "profile_missing" } satisfies ApplyReferralResult;
  }
  if (currentProfile.role !== "member") {
    return { applied: false, reason: "invalid_code" } satisfies ApplyReferralResult;
  }

  const existingProfileReferralCode = sanitizeReferralCode(currentProfile.referred_by_code);
  const existingEventReferralCode = sanitizeReferralCode(existingEvent?.referral_code);

  if (existingProfileReferralCode === referralCode || existingEventReferralCode === referralCode) {
    let matchedReferrerProfileId = existingEvent?.referrer_profile_id || currentProfile.referred_by_profile_id;

    if (!matchedReferrerProfileId) {
      const { data: matchedReferrerProfile, error: matchedReferrerProfileError } = await admin
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .eq("role", "partner")
        .maybeSingle<{ id: string }>();

      if (matchedReferrerProfileError) {
        throw new Error(matchedReferrerProfileError.message);
      }

      matchedReferrerProfileId = matchedReferrerProfile?.id || null;
    }

    if (!matchedReferrerProfileId) {
      return { applied: false, reason: "already_referred" } satisfies ApplyReferralResult;
    }

    return {
      applied: true,
      reason: "applied",
      referrerProfileId: matchedReferrerProfileId,
      referralCode,
      referrerPoints: 0,
      refereePoints: existingEvent?.referee_points_awarded || 0,
    } as ApplyReferralResult;
  }

  if (currentProfile.referred_by_profile_id || currentProfile.referred_by_code || existingEvent?.id) {
    return { applied: false, reason: "already_referred" } satisfies ApplyReferralResult;
  }

  const { data: referrerProfile, error: referrerProfileError } = await admin
    .from("profiles")
    .select("id, role, referral_code")
    .eq("referral_code", referralCode)
    .eq("role", "partner")
    .maybeSingle<{
      id: string;
      role: string | null;
      referral_code: string | null;
    }>();

  if (referrerProfileError) {
    throw new Error(referrerProfileError.message);
  }

  if (!referrerProfile?.id) {
    return { applied: false, reason: "invalid_code" } satisfies ApplyReferralResult;
  }
  if (referrerProfile.id === userId) {
    return { applied: false, reason: "self_referral" } satisfies ApplyReferralResult;
  }

  const pointSettings = await ensurePointSettings(admin);
  const refereePoints = pointSettings.refereeRewardPoints;

  const { data: insertedEvent, error: insertEventError } = await admin
    .from("referral_events")
    .insert({
      user_id: userId,
      referrer_profile_id: referrerProfile.id,
      referral_code: referralCode,
      source,
      referrer_points_awarded: 0,
      referee_points_awarded: 0,
      points_awarded_at: refereePoints > 0 ? new Date().toISOString() : null,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertEventError) {
    if (
      insertEventError.code === "23505" ||
      insertEventError.message.includes("referral_events_user_id_unique_idx")
    ) {
      const { data: existingEvent, error: existingEventError } = await admin
        .from("referral_events")
        .select("id, referrer_profile_id, referral_code, referee_points_awarded")
        .eq("user_id", userId)
        .maybeSingle<{
          id: string;
          referrer_profile_id: string | null;
          referral_code: string | null;
          referee_points_awarded: number | null;
        }>();

      if (existingEventError) {
        throw new Error(existingEventError.message);
      }

      if (existingEvent?.referral_code === referralCode) {
        return {
          applied: true,
          reason: "applied",
          referrerProfileId: existingEvent.referrer_profile_id || referrerProfile.id,
          referralCode,
          referrerPoints: 0,
          refereePoints: existingEvent.referee_points_awarded || 0,
        } as ApplyReferralResult;
      }

      return { applied: false, reason: "already_referred" } satisfies ApplyReferralResult;
    }

    throw new Error(insertEventError.message);
  }

  const { error: updateProfileError } = await admin
    .from("profiles")
    .update({
      referred_by_profile_id: referrerProfile.id,
      referred_by_code: referralCode,
      referral_source: source,
      referral_recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateProfileError) {
    throw new Error(updateProfileError.message);
  }

  if (refereePoints > 0) {
    await awardUserPoints(admin, {
      userId,
      amount: refereePoints,
      reason: "파트너 추천 코드 가입 보너스",
      category: "partner_referral_signup_bonus",
      relatedUserId: referrerProfile.id,
      referralEventId: insertedEvent.id,
      createdBy: referrerProfile.id,
    });

    const { error: updateEventError } = await admin
      .from("referral_events")
      .update({
        referee_points_awarded: refereePoints,
        points_awarded_at: new Date().toISOString(),
      })
      .eq("id", insertedEvent.id);

    if (updateEventError) {
      throw new Error(updateEventError.message);
    }
  }

  return {
    applied: true,
    reason: "applied",
    referrerProfileId: referrerProfile.id,
    referralCode,
    referrerPoints: 0,
    refereePoints,
  } as ApplyReferralResult;
}
