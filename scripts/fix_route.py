#!/usr/bin/env python3
"""Fix route handler ONLY"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

route = '''import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
'''

sftp = c.open_sftp()
with open('/tmp/route_fix.ts', 'w') as f:
    f.write(route)
sftp.put('/tmp/route_fix.ts', '/opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts')
sftp.close()

# Also restore middleware (need requireRole option)
mw = '''import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireRole(...roles: string[]) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }
  if (!roles.includes((session.user as any).role)) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
'''

sftp = c.open_sftp()
with open('/tmp/mw_fix.ts', 'w') as f:
    f.write(mw)
sftp.put('/tmp/mw_fix.ts', '/opt/asset-manager/src/lib/auth/middleware.ts')
sftp.close()

# Restart + quick test
s, o, e = c.exec_command('systemctl restart asset-manager && echo "Restarting..." && sleep 6 && echo "OK"', timeout=30)
print(o.read().decode())

s, o, e = c.exec_command('curl -s -o /dev/null -w "HTTP:%{http_code}" http://localhost:3000/api/auth/signin 2>/dev/null', timeout=10)
print(o.read().decode())

s, o, e = c.exec_command('curl -s http://localhost:3000/api/auth/signin 2>/dev/null | grep -o "csrfToken" | head -1', timeout=10)
print("CSRF endpoint:", o.read().decode().strip())

c.close()
