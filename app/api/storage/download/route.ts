import { NextResponse } from "next/server";
import { CATALOG_IMAGE_BUCKET, CHAT_FILE_BUCKET, PARTNER_REQUEST_BUCKET } from "@/lib/storage";
import { createClient } from "@/utils/supabase/server";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toAsciiFileName(fileName: string) {
  return fileName.replace(/[^\x20-\x7E]+/g, "_");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    const fileName = url.searchParams.get("fileName") || path?.split("/").pop() || "download";

    if (!bucket || !path) {
      return fail("잘못된 파일 요청입니다.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail("로그인이 필요합니다.", 401);
    }

    if (bucket === PARTNER_REQUEST_BUCKET) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "master") {
        return fail("권한이 없습니다.", 403);
      }
    }

    if (bucket === CHAT_FILE_BUCKET) {
      const roomId = path.split("/")[0];
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("client_id, manufacturer_id, master_profile_id")
        .eq("id", roomId)
        .maybeSingle();
      if (!room) {
        return fail("파일을 찾을 수 없습니다.", 404);
      }

      const [{ data: profile }, { data: manufacturer }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        room.manufacturer_id
          ? supabase.from("manufacturers").select("owner_id").eq("id", room.manufacturer_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const canAccess =
        room.client_id === user.id ||
        room.master_profile_id === user.id ||
        manufacturer?.owner_id === user.id ||
        profile?.role === "master";

      if (!canAccess) {
        return fail("권한이 없습니다.", 403);
      }
    }

    if (bucket === CATALOG_IMAGE_BUCKET) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return fail("로그인이 필요합니다.", 401);
      }
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      return fail(error?.message || "파일 URL을 만들지 못했습니다.", 400);
    }

    const upstream = await fetch(data.signedUrl);
    if (!upstream.ok) {
      return fail("파일을 내려받지 못했습니다.", upstream.status);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const encodedFileName = encodeURIComponent(fileName);
    const asciiFileName = toAsciiFileName(fileName);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return fail("파일을 내려받지 못했습니다.", 500);
  }
}
