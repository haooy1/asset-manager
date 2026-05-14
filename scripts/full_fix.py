#!/usr/bin/env python3
"""Fix CSS: add globals.css import + full git reset to clean state"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

print("=== 1. Full git reset to clean state ===")
print(run("cd /opt/asset-manager && git fetch origin main 2>&1 && git reset --hard origin/main 2>&1 && echo RESET_OK", timeout=30))

print("\n=== 2. Delete root page.tsx (welcome page shadows dashboard) ===")
print(run("rm -f /opt/asset-manager/src/app/page.tsx && echo DELETED"))

print("\n=== 3. Check layout.tsx ===")
print(run("head -5 /opt/asset-manager/src/app/layout.tsx"))

print("\n=== 4. Add globals.css import ===")
# Fix: prepend import "./globals.css" to layout.tsx
fix_cmd = """cd /opt/asset-manager
# Check if import already exists
if grep -q 'import.*globals.css' src/app/layout.tsx; then
  echo "import already exists"
else
  # Prepend the import
  sed -i '1i import "./globals.css";' src/app/layout.tsx
  echo "import added"
fi
head -5 src/app/layout.tsx
"""
print(run(fix_cmd))

print("\n=== 5. Apply required patches (config.ts, route.ts, .env) ===")
# Apply the fixes we know work - config.ts and route.ts
# We wrote these to the server already, they just need to be re-applied after reset

# Fix config.ts for auth
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
      async authorize(credentials: any) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || !user.isActive) return null;
        const valid = await compare(credentials.password, user.password);
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
  debug: false,
};

const _nextAuth = NextAuth(authOptions);
export const { handlers, signIn, signOut, auth } = _nextAuth;
"""

route = """import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
"""

import os
# Write files locally, then upload
for local_name, remote_path, content in [
    ('_config_v4.tsx', '/opt/asset-manager/src/lib/auth/config.ts', config),
    ('_route_v4.tsx', '/opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts', route),
]:
    local_path = f'E:/08_code/asystem/scripts/{local_name}'
    with open(local_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    sftp = c.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    print(f"Uploaded: {local_name} -> {remote_path}")

print("\n=== 6. Fix .env (restore NEXTAUTH variables) ===")
print(run("""cd /opt/asset-manager
[ -f .env.bak ] && cp .env.bak .env || true
grep -q 'NEXTAUTH_SECRET' .env || sed -i 's/^AUTH_SECRET=/NEXTAUTH_SECRET=/' .env
grep -q 'NEXTAUTH_URL' .env || sed -i 's/^AUTH_URL=/NEXTAUTH_URL=/' .env
cat .env"""))

print("\n=== 7. Restart ===")
print(run("systemctl restart asset-manager && sleep 8 && echo RESTARTED", timeout=30))

print("\n=== 8. Verify ===")
print(run("curl -s -o /dev/null -w 'ROOT:%{http_code} ' http://localhost:3000/; curl -s -o /dev/null -w 'LOGIN:%{http_code} ' http://localhost:3000/login; curl -s -o /dev/null -w 'ASSETS:%{http_code} ' http://localhost:3000/assets; echo"))

# Quick login test  
print("\n=== 9. Login test ===")
print(run("""rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar2.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null
echo "Session: $(curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get(\"user\",{}).get(\"name\",\"FAIL\"))' 2>/dev/null)"
echo "Dashboard has sidebar: $(curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -c 'flex min-h-screen flex-col md:flex-row' 2>/dev/null)"
echo "Has h1: $(curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -o '<h1[^>]*>[^<]*' | head -3)" """, timeout=30))

print("\n=== DONE ===")
print("Open http://100.87.31.92:3000/login")
print("Ctrl+Shift+R to force refresh")
c.close()
