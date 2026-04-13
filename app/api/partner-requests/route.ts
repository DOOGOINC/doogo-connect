import { PARTNER_REQUEST_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { createClient } from "@/utils/supabase/server";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".ppt", ".pptx", ".doc", ".docx"];

function validatePartnerField(value: FormDataEntryValue | null, label: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${label}을(를) 입력해 주세요.`);
  }
  return normalized;
}

function normalizeIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();

    const companyName = validatePartnerField(formData.get("company_name"), "회사명");
    const businessNumber = validatePartnerField(formData.get("business_number"), "사업자등록번호");
    const managerName = validatePartnerField(formData.get("manager_name"), "담당자명");
    const managerPhone = validatePartnerField(formData.get("manager_phone"), "연락처");
    const managerEmail = validatePartnerField(formData.get("manager_email"), "이메일");
    const companyDescription = validatePartnerField(formData.get("company_description"), "회사 소개");

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(managerEmail)) {
      throw new Error("이메일 형식이 올바르지 않습니다.");
    }

    if (!/^[0-9-]{8,20}$/.test(businessNumber)) {
      throw new Error("사업자등록번호 형식이 올바르지 않습니다.");
    }

    const ipAddress = normalizeIp(request);
    const recentWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await supabase
      .from("partner_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", recentWindow)
      .or(
        `manager_email.eq.${managerEmail},business_number.eq.${businessNumber},source_ip.eq.${ipAddress.replaceAll(",", "")}`
      );

    if (rateLimitError) {
      throw new Error(rateLimitError.message);
    }

    if ((count || 0) >= 5) {
      throw new Error("잠시 후 다시 시도해 주세요.");
    }

    let attachmentPath: string | null = null;
    const fileEntry = formData.get("attachment");
    if (fileEntry instanceof File && fileEntry.size > 0) {
      const lowerName = fileEntry.name.toLowerCase();
      const hasAllowedExtension = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!hasAllowedExtension || !ALLOWED_ATTACHMENT_TYPES.has(fileEntry.type)) {
        throw new Error("허용되지 않은 첨부파일 형식입니다.");
      }

      if (fileEntry.size > MAX_ATTACHMENT_SIZE) {
        throw new Error("첨부파일은 10MB 이하만 업로드할 수 있습니다.");
      }

      const safeName = lowerName.replace(/[^a-z0-9._-]/g, "-");
      attachmentPath = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from(PARTNER_REQUEST_BUCKET).upload(attachmentPath, fileEntry, {
        upsert: false,
        contentType: fileEntry.type,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }
    }

    const { error } = await supabase.from("partner_requests").insert({
      company_name: companyName,
      business_number: businessNumber,
      manager_name: managerName,
      manager_phone: managerPhone,
      manager_email: managerEmail,
      company_description: companyDescription,
      attachment_url: attachmentPath,
      source_ip: ipAddress,
      status: "pending",
    });

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
