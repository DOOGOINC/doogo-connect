import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireServerUser(request);
    const { id } = await context.params;
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const { data: dispute, error: disputeError } = await admin
      .from("master_disputes")
      .select("id, applicant_id, request_id, reason, status")
      .eq("id", id)
      .eq("applicant_id", user.id)
      .maybeSingle();

    if (disputeError) {
      throw new Error(disputeError.message);
    }
    if (!dispute) {
      throw new Error("분쟁 내역을 찾을 수 없습니다.");
    }
    if (dispute.status !== "resolved" && dispute.status !== "refunded") {
      throw new Error("해결됨 상태의 분쟁만 환불 확인할 수 있습니다.");
    }
    if (!dispute.request_id) {
      throw new Error("연결된 프로젝트가 없습니다.");
    }

    const { data: currentRequest, error: currentRequestError } = await admin
      .from("rfq_requests")
      .select("id, client_id, status")
      .eq("id", dispute.request_id)
      .eq("client_id", user.id)
      .maybeSingle();

    if (currentRequestError) {
      throw new Error(currentRequestError.message);
    }
    if (!currentRequest) {
      throw new Error("프로젝트를 찾을 수 없습니다.");
    }
    if (currentRequest.status === "fulfilled") {
      throw new Error("구매확정된 주문은 환불 처리할 수 없습니다.");
    }
    if (currentRequest.status === "refunded") {
      throw new Error("이미 환불 처리된 주문입니다.");
    }

    const refundMemo = `환불 사유: ${dispute.reason || "분쟁 해결 후 환불"}`;

    const { data: updatedRequest, error: requestError } = await admin
      .from("rfq_requests")
      .update({
        status: "refunded",
        admin_memo: refundMemo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dispute.request_id)
      .eq("client_id", user.id)
      .select("*")
      .maybeSingle();

    if (requestError) {
      throw new Error(requestError.message);
    }
    if (!updatedRequest) {
      throw new Error("프로젝트를 환불 상태로 변경하지 못했습니다.");
    }

    const { data: updatedDispute, error: updateDisputeError } = await admin
      .from("master_disputes")
      .update({
        status: "refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dispute.id)
      .select("id, status")
      .maybeSingle();

    if (updateDisputeError) {
      throw new Error(updateDisputeError.message);
    }

    return ok({ success: true, dispute: updatedDispute, request: updatedRequest });
  } catch (error) {
    return mapRouteError(error);
  }
}
