import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit";

async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
        });

        const ip = await getClientIp();

        if (!user || !user.isActive) {
          if (credentials.username) {
            writeAuditLog({
              userId: user?.id,
              username: credentials.username as string,
              action: "LOGIN_FAILED",
              targetType: "SYSTEM",
              detail: `登录失败: 用户不存在或已禁用 (${credentials.username})`,
              clientIp: ip,
            }).catch(() => {});
          }
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.password,
        );

        if (!isValid) {
          writeAuditLog({
            userId: user.id,
            username: user.username,
            action: "LOGIN_FAILED",
            targetType: "SYSTEM",
            detail: `登录失败: 密码错误 (${user.username})`,
            clientIp: ip,
          }).catch(() => {});
          return null;
        }

        return {
          id: user.id,
          name: user.realName,
          email: user.email,
          username: user.username,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.username = user.username as string;
        token.role = user.role as string;
        token.branchId = user.branchId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.branchId = token.branchId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      writeAuditLog({
        userId: user.id,
        username: user.username as string,
        action: "LOGIN",
        targetType: "SYSTEM",
        detail: `${user.name || user.username} 登录系统`,
        clientIp: await getClientIp(),
      }).catch(() => {});
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        writeAuditLog({
          userId: token.id as string,
          username: token.username as string,
          action: "LOGOUT",
          targetType: "SYSTEM",
          detail: `${token.name || token.username} 登出系统`,
          clientIp: await getClientIp(),
        }).catch(() => {});
      }
    },
  },
  session: {
    strategy: "jwt",
  },
});
