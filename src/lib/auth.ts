import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "database", // Use database sessions to ensure user is always available
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
    session: async ({ session, user }) => {
      // When using database sessions, 'user' is always provided
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
    signIn: async ({ user, account, profile }) => {
      // PrismaAdapter should handle user creation automatically,
      // but we can add logging here to debug
      if (account?.provider === "google" && user.email) {
        try {
          // Check if user exists (adapter should create it, but verify)
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (!existingUser) {
            console.log("User will be created by PrismaAdapter:", user.email);
          }
        } catch (error) {
          console.error("Error checking user during sign in:", error);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
