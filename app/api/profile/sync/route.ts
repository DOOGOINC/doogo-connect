import { mapRouteError, ok } from "@/lib/server/http";
import type { AppRole } from "@/lib/auth/roles";
import { applyReferralAttribution, ensureUserReferralCode, sanitizeReferralCode } from "@/lib/server/referral";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

function getProviderInfo(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string | null }> | null;
}) {
  const providers = new Set<string>();

  if (typeof user.app_metadata?.provider === "string") {
    providers.add(user.app_metadata.provider);
  }

  if (Array.isArray(user.app_metadata?.providers)) {
    for (const provider of user.app_metadata.providers) {
      if (provider) providers.add(provider);
    }
  }

  for (const identity of user.identities || []) {
    if (identity?.provider) {
      providers.add(identity.provider);
    }
  }

  const providerList = [...providers];
  const isKakao = providerList.includes("kakao");

  return {
    isKakao,
    authProvider: isKakao ? "kakao" : providerList[0] || "email",
  };
}

function trimOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, supabase } = await requireServerUser(request);
    const adminClient = createServiceRoleClient();
    const profileClient = adminClient ?? supabase;

    const metadataRole = user.user_metadata?.role;
    const safeRole = (["master", "manufacturer", "member", "partner"] as const).includes(metadataRole as AppRole)
      ? (metadataRole as AppRole)
      : undefined;
    const providerInfo = getProviderInfo(user);

    const fullName = trimOrNull(body.fullName);
    const email = trimOrNull(body.email) || user.email || null;
    const phoneNumber = trimOrNull(body.phoneNumber);
    const submittedReferralCode = sanitizeReferralCode(body.referralCode);

    const { data: existingProfile, error: profileReadError } = await profileClient
      .from("profiles")
      .select("full_name, email, phone_number, role, referral_code, referred_by_profile_id, referred_by_code, is_kakao, auth_provider")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(profileReadError.message);
    }

    const payload = {
      id: user.id,
      full_name: fullName ?? existingProfile?.full_name ?? null,
      email: email ?? existingProfile?.email ?? null,
      phone_number: phoneNumber ?? existingProfile?.phone_number ?? null,
      role: safeRole ?? existingProfile?.role ?? "member",
      is_kakao: providerInfo.isKakao,
      auth_provider: providerInfo.authProvider,
      referral_code: existingProfile?.referral_code ?? null,
      referred_by_profile_id: existingProfile?.referred_by_profile_id ?? null,
      referred_by_code: existingProfile?.referred_by_code ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await profileClient.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }

    const ensuredReferralCode = await ensureUserReferralCode(profileClient, user.id, existingProfile?.referral_code);
    const referral = submittedReferralCode
      ? await applyReferralAttribution(supabase, user.id, submittedReferralCode, "link")
      : { applied: false, reason: "missing" as const };

    return ok({
      success: true,
      profile: {
        ...payload,
        referral_code: ensuredReferralCode,
      },
      referral,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
