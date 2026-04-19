import { PARTNER_REQUEST_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { createClient } from "@/utils/supabase/server";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

function getRequiredText(formData: FormData, key: string, label: string) {
  const value = formData.get(key);
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${label}을(를) 입력해 주세요.`);
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    const formData = await request.formData();
    const businessCompanyName = getRequiredText(formData, "businessCompanyName", "법인명");
    const businessRegistrationNumber = getRequiredText(formData, "businessRegistrationNumber", "사업자등록번호");
    const businessOwnerName = getRequiredText(formData, "businessOwnerName", "대표자명");
    const businessType = getRequiredText(formData, "businessType", "업태");
    const businessItem = getRequiredText(formData, "businessItem", "종목");
    const businessAddress = getRequiredText(formData, "businessAddress", "사업장 소재지");

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("profiles")
      .select("business_attachment_url, business_attachment_name")
      .eq("id", user.id)
      .maybeSingle();

    if (currentProfileError) {
      throw new Error(currentProfileError.message);
    }

    let attachmentPath = currentProfile?.business_attachment_url || null;
    let attachmentName = currentProfile?.business_attachment_name || null;
    let attachmentUploadedAt = attachmentPath ? new Date().toISOString() : null;

    const fileEntry = formData.get("attachment");
    if (fileEntry instanceof File && fileEntry.size > 0) {
      const lowerName = fileEntry.name.toLowerCase();
      const hasAllowedExtension = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!hasAllowedExtension || !ALLOWED_ATTACHMENT_TYPES.has(fileEntry.type)) {
        throw new Error("허용되지 않은 첨부 파일 형식입니다.");
      }

      if (fileEntry.size > MAX_ATTACHMENT_SIZE) {
        throw new Error("첨부 파일은 10MB 이하만 업로드할 수 있습니다.");
      }

      const safeName = lowerName.replace(/[^a-z0-9._-]/g, "-");
      attachmentPath = `business-registration/${user.id}/${Date.now()}-${safeName}`;
      attachmentName = fileEntry.name;
      attachmentUploadedAt = new Date().toISOString();

      const { error: uploadError } = await supabase.storage.from(PARTNER_REQUEST_BUCKET).upload(attachmentPath, fileEntry, {
        upsert: false,
        contentType: fileEntry.type,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        business_company_name: businessCompanyName,
        business_registration_number: businessRegistrationNumber,
        business_owner_name: businessOwnerName,
        business_type: businessType,
        business_item: businessItem,
        business_address: businessAddress,
        business_attachment_url: attachmentPath,
        business_attachment_name: attachmentName,
        business_attachment_uploaded_at: attachmentUploadedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
