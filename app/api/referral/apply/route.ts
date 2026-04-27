import { fail, mapRouteError } from "@/lib/server/http";
import { requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    await requireServerUser(request);

    return fail("추천인 코드는 회원가입 시 최초 1회만 적용할 수 있습니다.");
  } catch (error) {
    return mapRouteError(error);
  }
}
