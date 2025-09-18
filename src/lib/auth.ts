import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled due to type compatibility issues
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
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        (session.user as any).id = token.sub;
        // Fetch user role from database
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        (session.user as any).role = user?.role || "STAFF";
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};
