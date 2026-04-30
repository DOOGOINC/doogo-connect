import { mapRouteError, ok } from "@/lib/server/http";
import {
  ensureUniquePartnerReferralCode,
  listPartners,
  normalizePartnerCommissionRate,
  normalizePartnerStatus,
} from "@/lib/server/partners";
import { createServiceRoleClient, requireMasterUser } from "@/lib/server/supabase";

function trimValue(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient() ?? supabase;
    const partners = await listPartners(admin);
    return ok({ success: true, partners });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireMasterUser(request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = await request.json();
    const name = trimValue(body.name, 80);
    const email = trimValue(body.email, 120).toLowerCase();
    const temporaryPassword = trimValue(body.temporaryPassword, 120);
    const referralCode = await ensureUniquePartnerReferralCode(admin, trimValue(body.referralCode, 60));
    const commissionRate = normalizePartnerCommissionRate(body.commissionRate);
    const status = normalizePartnerStatus(body.status);

    if (!name) {
      throw new Error("파트너 이름을 입력해 주세요.");
    }
    if (!email) {
      throw new Error("이메일을 입력해 주세요.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("올바른 이메일 형식을 입력해 주세요.");
    }
    if (temporaryPassword.length < 6) {
      throw new Error("임시 비밀번호는 6자 이상 입력해 주세요.");
    }

    const createdUser = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        role: "partner",
        name,
        full_name: name,
      },
      app_metadata: {
        role: "partner",
      },
    });

    if (createdUser.error || !createdUser.data.user) {
      throw new Error(createdUser.error?.message || "파트너 계정 생성에 실패했습니다.");
    }

    const partnerUser = createdUser.data.user;
    const now = new Date().toISOString();

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: partnerUser.id,
        full_name: name,
        email,
        role: "partner",
        referral_code: referralCode,
        is_kakao: false,
        auth_provider: "email",
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: partnerProfileError } = await admin.from("partner_profiles").upsert(
      {
        profile_id: partnerUser.id,
        commission_rate_percent: commissionRate,
        status,
        deleted_at: null,
        created_by: user.id,
        updated_by: user.id,
        updated_at: now,
      },
      { onConflict: "profile_id" }
    );

    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }

    if (status === "active") {
      const { error: compensationPeriodError } = await admin.from("partner_compensation_periods").insert({
        profile_id: partnerUser.id,
        started_at: now,
        ended_at: null,
        commission_rate_percent: commissionRate,
        created_by: user.id,
      });

      if (compensationPeriodError) {
        throw new Error(compensationPeriodError.message);
      }
    }

    const partners = await listPartners(admin);
    return ok({ success: true, partners });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = await request.json();
    const id = trimValue(body.id, 120);
    const name = trimValue(body.name, 80);
    const email = trimValue(body.email, 120).toLowerCase();
    const temporaryPassword = trimValue(body.temporaryPassword, 120);
    const referralCode = await ensureUniquePartnerReferralCode(admin, trimValue(body.referralCode, 60), id);
    const commissionRate = normalizePartnerCommissionRate(body.commissionRate);
    const status = normalizePartnerStatus(body.status);

    if (!id) {
      throw new Error("수정할 파트너를 찾을 수 없습니다.");
    }
    if (!name) {
      throw new Error("파트너 이름을 입력해 주세요.");
    }
    if (!email) {
      throw new Error("이메일을 입력해 주세요.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("올바른 이메일 형식을 입력해 주세요.");
    }
    if (temporaryPassword && temporaryPassword.length < 6) {
      throw new Error("비밀번호를 변경하려면 6자 이상 입력해 주세요.");
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id, role, created_at")
      .eq("id", id)
      .maybeSingle<{ id: string; role: string | null; created_at: string | null }>();

    if (existingProfileError) {
      throw new Error(existingProfileError.message);
    }
    if (!existingProfile?.id || existingProfile.role !== "partner") {
      throw new Error("수정할 파트너 계정을 찾을 수 없습니다.");
    }

    const updatePayload: {
      email: string;
      password?: string;
      user_metadata: { role: string; name: string; full_name: string };
      app_metadata: { role: string };
    } = {
      email,
      user_metadata: {
        role: "partner",
        name,
        full_name: name,
      },
      app_metadata: {
        role: "partner",
      },
    };

    if (temporaryPassword) {
      updatePayload.password = temporaryPassword;
    }

    const { data: existingPartnerProfile, error: existingPartnerProfileError } = await admin
      .from("partner_profiles")
      .select("status, deleted_at, commission_rate_percent")
      .eq("profile_id", id)
      .maybeSingle<{ status: string | null; deleted_at: string | null; commission_rate_percent: number | null }>();

    if (existingPartnerProfileError) {
      throw new Error(existingPartnerProfileError.message);
    }

    const previousStatus = existingPartnerProfile?.deleted_at ? "inactive" : normalizePartnerStatus(existingPartnerProfile?.status);
    const previousCommissionRate = normalizePartnerCommissionRate(existingPartnerProfile?.commission_rate_percent);

    const updatedUser = await admin.auth.admin.updateUserById(id, updatePayload);
    if (updatedUser.error) {
      throw new Error(updatedUser.error.message || "파트너 계정 수정에 실패했습니다.");
    }

    const now = new Date().toISOString();

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id,
        full_name: name,
        email,
        role: "partner",
        referral_code: referralCode,
        is_kakao: false,
        auth_provider: "email",
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: partnerProfileError } = await admin.from("partner_profiles").upsert(
      {
        profile_id: id,
        commission_rate_percent: commissionRate,
        status,
        deleted_at: null,
        updated_by: user.id,
        updated_at: now,
      },
      { onConflict: "profile_id" }
    );

    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }

    if (previousStatus !== status) {
      if (status === "inactive") {
        const { data: openPeriod, error: openPeriodError } = await admin
          .from("partner_compensation_periods")
          .select("id")
          .eq("profile_id", id)
          .is("ended_at", null)
          .maybeSingle<{ id: string }>();

        if (openPeriodError) {
          throw new Error(openPeriodError.message);
        }

        if (!openPeriod?.id) {
          const { error: seedClosedPeriodError } = await admin.from("partner_compensation_periods").insert({
            profile_id: id,
            started_at: existingProfile.created_at || now,
            ended_at: now,
            commission_rate_percent: previousCommissionRate,
            created_by: user.id,
          });

          if (seedClosedPeriodError) {
            throw new Error(seedClosedPeriodError.message);
          }
        }

        const { error: closePeriodError } = await admin
          .from("partner_compensation_periods")
          .update({ ended_at: now })
          .eq("profile_id", id)
          .is("ended_at", null);

        if (closePeriodError) {
          throw new Error(closePeriodError.message);
        }
      } else {
        const { data: openPeriod, error: openPeriodError } = await admin
          .from("partner_compensation_periods")
          .select("id")
          .eq("profile_id", id)
          .is("ended_at", null)
          .maybeSingle<{ id: string }>();

        const { data: existingPeriods, error: existingPeriodsError } = await admin
          .from("partner_compensation_periods")
          .select("id")
          .eq("profile_id", id)
          .limit(1);

        if (openPeriodError) {
          throw new Error(openPeriodError.message);
        }
        if (existingPeriodsError) {
          throw new Error(existingPeriodsError.message);
        }

        if (!openPeriod?.id) {
          const { error: insertPeriodError } = await admin.from("partner_compensation_periods").insert({
            profile_id: id,
            started_at: (existingPeriods || []).length ? now : existingProfile.created_at || now,
            ended_at: null,
            commission_rate_percent: commissionRate,
            created_by: user.id,
          });

          if (insertPeriodError) {
            throw new Error(insertPeriodError.message);
          }
        }
      }
    }

    if (previousStatus === "active" && status === "active" && previousCommissionRate !== commissionRate) {
      const { error: closePeriodError } = await admin
        .from("partner_compensation_periods")
        .update({ ended_at: now })
        .eq("profile_id", id)
        .is("ended_at", null);

      if (closePeriodError) {
        throw new Error(closePeriodError.message);
      }

      const { error: insertPeriodError } = await admin.from("partner_compensation_periods").insert({
        profile_id: id,
        started_at: now,
        ended_at: null,
        commission_rate_percent: commissionRate,
        created_by: user.id,
      });

      if (insertPeriodError) {
        throw new Error(insertPeriodError.message);
      }
    }

    const partners = await listPartners(admin);
    return ok({ success: true, partners });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = await request.json();
    const id = trimValue(body.id, 120);

    if (!id) {
      throw new Error("삭제할 파트너를 찾을 수 없습니다.");
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id, role, created_at")
      .eq("id", id)
      .maybeSingle<{ id: string; role: string | null; created_at: string | null }>();

    if (existingProfileError) {
      throw new Error(existingProfileError.message);
    }
    if (!existingProfile?.id || existingProfile.role !== "partner") {
      throw new Error("삭제할 파트너 계정을 찾을 수 없습니다.");
    }

    const { data: existingPartnerProfile, error: existingPartnerProfileError } = await admin
      .from("partner_profiles")
      .select("commission_rate_percent")
      .eq("profile_id", id)
      .maybeSingle<{ commission_rate_percent: number | null }>();

    if (existingPartnerProfileError) {
      throw new Error(existingPartnerProfileError.message);
    }

    const now = new Date().toISOString();
    const { data: openPeriod, error: openPeriodError } = await admin
      .from("partner_compensation_periods")
      .select("id")
      .eq("profile_id", id)
      .is("ended_at", null)
      .maybeSingle<{ id: string }>();

    if (openPeriodError) {
      throw new Error(openPeriodError.message);
    }

    if (!openPeriod?.id) {
      const { error: seedClosedPeriodError } = await admin.from("partner_compensation_periods").insert({
        profile_id: id,
        started_at: existingProfile.created_at || now,
        ended_at: now,
        commission_rate_percent: normalizePartnerCommissionRate(existingPartnerProfile?.commission_rate_percent),
        created_by: user.id,
      });

      if (seedClosedPeriodError) {
        throw new Error(seedClosedPeriodError.message);
      }
    }

    const { error: closePeriodError } = await admin
      .from("partner_compensation_periods")
      .update({ ended_at: now })
      .eq("profile_id", id)
      .is("ended_at", null);

    if (closePeriodError) {
      throw new Error(closePeriodError.message);
    }

    const { error: partnerProfileError } = await admin.from("partner_profiles").upsert(
      {
        profile_id: id,
        status: "inactive",
        deleted_at: now,
        updated_by: user.id,
        updated_at: now,
      },
      { onConflict: "profile_id" }
    );

    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }

    const partners = await listPartners(admin);
    return ok({ success: true, partners });
  } catch (error) {
    return mapRouteError(error);
  }
}
