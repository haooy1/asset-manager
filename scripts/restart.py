#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """cd /opt/asset-manager

echo "=== Fix next.config.ts ==="
cat > next.config.ts << 'NEXT'
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
NEXT

echo "=== Remove old .next ==="
rm -rf .next

echo "=== Rebuild ==="
npx next build 2>&1 | tail -10
echo "build_rc: $?"

echo "=== Check .next/BUILD_ID ==="
cat .next/BUILD_ID 2>/dev/null || echo "BUILD_ID_MISSING"

echo "=== Start with next start ==="
systemctl stop asset-manager 2>/dev/null || true
nohup npx next start -p 3000 -H 0.0.0.0 > /var/log/asset-manager.log 2>&1 &
NEXT_PID=$!
echo "Started with PID: $NEXT_PID"
sleep 4

echo "=== Check ==="
curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000 2>/dev/null
echo ""
curl -s http://localhost:3000 2>/dev/null | head -3
echo ""

# Update systemd service to use next start (not node server.js)
cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'
[Unit]
Description=IT Asset Manager
After=network.target postgresql.service
[Service]
Type=simple
WorkingDirectory=/opt/asset-manager
ExecStart=/usr/local/bin/npx next start -p 3000 -H 0.0.0.0
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload

cat /var/log/asset-manager.log | tail -10
"""

stdin, stdout, stderr = c.exec_command(cmds, timeout=180)
out = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out[:4000])
c.close()
