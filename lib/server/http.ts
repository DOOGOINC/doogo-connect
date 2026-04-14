import { NextResponse } from "next/server";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function mapRouteError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return fail("로그인이 필요합니다.", 401);
    if (error.message === "FORBIDDEN") return fail("권한이 없습니다.", 403);
    if (error.message === "SERVER_CONFIG_MISSING") return fail("서버 포인트 설정이 누락되었습니다.", 500);
    return fail(error.message, 400);
  }

  return fail("요청을 처리하지 못했습니다.", 500);
}
