import { NextResponse, type NextRequest } from "next/server";

const APP_ROUTES = [
  "/dashboard",
  "/leads",
  "/customers",
  "/deals",
  "/tasks",
  "/notes",
  "/billing",
  "/team",
  "/settings",
  "/analytics",
  "/products",
  "/pipeline",
  "/attendance",
  "/expenses",
  "/assets",
  "/tickets",
  "/campaigns",
  "/quotes",
  "/invoices",
  "/payroll",
  "/holidays",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAppRoute = APP_ROUTES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // lumeo_session is a plain (non-HttpOnly) cookie set by the backend on login.
  // It is just a session indicator (value "1") — not a token.
  // The actual auth uses the Authorization header with an access token from sessionStorage.
  if (isAppRoute && !req.cookies.get("lumeo_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
