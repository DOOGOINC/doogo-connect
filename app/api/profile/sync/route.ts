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

    const authRole = user.app_metadata?.role;
    const safeRole = (["master", "manufacturer", "member", "partner"] as const).includes(authRole as AppRole)
      ? (authRole as AppRole)
      : undefined;
    const providerInfo = getProviderInfo(user);

    const metadataFullName = trimOrNull(user.user_metadata?.full_name) ?? trimOrNull(user.user_metadata?.name);
    const metadataPhoneNumber = trimOrNull(user.user_metadata?.phone_number);
    const submittedFullName = trimOrNull(body.fullName);
    const submittedPhoneNumber = trimOrNull(body.phoneNumber);
    const submittedReferralCode = sanitizeReferralCode(body.referralCode);

    const { data: existingProfile, error: profileReadError } = await profileClient
      .from("profiles")
      .select("full_name, email, phone_number, role, referral_code, referred_by_profile_id, referred_by_code, is_kakao, auth_provider")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(profileReadError.message);
    }

    const email = user.email?.trim() || trimOrNull(existingProfile?.email) || null;
    const fullName = submittedFullName ?? trimOrNull(existingProfile?.full_name) ?? metadataFullName;
    const phoneNumber = submittedPhoneNumber ?? trimOrNull(existingProfile?.phone_number) ?? metadataPhoneNumber;

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

    const resolvedRole = safeRole ?? existingProfile?.role ?? "member";
    const ensuredReferralCode =
      resolvedRole === "partner"
        ? await ensureUserReferralCode(profileClient, user.id, existingProfile?.referral_code)
        : existingProfile?.referral_code ?? null;
    const referral = submittedReferralCode
      ? await applyReferralAttribution(supabase, user.id, submittedReferralCode, "link")
      : { applied: false, reason: "missing" as const };

    if (submittedReferralCode && !referral.applied && referral.reason === "already_referred") {
      const { data: latestProfile, error: latestProfileError } = await profileClient
        .from("profiles")
        .select("referred_by_profile_id, referred_by_code")
        .eq("id", user.id)
        .maybeSingle<{
          referred_by_profile_id: string | null;
          referred_by_code: string | null;
        }>();

      if (latestProfileError) {
        throw new Error(latestProfileError.message);
      }

      if (latestProfile?.referred_by_code === submittedReferralCode) {
        return ok({
          success: true,
          profile: {
            ...payload,
            referred_by_profile_id: latestProfile.referred_by_profile_id ?? payload.referred_by_profile_id,
            referred_by_code: latestProfile.referred_by_code ?? payload.referred_by_code,
            referral_code: ensuredReferralCode,
          },
          referral: {
            applied: true,
            reason: "applied",
            referrerProfileId: latestProfile.referred_by_profile_id ?? null,
            referralCode: submittedReferralCode,
            referrerPoints: 0,
            refereePoints: 0,
          },
        });
      }
    }

    if (
      submittedReferralCode &&
      !referral.applied &&
      referral.reason === "already_referred" &&
      existingProfile?.referred_by_code === submittedReferralCode
    ) {
      return ok({
        success: true,
        profile: {
          ...payload,
          referral_code: ensuredReferralCode,
        },
        referral: {
          applied: true,
          reason: "applied",
          referrerProfileId: existingProfile?.referred_by_profile_id ?? null,
          referralCode: submittedReferralCode,
          referrerPoints: 0,
          refereePoints: 0,
        },
      });
    }

    if (submittedReferralCode && !referral.applied) {
      switch (referral.reason) {
        case "already_referred":
          throw new Error("추천인 코드는 회원가입 시 최초 1회만 적용할 수 있습니다.");
        case "self_referral":
          throw new Error("본인 추천인 코드는 입력할 수 없습니다.");
        case "invalid_code":
          throw new Error("유효한 파트너 추천인 코드가 아닙니다.");
        default:
          throw new Error("추천인 코드를 적용할 수 없습니다.");
      }
    }

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
