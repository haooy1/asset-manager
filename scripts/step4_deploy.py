#!/usr/bin/env python3
# encoding: utf-8
import paramiko, sys

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=60):
    """Run command and return output as ASCII-safe string"""
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out[:2000], err[:500], stdout.channel.recv_exit_status()

# 1. Check DB tables
q = "su - postgres -c \"psql -d asset_manager -c '\\\\dt'\""
out, err, rc = run(q)
print("=== DB TABLES ===")
print(out[:500])
print("RC:", rc)

# 2. Build the app if DB is OK
if 'branches' in out or 'users' in out or 'assets' in out or 'Did not find' not in out:
    print("\n=== DB looks ready, building app ===")
    q2 = "cd /opt/asset-manager && npx prisma generate 2>&1 | grep -i 'error\|success\|client' | head -5 && npx next build 2>&1 | tail -20"
    out2, err2, rc2 = run(q2, timeout=300)
    print(out2[:2000])
    print("BUILD RC:", rc2)
    
    # 3. Start service
    if rc2 == 0:
        print("\n=== Setting up service ===")
        q3 = """cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'
[Unit]
Description=IT Asset Manager
After=network.target postgresql.service
[Service]
Type=simple
WorkingDirectory=/opt/asset-manager
ExecStart=/usr/local/bin/node /opt/asset-manager/node_modules/.bin/next start -p 3000 -H 0.0.0.0
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable asset-manager 2>/dev/null
systemctl restart asset-manager 2>/dev/null || ( cd /opt/asset-manager && nohup npx next start -p 3000 -H 0.0.0.0 > /var/log/asset-manager.log 2>&1 & echo "PID=$!" )
echo "=== Firewall ==="
firewall-cmd --add-port=3000/tcp --permanent 2>/dev/null
firewall-cmd --reload 2>/dev/null
echo "=== STARTUP ==="
sleep 5
systemctl status asset-manager --no-pager 2>&1 | head -8
curl -s -o /dev/null -w 'HTTP_%{http_code}' http://localhost:3000 2>/dev/null"""
        out3, err3, rc3 = run(q3, timeout=60)
        print(out3[:2000])
        print("START RC:", rc3)
else:
    print("\n=== DB NOT READY, need to push schema ===")
    q4 = "cd /opt/asset-manager && npx prisma db push --accept-data-loss 2>&1 | tail -20"
    out4, err4, rc4 = run(q4, timeout=120)
    print(out4[:2000])

c.close()
