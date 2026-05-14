#!/usr/bin/env python3
"""Fix: NextAuth secureCookies + hostname check"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Fix config - add useSecureCookies: false for HTTP
new_config = """import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db/client";

export const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
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
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
"""

sftp = c.open_sftp()
with open('/tmp/new_config.ts', 'w') as f:
    f.write(new_config)
sftp.put('/tmp/new_config.ts', '/opt/asset-manager/src/lib/auth/config.ts')
sftp.close()

# Restart
s, o, e = c.exec_command("systemctl restart asset-manager && sleep 6 && echo 'RESTARTED'", timeout=30)
print(o.read().decode())

# Test
s, o, e = c.exec_command("""rm -f /tmp/cjar.txt
echo '=== Visit signin ==='
curl -s -c /tmp/cjar.txt -D /tmp/h.txt http://localhost:3000/api/auth/signin 2>/dev/null | head -3
echo '=== Cookies ==='
cat /tmp/cjar.txt
echo '=== CSRF ==='
CSRF_VAL=$(grep csrf-token /tmp/cjar.txt | awk '{print $NF}' | cut -d'|' -f1)
echo "CSRF=$CSRF_VAL"
if [ -n "$CSRF_VAL" ]; then
  echo '=== Login ==='
  curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar2.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF_VAL&username=admin&password=admin123&redirect=false" -D /tmp/lh.txt 2>/dev/null
  echo '=== Login cookies ==='
  cat /tmp/cjar2.txt
  echo '=== Session ==='
  curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session 2>/dev/null
fi""", timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:3000])

c.close()
