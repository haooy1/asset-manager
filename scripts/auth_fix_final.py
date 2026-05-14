#!/usr/bin/env python3
"""Fix NextAuth v4 compatibility - handlers issue"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

def run(cmd, timeout=15):
    s,o,e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8',errors='replace')

# Fix route.ts - remove destructure of undefined handlers
route_fix = """import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
"""

sftp = c.open_sftp()
with open('/tmp/route_fix.ts','w') as f:
    f.write(route_fix)
sftp.put('/tmp/route_fix.ts','/opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts')
sftp.close()
print("route.ts fixed")

# Fix config.ts - remove handlers destructure, export authOptions
config_fix = """import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db/client";

export const authOptions = {
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || !user.isActive) return null;
        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;
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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.branchId = user.branchId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.branchId = token.branchId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
};

const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
export { handlers, signIn, signOut, auth };
"""

sftp = c.open_sftp()
with open('/tmp/config_fix.ts','w') as f:
    f.write(config_fix)
sftp.put('/tmp/config_fix.ts','/opt/asset-manager/src/lib/auth/config.ts')
sftp.close()
print("config.ts fixed")

# Remove old build cache
print(run("rm -rf /opt/asset-manager/.next && echo cache_cleared"))

# Restart
print(run("systemctl restart asset-manager && sleep 6 && echo READY", timeout=30))

# Verify
print("\n=== Verify auth endpoint ===")
print(run("curl -s -o /dev/null -w 'CSRF_HTTP:%{http_code}' http://localhost:3000/api/auth/csrf; echo"))

# Quick login test
print(run("curl -s -o /dev/null -w 'SIGNIN_HTTP:%{http_code}' http://localhost:3000/api/auth/signin; echo"))
print(run("curl -s -o /dev/null -w 'SESSION_HTTP:%{http_code}' http://localhost:3000/api/auth/session; echo"))

c.close()
