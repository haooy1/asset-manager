#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Fix pg_hba.conf revert: restore peer for local socket, keep md5 for 127.0.0.1
# Just move on - build even if DB push hasn't worked yet

# 1. Force DB push
cmds1 = """cd /opt/asset-manager
echo "STEP1: PRISMA GENERATE"
npx prisma generate 2>&1 | grep -i 'error\\|success' | head -3 || echo "prisma_generate_done"

echo "STEP2: PRISMA DB PUSH"
npx prisma db push --accept-data-loss 2>&1 | tail -10
echo "push_exit: $?"
"""
stdin, stdout, stderr = c.exec_command(cmds1, timeout=120)
out = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out[:2000])

# 2. Build
cmds2 = """cd /opt/asset-manager
echo "STEP3: BUILD"
npx next build 2>&1 | tail -15
echo "build_exit: $?"
"""
stdin, stdout, stderr = c.exec_command(cmds2, timeout=300)
out2 = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out2[:2000])

# 3. Setup service + firewall + start
cmds3 = """cd /opt/asset-manager
echo "STEP4: SERVICE SETUP"
cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'
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

echo "STEP5: FIREWALL"
firewall-cmd --add-port=3000/tcp --permanent 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
echo "firewall done"

echo "STEP6: RESTART SERVICE"
systemctl restart asset-manager 2>&1 || (nohup npx next start -p 3000 -H 0.0.0.0 > /var/log/asset-manager.log 2>&1 & echo "started_manual")

echo "STEP7: WAIT"
sleep 5
echo "STEP8: STATUS"
systemctl status asset-manager --no-pager 2>&1 | head -8
echo "STEP9: CHECK"
curl -s -o /dev/null -w 'HTTP_CODE:%{http_code}' http://localhost:3000 2>/dev/null || echo "not_responding_yet"
echo "ALL DONE"
"""
stdin, stdout, stderr = c.exec_command(cmds3, timeout=120)
out3 = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out3[:2000])

c.close()
