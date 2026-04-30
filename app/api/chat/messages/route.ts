import { CHAT_FILE_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

const ALLOWED_CHAT_FILE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_CHAT_FILE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

function isAllowedChatFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  const extension = normalizedName.includes(".") ? normalizedName.split(".").pop() || "" : "";

  if (file.type && ALLOWED_CHAT_FILE_TYPES.has(file.type)) {
    return true;
  }

  return ALLOWED_CHAT_FILE_EXTENSIONS.has(extension);
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const admin = createServiceRoleClient();
    const formData = await request.formData();
    const roomId = String(formData.get("roomId") || "").trim();
    const content = String(formData.get("content") || "").trim();

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    if (!roomId) {
      throw new Error("채팅방 정보가 없습니다.");
    }

    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id, room_type, approval_status")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError || !room) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    if (room.room_type === "support" && room.approval_status !== "approved") {
      throw new Error("상담 요청을 수락한 뒤에 메시지를 보낼 수 있습니다.");
    }

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let messageType = "text";

    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (!isAllowedChatFile(file)) {
        throw new Error("채팅 첨부파일은 JPG, PNG, PDF만 전송할 수 있습니다.");
      }

      const safeName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-");
      filePath = `${roomId}/${Date.now()}-${safeName}`;
      fileName = file.name;
      fileSize = file.size;
      messageType = "file";

      const { error: uploadError } = await admin.storage.from(CHAT_FILE_BUCKET).upload(filePath, file, {
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

    const { data: inserted, error } = await admin
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
      .select("id, room_id, sender_id, content, message_type, is_read, created_at, file_url, file_name, file_size")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const { error: roomUpdateError } = await admin
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
