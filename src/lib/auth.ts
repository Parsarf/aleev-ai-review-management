import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                scope: [
                  "openid",
                  "email",
                  "profile",
                  // Add Google Business Profile scopes for review management
                  "https://www.googleapis.com/auth/business.manage",
                ].join(" "),
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      interface ExtendedUser {
        id: string;
        role: string;
      }

      if (session?.user && token?.id) {
        (session.user as ExtendedUser).id = token.id as string;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          (session.user as ExtendedUser).role = dbUser?.role || "STAFF";
        } catch (error) {
          console.error("Error fetching user role in session callback:", error);
          (session.user as ExtendedUser).role = "STAFF";
        }
      }
      return session;
    },
    signIn: async ({ user, account }) => {
      console.log("[NextAuth] signIn callback — provider:", account?.provider, "email:", user.email);
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          console.log("[NextAuth] signIn — user exists in DB:", !!existingUser);
        } catch (error) {
          console.error("[NextAuth] signIn — DB error:", error);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
