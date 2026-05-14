#!/usr/bin/env python3
"""Fix NextAuth v4 config + route"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# 1. Fix config.ts - use v4 API
config_ts = """import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db/client";

export const authOptions = {
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
        });
        if (!user || !user.isActive) return null;
        const isValid = await compare(credentials.password as string, user.password);
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

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
"""

sftp = c.open_sftp()
with open('/tmp/config_v4.ts', 'w') as f:
    f.write(config_ts)
sftp.put('/tmp/config_v4.ts', '/opt/asset-manager/src/lib/auth/config.ts')
sftp.close()

# 2. Fix route handler
route_ts = """import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
"""

with open('/tmp/route_v4.ts', 'w') as f:
    f.write(route_ts)
sftp = c.open_sftp()
sftp.put('/tmp/route_v4.ts', '/opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts')
sftp.close()

# 3. Verify .env has NEXTAUTH_SECRET
s, o, e = c.exec_command("cd /opt/asset-manager && grep 'NEXTAUTH_SECRET' .env && echo 'NEXTAUTH_SECRET OK' || echo 'MISSING'")
print(o.read().decode())

# 4. Restart
s, o, e = c.exec_command("systemctl restart asset-manager 2>&1 && sleep 6 && echo 'RESTARTED'", timeout=30)
print(o.read().decode())

# 5. Test login
s, o, e = c.exec_command("""curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin&password=admin123' \
  -D /tmp/auth_headers.txt 2>/dev/null | head -3
echo '---'
grep -i 'location\\|set-cookie' /tmp/auth_headers.txt 2>/dev/null | head -5
""", timeout=30)
print(o.read().decode())

c.close()
