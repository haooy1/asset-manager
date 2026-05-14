#!/usr/bin/env python3
"""Final fix: add useSecureCookies: false + simplify config"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

config = """import NextAuth from "next-auth";
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
      async authorize(creds: any) {
        if (!creds?.username || !creds?.password) return null;
        const user = await db.user.findUnique({
          where: { username: creds.username },
        });
        if (!user || !user.isActive) return null;
        const valid = await compare(creds.password, user.password);
        if (!valid) return null;
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
  useSecureCookies: false,
  debug: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
"""

sftp = c.open_sftp()
with open('/tmp/cfg_final.ts', 'w') as f:
    f.write(config)
sftp.put('/tmp/cfg_final.ts', '/opt/asset-manager/src/lib/auth/config.ts')
sftp.close()

# Restart + test
s, o, e = c.exec_command("systemctl restart asset-manager && sleep 5 && echo 'OK'", timeout=30)
print(o.read().decode())

# Full browser-like flow test
test = """#!/bin/bash
rm -f /tmp/cjar.txt

echo "=== Step 1: Get CSRF from signin page ==="
curl -s -c /tmp/cjar.txt -D /tmp/h.txt http://localhost:3000/api/auth/signin >/dev/null
echo "Cookies:"
grep -v '^#' /tmp/cjar.txt | grep -v '^$'

echo ""
echo "=== Step 2: CSRF token from API ==="
CSRF=$(curl -s -b /tmp/cjar.txt -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "CSRF token: ${CSRF:0:20}..."

echo ""
echo "=== Step 3: Login ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null

echo ""
echo "=== Step 4: Session ==="
curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/session
echo ""

echo ""
echo "=== Step 5: Cookies ==="
grep -v '^#' /tmp/cjar.txt | grep -v '^$'
"""

sftp = c.open_sftp()
with open('/tmp/test_final.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/test_final.sh', '/tmp/test_final.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/test_final.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])

# Check server logs
s, o, e = c.exec_command('journalctl -u asset-manager --no-pager -n 10 2>/dev/null', timeout=10)
print(o.read().decode()[:2000])

c.close()
