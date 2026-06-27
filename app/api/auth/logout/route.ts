import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" }
  });
  response.cookies.delete(ADMIN_SESSION_COOKIE);

  return response;
}
