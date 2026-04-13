import { CHAT_FILE_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const formData = await request.formData();
    const roomId = String(formData.get("roomId") || "").trim();
    const content = String(formData.get("content") || "").trim();

    if (!roomId) {
      throw new Error("채팅방 정보가 없습니다.");
    }

    const { data: room, error: roomError } = await supabase.from("chat_rooms").select("*").eq("id", roomId).maybeSingle();
    if (roomError || !room) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let messageType = "text";

    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const safeName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-");
      filePath = `${roomId}/${Date.now()}-${safeName}`;
      fileName = file.name;
      fileSize = file.size;
      messageType = "file";

      const { error: uploadError } = await supabase.storage.from(CHAT_FILE_BUCKET).upload(filePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }
    }

    if (!content && !filePath) {
      throw new Error("메시지 내용이 없습니다.");
    }

    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: content || fileName || "파일",
        message_type: messageType,
        is_read: false,
        file_url: filePath,
        file_name: fileName,
        file_size: fileSize,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const { error: roomUpdateError } = await supabase
      .from("chat_rooms")
      .update({
        last_message: content || `${fileName || "파일"} 첨부`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (roomUpdateError) {
      throw new Error(roomUpdateError.message);
    }

    return ok({ data: inserted });
  } catch (error) {
    return mapRouteError(error);
  }
}
