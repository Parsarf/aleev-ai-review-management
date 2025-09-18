import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth");

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/inbox", req.url));
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url),
      );
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
        return isAuthPage || !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/inbox/:path*",
    "/analytics/:path*",
    "/tickets/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/api/reviews/:path*",
    "/api/replies/:path*",
    "/api/analytics/:path*",
    "/api/settings/:path*",
    "/api/billing/:path*",
    "/api/webhooks/:path*",
  ],
};
