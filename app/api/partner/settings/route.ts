import { mapRouteError, ok } from "@/lib/server/http";
import { ensureUniquePartnerReferralCode, normalizePartnerCommissionRate } from "@/lib/server/partners";
import { createServiceRoleClient, requirePartnerUser } from "@/lib/server/supabase";

type ProfileSettingsRow = {
  full_name: string | null;
  email: string | null;
  referral_code: string | null;
  business_company_name: string | null;
  business_registration_number: string | null;
  business_owner_name: string | null;
  business_type: string | null;
  business_item: string | null;
  business_address: string | null;
};

type PartnerSettingsRow = {
  profile_id: string;
  commission_rate_percent: number | null;
  company_name: string | null;
  business_registration_number: string | null;
  representative_name: string | null;
  business_category: string | null;
  business_address: string | null;
  contact_phone: string | null;
  tax_invoice_email: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

function trimValue(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function trimOrNull(value: unknown, maxLength: number) {
  const trimmed = trimValue(value, maxLength);
  return trimmed || null;
}

function normalizeEmail(value: unknown, maxLength: number) {
  const trimmed = trimValue(value, maxLength).toLowerCase();
  return trimmed || null;
}

function isValidEmail(value: string | null) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildBusinessCategory(typeValue: string | null, itemValue: string | null) {
  return [typeValue, itemValue].filter(Boolean).join(" / ") || null;
}

export async function GET(request: Request) {
  try {
    const { user } = await requirePartnerUser(request);
    const admin = createServiceRoleClient();

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const [{ data: profile, error: profileError }, { data: partnerProfile, error: partnerProfileError }] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "full_name, email, referral_code, business_company_name, business_registration_number, business_owner_name, business_type, business_item, business_address"
        )
        .eq("id", user.id)
        .maybeSingle<ProfileSettingsRow>(),
      admin
        .from("partner_profiles")
        .select(
          "profile_id, commission_rate_percent, company_name, business_registration_number, representative_name, business_category, business_address, contact_phone, tax_invoice_email, bank_name, bank_account_number, bank_account_holder"
        )
        .eq("profile_id", user.id)
        .maybeSingle<PartnerSettingsRow>(),
    ]);

    if (profileError) {
      throw new Error(profileError.message);
    }
    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }

    return ok({
      success: true,
      settings: {
        fullName: profile?.full_name?.trim() || "",
        email: profile?.email?.trim() || user.email || "",
        referralCode: profile?.referral_code?.trim() || "",
        commissionRate: normalizePartnerCommissionRate(partnerProfile?.commission_rate_percent),
        companyName: partnerProfile?.company_name?.trim() || profile?.business_company_name?.trim() || "",
        businessRegistrationNumber:
          partnerProfile?.business_registration_number?.trim() || profile?.business_registration_number?.trim() || "",
        representativeName: partnerProfile?.representative_name?.trim() || profile?.business_owner_name?.trim() || "",
        businessCategory:
          partnerProfile?.business_category?.trim() ||
          buildBusinessCategory(profile?.business_type?.trim() || null, profile?.business_item?.trim() || null) ||
          "",
        businessAddress: partnerProfile?.business_address?.trim() || profile?.business_address?.trim() || "",
        contactPhone: partnerProfile?.contact_phone?.trim() || "",
        taxInvoiceEmail: partnerProfile?.tax_invoice_email?.trim() || "",
        bankName: partnerProfile?.bank_name?.trim() || "",
        bankAccountNumber: partnerProfile?.bank_account_number?.trim() || "",
        bankAccountHolder: partnerProfile?.bank_account_holder?.trim() || "",
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requirePartnerUser(request);
    const admin = createServiceRoleClient();

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = await request.json();
    const fullName = trimValue(body.fullName, 80);
    const email = normalizeEmail(body.email, 120);
    const referralCode = await ensureUniquePartnerReferralCode(admin, trimValue(body.referralCode, 60), user.id);
    const commissionRate = normalizePartnerCommissionRate(body.commissionRate);
    const companyName = trimOrNull(body.companyName, 120);
    const businessRegistrationNumber = trimOrNull(body.businessRegistrationNumber, 40);
    const representativeName = trimOrNull(body.representativeName, 80);
    const businessCategory = trimOrNull(body.businessCategory, 120);
    const businessAddress = trimOrNull(body.businessAddress, 200);
    const contactPhone = trimOrNull(body.contactPhone, 40);
    const taxInvoiceEmail = normalizeEmail(body.taxInvoiceEmail, 120);
    const bankName = trimOrNull(body.bankName, 80);
    const bankAccountNumber = trimOrNull(body.bankAccountNumber, 80);
    const bankAccountHolder = trimOrNull(body.bankAccountHolder, 80);
    const now = new Date().toISOString();

    if (!fullName) {
      throw new Error("이름을 입력해 주세요.");
    }
    if (!email || !isValidEmail(email)) {
      throw new Error("올바른 이메일을 입력해 주세요.");
    }
    if (taxInvoiceEmail && !isValidEmail(taxInvoiceEmail)) {
      throw new Error("세금계산서 이메일 형식을 확인해 주세요.");
    }
    if (businessRegistrationNumber && !/^[0-9-]{8,20}$/.test(businessRegistrationNumber)) {
      throw new Error("사업자등록번호 형식을 확인해 주세요.");
    }
    if (contactPhone && !/^[0-9+\-()\s]{8,30}$/.test(contactPhone)) {
      throw new Error("연락처 형식을 확인해 주세요.");
    }

    const updatedUser = await admin.auth.admin.updateUserById(user.id, {
      email,
      user_metadata: {
        ...(user.user_metadata || {}),
        name: fullName,
        full_name: fullName,
      },
      app_metadata: {
        ...(user.app_metadata || {}),
        role: "partner",
      },
    });

    if (updatedUser.error) {
      throw new Error(updatedUser.error.message || "파트너 기본 정보 저장에 실패했습니다.");
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName,
        email,
        role: "partner",
        referral_code: referralCode,
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: partnerProfileError } = await admin.from("partner_profiles").upsert(
      {
        profile_id: user.id,
        commission_rate_percent: commissionRate,
        company_name: companyName,
        business_registration_number: businessRegistrationNumber,
        representative_name: representativeName,
        business_category: businessCategory,
        business_address: businessAddress,
        contact_phone: contactPhone,
        tax_invoice_email: taxInvoiceEmail,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
        deleted_at: null,
        updated_at: now,
      },
      { onConflict: "profile_id" }
    );

    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }

    return ok({
      success: true,
      settings: {
        fullName,
        email,
        referralCode,
        commissionRate,
        companyName: companyName || "",
        businessRegistrationNumber: businessRegistrationNumber || "",
        representativeName: representativeName || "",
        businessCategory: businessCategory || "",
        businessAddress: businessAddress || "",
        contactPhone: contactPhone || "",
        taxInvoiceEmail: taxInvoiceEmail || "",
        bankName: bankName || "",
        bankAccountNumber: bankAccountNumber || "",
        bankAccountHolder: bankAccountHolder || "",
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
