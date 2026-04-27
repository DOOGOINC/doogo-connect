import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);

    const { data, error } = await supabase
      .from("admin_notices")
      .select("id, title, content, author_name, view_count, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ok({ notices: data || [] });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireMasterUser(request);
    const body = await request.json();
    const title = trimText(body.title);
    const content = trimText(body.content);

    if (!title) {
      throw new Error("공지사항 제목을 입력해 주세요.");
    }

    if (!content) {
      throw new Error("공지사항 내용을 입력해 주세요.");
    }

    const { data, error } = await supabase
      .from("admin_notices")
      .insert({
        title,
        content,
        author_id: user.id,
        author_name: "관리자",
      })
      .select("id, title, content, author_name, view_count, created_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true, notice: data });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const url = new URL(request.url);
    const noticeId = url.searchParams.get("id")?.trim() || "";

    if (!noticeId) {
      throw new Error("공지사항 ID가 필요합니다.");
    }

    const { error } = await supabase.from("admin_notices").delete().eq("id", noticeId);

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
