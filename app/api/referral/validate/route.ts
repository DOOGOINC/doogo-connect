import { fail, ok, mapRouteError } from "@/lib/server/http";
import { isValidPartnerReferralCode, sanitizeReferralCode } from "@/lib/server/referral";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const referralCode = sanitizeReferralCode(body.referralCode);

    if (!referralCode) {
      return fail("추천인코드가 맞지않습니다.");
    }

    const admin = createServiceRoleClient() ?? (await createClient());
    const isValid = await isValidPartnerReferralCode(admin, referralCode);

    if (!isValid) {
      return fail("추천인코드가 맞지않습니다.");
    }

    return ok({ success: true, valid: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
