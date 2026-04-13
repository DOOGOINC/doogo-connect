import { createRfqRequest } from "@/lib/server/rfq";
import { mapRouteError, ok } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createRfqRequest(body, request);
    return ok({ data });
  } catch (error) {
    return mapRouteError(error);
  }
}
