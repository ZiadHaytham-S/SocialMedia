import { NextResponse } from "next/server";
import { auth } from "./auth";

const publicRoutes = ["/login", "/register", "/confirm-email", "/forgot-password"];

function isPublicPath(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth);
  const isPublic = isPublicPath(pathname);

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
