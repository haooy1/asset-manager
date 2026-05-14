import paramiko
import sys
import os

os.environ['PYTHONIOENCODING'] = 'utf-8'

HOST = "100.87.31.92"
USER = "root"
PASS = "Secu@7766"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

action = sys.argv[1] if len(sys.argv) > 1 else "logs"

if action == "logs":
    stdin, stdout, stderr = ssh.exec_command(
        "journalctl -u asset-manager --no-pager -n 80 2>/dev/null",
        timeout=30
    )
    out = stdout.read().decode('utf-8', errors='replace').strip()
    sys.stdout.buffer.write(out[-4000:].encode('utf-8', errors='replace'))
    sys.stdout.buffer.write(b'\n')

elif action == "api-test":
    cmds = [
        "curl -s http://localhost:3000/api/assets 2>&1",
        "echo '---SEPARATOR---'",
        "curl -s -c /tmp/ck.txt -b /tmp/ck.txt http://localhost:3000/api/auth/csrf 2>&1",
    ]
    for cmd in cmds:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
        sys.stdout.buffer.write(b'\n')

elif action == "sync":
    cmds = [
        "cd /opt/asset-manager && git fetch origin 2>&1",
        "cd /opt/asset-manager && git reset --hard origin/main 2>&1",
        "cd /opt/asset-manager && npm install -g pnpm@10 2>&1 | tail -2",
        "cd /opt/asset-manager && pnpm install --no-frozen-lockfile 2>&1 | tail -5",
        "cd /opt/asset-manager && npx prisma generate 2>&1 | tail -3",
        "cd /opt/asset-manager && npx prisma db push 2>&1 | tail -3",
        "systemctl restart asset-manager 2>&1",
        "sleep 8",
        "systemctl status asset-manager 2>&1 | head -5",
        "curl -s -o /dev/null -w 'HTTP_STATUS:%{http_code}' http://localhost:3000 2>&1",
    ]
    for cmd in cmds:
        sys.stdout.buffer.write(f">>> {cmd[:80]}\n".encode('utf-8'))
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        if out:
            sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
            sys.stdout.buffer.write(b'\n')

elif action == "test":
    cmds = [
        "rm -f /tmp/ck.txt",
        "curl -s -c /tmp/ck.txt -b /tmp/ck.txt http://localhost:3000/api/auth/csrf",
        "CSRF=$(curl -s -c /tmp/ck.txt -b /tmp/ck.txt http://localhost:3000/api/auth/csrf | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"csrfToken\"])' 2>/dev/null) && echo CSRF=$CSRF",
        "curl -s -c /tmp/ck.txt -b /tmp/ck.txt -X POST http://localhost:3000/api/auth/callback/credentials -H 'Content-Type: application/json' -d \"{\\\"username\\\":\\\"admin\\\",\\\"password\\\":\\\"admin123\\\",\\\"csrfToken\\\":\\\"$CSRF\\\"}\" -w '\\nLOGIN_STATUS:%{http_code}' -L 2>&1 | tail -5",
        "echo '--- CREATE ASSET ---'",
        "curl -s -c /tmp/ck.txt -b /tmp/ck.txt -X POST http://localhost:3000/api/assets -H 'Content-Type: application/json' -d '{\"assetNo\":\"PC-2026-TEST01\",\"name\":\"Test ThinkPad\",\"category\":\"PC\"}' -w '\\nCREATE_STATUS:%{http_code}' 2>&1",
        "echo ''",
        "echo '--- LIST ASSETS ---'",
        "curl -s -c /tmp/ck.txt -b /tmp/ck.txt http://localhost:3000/api/assets 2>&1 | head -200",
    ]
    for cmd in cmds:
        sys.stdout.buffer.write(f">>> {cmd[:80]}\n".encode('utf-8'))
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        if out:
            sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
            sys.stdout.buffer.write(b'\n')

ssh.close()
