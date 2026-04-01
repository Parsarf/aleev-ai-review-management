import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

async function authHandler(req: NextRequest, context: any) {
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }

  return handler(req, context);
}

export { authHandler as GET, authHandler as POST };
