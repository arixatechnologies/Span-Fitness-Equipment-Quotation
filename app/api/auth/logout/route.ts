import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/session";

function logoutResponse(location = "/login") {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: location }
  });
  response.cookies.delete(ADMIN_SESSION_COOKIE);

  return response;
}

export async function POST() {
  return logoutResponse();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const location =
    url.searchParams.get("reason") === "session_expired"
      ? "/login?error=session_expired"
      : "/login";

  return logoutResponse(location);
}
