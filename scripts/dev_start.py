#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """cd /opt/asset-manager

echo "=== Kill existing processes ==="
pkill -f "next" 2>/dev/null || true
sleep 1

echo "=== Start with next dev ==="
nohup npx next dev -p 3000 -H 0.0.0.0 > /var/log/asset-manager.log 2>&1 &
PID=$!
echo "Started PID=$PID"

echo "=== Wait for startup ==="
sleep 8

echo "=== Check ==="
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null)
echo "HTTP: $HTTP"

echo "=== Page content ==="
curl -s http://localhost:3000 2>/dev/null | head -5

echo "=== Login page ==="
curl -s http://localhost:3000/login 2>/dev/null | head -5

echo "=== Logs ==="
tail -15 /var/log/asset-manager.log

echo "=== Update systemd ==="
cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'
[Unit]
Description=IT Asset Manager
After=network.target postgresql.service
[Service]
Type=simple
WorkingDirectory=/opt/asset-manager
ExecStart=/usr/local/bin/npx next dev -p 3000 -H 0.0.0.0
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
echo "systemd updated"
"""

stdin, stdout, stderr = c.exec_command(cmds, timeout=120)
out = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out[:4000])
c.close()
