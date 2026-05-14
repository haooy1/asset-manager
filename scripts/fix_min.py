#!/usr/bin/env python3
"""Ultimate fix: simplify auth to minimal working config"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Most minimal config that should work
config = """import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db/client";

const handler = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username" },
        password: { label: "Password" },
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
        });
        if (!user || !user.isActive) return null;
        const valid = await compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.realName, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: { sessionToken: { options: { httpOnly: true, sameSite: "lax", path: "/", secure: false } } },
});

export const { signIn, signOut, auth } = handler;
export const GET = handler;
export const POST = handler;
"""

sftp = c.open_sftp()
with open('/tmp/cfg_min.ts', 'w') as f:
    f.write(config)
sftp.put('/tmp/cfg_min.ts', '/opt/asset-manager/src/lib/auth/config.ts')
sftp.close()

# Fix route handler
route = """import handler from "@/lib/auth/config";
export const { GET, POST } = handler;
"""
sftp = c.open_sftp()
with open('/tmp/route_min.ts', 'w') as f:
    f.write(route)
sftp.put('/tmp/route_min.ts', '/opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts')
sftp.close()

# Fix middleware (uses `auth` from config)
middleware = """import { auth } from "@/lib/auth/config";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
"""
sftp = c.open_sftp()
with open('/tmp/mw_min.ts', 'w') as f:
    f.write(middleware)
sftp.put('/tmp/mw_min.ts', '/opt/asset-manager/src/lib/auth/middleware.ts')
sftp.close()

# Restart
s, o, e = c.exec_command("systemctl restart asset-manager && echo 'Restarting...' && sleep 8 && echo 'READY'", timeout=30)
print(o.read().decode())

# Test
s, o, e = c.exec_command("""rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/signin >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "=== Login test ==="
curl -v -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123" 2>&1 | grep '< location\|< set-cookie'
echo "==="
curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/session
""", timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out)
c.close()
