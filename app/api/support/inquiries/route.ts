import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { createClient } from "@/utils/supabase/server";

function trimValue(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${label}을(를) 입력해 주세요.`);
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = trimValue(body.name, "이름");
    const email = trimValue(body.email, "이메일");
    const content = trimValue(body.content, "문의 내용");
    const company = typeof body.company === "string" ? body.company.trim() || null : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("올바른 이메일 형식을 입력해 주세요.");
    }

    const serviceClient = createServiceRoleClient();
    const supabase = serviceClient ?? (await createClient());

    const { error } = await supabase.from("support_inquiries").insert({
      name,
      email: email.toLowerCase(),
      company,
      content,
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
