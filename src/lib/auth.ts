import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as Adapter,
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
    session: async ({ session, user }) => {
      if (session?.user && user) {
        interface ExtendedUser {
          id: string;
          role: string;
        }
        (session.user as ExtendedUser).id = user.id;
        // Fetch user role from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        (session.user as ExtendedUser).role = dbUser?.role || "STAFF";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
