#!/usr/bin/env python3
"""Check actual dashboard content and page.tsx"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

# Check dashboard page content
print("=== DASHBOARD page.tsx (first 30 lines) ===")
print(run("head -30 /opt/asset-manager/src/app/'(dashboard)'/page.tsx"))

print("\n=== DASHBOARD layout.tsx (first 20 lines) ===")
print(run("head -20 /opt/asset-manager/src/app/'(dashboard)'/layout.tsx"))

# Check the raw HTML for dashboard (authenticated)
cmds = """rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar2.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null
echo "=== RAW HTML (search for tell-tale signs) ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -c 'SessionProvider'
echo ""
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -o '首页概览\|资产列表\|审批管理\|组织管理\|退出登录\|设备总数\|使用中\|即将到期' | head -10
echo ""
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -c 'hidden md:flex\|md:w-56\|bg-gray-900'
"""

s, o, e = c.exec_command(cmds, timeout=30)
out = o.read().decode('utf-8', errors='replace')
print("\n=== DASHBOARD HTML ANALYSIS ===")
print(out[:3000])

# Also check files that might have been modified by git reset
print("\n=== Check page.tsx still exists after reset ===")
print(run("ls -la /opt/asset-manager/src/app/page.tsx 2>/dev/null || echo 'root page.tsx GONE (OK)'"))

c.close()
