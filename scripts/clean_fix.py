#!/usr/bin/env python3
"""Clean rewrite of config.ts and route.ts"""
import paramiko, os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

config_ts = """import NextAuth from "next-auth";
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

route_ts = """import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
"""

# Write locally with explicit utf-8
for fname, content in [
    ('config_v3.ts', config_ts),
    ('route_v3.ts', route_ts),
]:
    with open(f'E:/08_code/asystem/scripts/{fname}', 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

# Upload
sftp = c.open_sftp()
sftp.put('E:/08_code/asystem/scripts/config_v3.ts', '/opt/asset-manager/src/lib/auth/config.ts')
sftp.put('E:/08_code/asystem/scripts/route_v3.ts', '/opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts')
sftp.close()

# Verify file encoding
def run(cmd, timeout=15):
    s,o,e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8',errors='replace')

print("=== file -i check ===")
print(run("file -i /opt/asset-manager/src/lib/auth/config.ts"))
print(run("file -i /opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts"))

print("\n=== Verify no dupes ===")
print(run("grep -c 'export' /opt/asset-manager/src/lib/auth/config.ts"))
print(run("grep 'export' /opt/asset-manager/src/lib/auth/config.ts"))

# Clear cache and restart
print(run("rm -rf /opt/asset-manager/.next && echo cache_cleared"))
print(run("systemctl restart asset-manager && sleep 8 && echo RESTARTED", timeout=30))

# Verify
print("\n=== API tests ===")
print(run("curl -s -o /dev/null -w 'CSRF:%{http_code} ' http://localhost:3000/api/auth/csrf; echo"))
print(run("curl -s -o /dev/null -w 'LOGIN_PAGE:%{http_code} ' http://localhost:3000/login; echo"))
print(run("curl -s -o /dev/null -w 'DASHBOARD:%{http_code} ' http://localhost:3000/; echo"))

print("\n=== Errors ===")
print(run("journalctl -u asset-manager --no-pager -n 5 2>/dev/null | grep -i error | tail -3"))

c.close()
