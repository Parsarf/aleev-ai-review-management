import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

async function handler(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const host = forwardedHost || req.headers.get("host") || "";

  if (host) {
    process.env.NEXTAUTH_URL = `${forwardedProto}://${host}`;
  }

  return NextAuth(authOptions)(req as any, context as any);
}

export { handler as GET, handler as POST };
