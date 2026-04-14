import { fail, mapRouteError, ok } from "@/lib/server/http";
import { applyReferralAttribution } from "@/lib/server/referral";
import { requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, supabase } = await requireServerUser(request);

    const result = await applyReferralAttribution(supabase, user.id, body.referralCode, "manual");

    if (!result.applied) {
      switch (result.reason) {
        case "already_referred":
          return fail("이미 추천인이 등록된 계정입니다.");
        case "self_referral":
          return fail("본인 추천인 코드는 입력할 수 없습니다.");
        case "invalid_code":
          return fail("유효하지 않은 추천인 코드입니다.");
        default:
          return fail("추천인 코드를 적용할 수 없습니다.");
      }
    }

    return ok({ success: true, referral: result });
  } catch (error) {
    return mapRouteError(error);
  }
}
