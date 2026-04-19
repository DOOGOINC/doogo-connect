import { NextResponse } from "next/server";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function mapRouteError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return fail("Login required.", 401);
    if (error.message === "FORBIDDEN") return fail("Permission denied.", 403);
    if (error.message === "SERVER_CONFIG_MISSING") return fail("Server configuration is missing.", 500);
    return fail(error.message, 400);
  }

  return fail("Request could not be processed.", 500);
}
