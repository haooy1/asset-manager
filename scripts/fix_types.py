#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Fix: Create next-auth type declarations + rebuild + restart
cmds = """cd /opt/asset-manager

echo "=== Fix: Add NextAuth type declarations ==="
cat > src/types/next-auth.d.ts << 'TYPES'
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: string;
    branchId: string | null;
  }
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      branchId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    branchId: string | null;
  }
}
TYPES

mkdir -p src/types
mv src/types/next-auth.d.ts /tmp/ 2>/dev/null || true
cat > src/types/next-auth.d.ts << 'TYPES2'
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: string;
    branchId: string | null;
  }
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      branchId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    branchId: string | null;
  }
}
TYPES2
mkdir -p src/types
echo "types file created"

echo "=== Rebuild ==="
npx next build 2>&1 | grep -E "error|Compiled|Route|success" | head -10
echo "build_rc: $?"

echo "=== Restart ==="
systemctl restart asset-manager 2>/dev/null || true
sleep 4
echo "=== Status ==="
systemctl status asset-manager --no-pager 2>&1 | head -5
curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000 2>/dev/null
echo ""

# Check logs on failure
journalctl -u asset-manager --no-pager -n 5 2>/dev/null | tail -3
"""

stdin, stdout, stderr = c.exec_command(cmds, timeout=180)
out = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out[:3000])
c.close()
