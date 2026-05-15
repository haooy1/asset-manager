import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        if (!user || !user.isActive) {
          if (credentials.username) {
            writeAuditLog({
              userId: user?.id,
              username: credentials.username as string,
              action: "LOGIN_FAILED",
              targetType: "SYSTEM",
              detail: `登录失败: 用户不存在或已禁用 (${credentials.username})`,
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
      }).catch(() => {});
    },
    async signOut({ token }) {
      if (token?.id) {
        writeAuditLog({
          userId: token.id as string,
          username: token.username as string,
          action: "LOGOUT",
          targetType: "SYSTEM",
          detail: `${token.name || token.username} 登出系统`,
        }).catch(() => {});
      }
    },
  },
  session: {
    strategy: "jwt",
  },
});
