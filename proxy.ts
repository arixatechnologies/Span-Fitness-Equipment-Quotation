import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const protectedPrefixes = [
  "/dashboard",
  "/products",
  "/brands",
  "/categories",
  "/customers",
  "/quotations",
  "/members",
  "/image-to-link",
  "/settings"
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const session = await verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname.startsWith("/members") && session.role !== "Admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: {
      headers: request.headers
    }
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
