import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireMasterUser } from "@/lib/server/supabase";

function formatAmount(value: number | string | null | undefined, currencyCode: string | null | undefined) {
  const amount = Number(value || 0);
  if (currencyCode === "KRW") return `KRW ${Math.round(amount).toLocaleString("ko-KR")}`;
  if (currencyCode === "NZD") return `NZD ${amount.toLocaleString("en-NZ")}`;
  return `${currencyCode || "USD"} ${amount.toLocaleString("en-US")}`;
}

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { user } = await requireMasterUser(request);
    const admin = createServiceRoleClient();

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const { data: dispute, error: disputeError } = await admin
      .from("master_disputes")
      .select("id, dispute_number, applicant_id, applicant_name, counterparty_name, reason, detail, amount, currency_code")
      .eq("id", id)
      .maybeSingle();

    if (disputeError) {
      throw new Error(disputeError.message);
    }

    if (!dispute) {
      throw new Error("분쟁 내역을 찾을 수 없습니다.");
    }

    if (!dispute.applicant_id) {
      throw new Error("분쟁 신청자 계정 정보가 없어 1:1 대화를 열 수 없습니다.");
    }

    const requestMessage = [
      `[분쟁/중재] ${dispute.dispute_number}`,
      `신청자: ${dispute.applicant_name}`,
      `상대방: ${dispute.counterparty_name}`,
      `사유: ${dispute.reason}`,
      `분쟁금액: ${formatAmount(dispute.amount, dispute.currency_code)}`,
      "",
      dispute.detail?.trim() || "상세 내용이 없습니다.",
    ].join("\n");

    const { data: existingRoom, error: existingRoomError } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("room_type", "support")
      .eq("client_id", dispute.applicant_id)
      .eq("support_request_message", requestMessage)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRoomError) {
      throw new Error(existingRoomError.message);
    }

    if (existingRoom?.id) {
      const { error: updateError } = await admin
        .from("chat_rooms")
        .update({
          approval_status: "approved",
          master_profile_id: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRoom.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return ok({ roomId: existingRoom.id });
    }

    const now = new Date().toISOString();
    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .insert({
        client_id: dispute.applicant_id,
        manufacturer_id: null,
        room_type: "support",
        approval_status: "approved",
        master_profile_id: user.id,
        approved_at: now,
        support_request_message: requestMessage,
        last_message: requestMessage,
        last_message_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (roomError) {
      throw new Error(roomError.message);
    }

    const { error: messageError } = await admin.from("chat_messages").insert({
      room_id: room.id,
      sender_id: dispute.applicant_id,
      content: requestMessage,
      message_type: "text",
      is_read: false,
    });

    if (messageError) {
      throw new Error(messageError.message);
    }

    return ok({ roomId: room.id });
  } catch (error) {
    return mapRouteError(error);
  }
}
