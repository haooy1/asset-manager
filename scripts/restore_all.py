#!/usr/bin/env python3
"""RESTORE ALL source files from git, only delete root page.tsx"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace'), s.channel.recv_exit_status()

cmds = """
cd /opt/asset-manager

echo "=== 1. Restore ALL source files from git ==="
# Remove any files we modified
git checkout -- src/
echo "src/ restored"

echo "=== 2. Delete root page.tsx (the welcome page that shadows dashboard) ==="
rm -f src/app/page.tsx
echo "root page.tsx deleted"

echo "=== 3. Check next.config.ts ==="
cat next.config.ts

echo "=== 4. Check .env ==="
cat .env

echo "=== 5. Check remaining files ==="
ls src/app/page.tsx 2>/dev/null && echo "ROOT_PAGE_EXISTS_BAD" || echo "ROOT_PAGE_GONE_OK"
ls src/app/\(dashboard\)/page.tsx 2>/dev/null && echo "DASHBOARD_EXISTS_OK"
ls src/lib/auth/config.ts && ls src/lib/auth/middleware.ts

echo "=== 6. Restart ==="
systemctl restart asset-manager
echo "restart triggered"

echo "=== DONE ==="
"""

out, rc = run(cmds, timeout=60)
print(out)

# Wait and verify
import time
time.sleep(8)

s, o, e = c.exec_command("""
echo "=== 7. Verify after restart ==="
systemctl is-active asset-manager
echo "---"
curl -s -o /dev/null -w 'Root: HTTP %{http_code}\n' http://localhost:3000/
curl -s -o /dev/null -w 'Login: HTTP %{http_code}\n' http://localhost:3000/login
curl -s -o /dev/null -w 'Assets: HTTP %{http_code}\n' http://localhost:3000/assets
curl -s -o /dev/null -w 'Approvals: HTTP %{http_code}\n' http://localhost:3000/approvals
echo "---"
# Check for errors
journalctl -u asset-manager --no-pager -n 5 2>/dev/null | grep -i error | tail -3
""", timeout=20)
print(o.read().decode('utf-8', errors='replace'))

c.close()
print("\n=== COMPLETE ===")
print("Open: http://100.87.31.92:3000/login")
print("User: admin / admin123")
