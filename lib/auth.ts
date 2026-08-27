import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { checkLoginRateLimit, recordLoginFailure, resetLoginAttempts } from "./rate-limit";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  logger: {
    error(error) {
      if (
        error.name === "CredentialsSignin" ||
        (error as any)?.type === "CredentialsSignin" ||
        error.message?.includes("CredentialsSignin")
      ) {
        return;
      }
      console.error("[auth][error]", error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        // 1. Cek Rate Limit (Maksimal 5 percobaan gagal per 15 menit)
        const rateCheck = checkLoginRateLimit(username);
        if (!rateCheck.allowed) {
          console.warn(`[auth] Rate limit lockout for username: ${username}`);
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { username },
            include: { team: true },
          });

          if (!user) {
            recordLoginFailure(username);
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            recordLoginFailure(username);
            return null;
          }

          // Login Berhasil -> Reset counter kegagalan
          resetLoginAttempts(username);

          return {
            id: user.id,
            name: user.name,
            email: user.username,
            role: user.role,
            teamId: user.teamId,
            teamName: user.team.name,
          };
        } catch (error: any) {
          console.error("[auth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
});
