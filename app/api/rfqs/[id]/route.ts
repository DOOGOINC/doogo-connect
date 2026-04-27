import { updateRfqClientPaymentStatus, updateRfqRequest } from "@/lib/server/rfq";
import { mapRouteError, ok } from "@/lib/server/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data =
      body.status === "payment_completed"
        ? await updateRfqClientPaymentStatus(
            {
              requestId: id,
              status: body.status,
            },
            request
          )
        : await updateRfqRequest(
            {
              requestId: id,
              status: body.status,
              adminMemo: body.adminMemo,
            },
            request
          );

    return ok({ data });
  } catch (error) {
    return mapRouteError(error);
  }
}
