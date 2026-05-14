#!/usr/bin/env python3
import paramiko, time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=60):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    return out[:3000], stdout.channel.recv_exit_status()

# 1. Setup systemd with next dev
out1, rc1 = run("""# Write service file
cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'
[Unit]
Description=IT Asset Manager (Next.js Dev Mode)
After=network.target postgresql.service
[Service]
Type=simple
WorkingDirectory=/opt/asset-manager
ExecStart=/usr/local/bin/npx next dev -p 3000 -H 0.0.0.0
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable asset-manager 2>/dev/null
systemctl stop asset-manager 2>/dev/null
sleep 2
echo "Starting service..."
systemctl start asset-manager 2>/dev/null
echo "start rc: $?"
""")
print("SETUP:", out1[:500])

# 2. Wait and check
time.sleep(10)

out2, rc2 = run("""echo "=== Process ==="
ps aux | grep "next dev" | grep -v grep | head -2
echo "=== Systemctl ==="
systemctl status asset-manager --no-pager 2>&1 | head -8
echo "=== Port ==="
ss -tlnp 2>/dev/null | grep 3000 || echo "Port not listening"
echo "=== HTTP ==="
curl -s -o /dev/null -w 'HTTP_CODE:%{http_code}' http://localhost:3000 2>/dev/null
echo ""
echo "=== Login page ==="
curl -s http://localhost:3000/login 2>/dev/null | grep -o '<title>[^<]*' | head -1
echo "=== Recent logs ==="
journalctl -u asset-manager --no-pager -n 10 2>/dev/null | grep -v "^\$" | tail -5
""")
print("CHECK:", out2[:2000].encode('ascii', errors='replace').decode('ascii'))

c.close()
