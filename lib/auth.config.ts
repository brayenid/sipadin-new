import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.teamId = (user as { teamId: string }).teamId;
        token.teamName = (user as { teamName: string }).teamName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.teamId = token.teamId as string;
        session.user.teamName = token.teamName as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
