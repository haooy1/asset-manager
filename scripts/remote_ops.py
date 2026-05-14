import paramiko
import sys

HOST = "100.87.31.92"
USER = "root"
PASS = "Secu@7766"

def ssh_exec(commands):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=15)
    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(out)
        if err and 'warning' not in err.lower() and 'Warning' not in err:
            print("ERR:", err)
    ssh.close()

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    
    if action == "check":
        ssh_exec([
            "cat /opt/asset-manager/.env",
            "echo '=== SCHEMA ==='",
            "head -10 /opt/asset-manager/prisma/schema.prisma",
            "echo '=== DEPS ==='",
            "grep 'bcryptjs\\|next-auth' /opt/asset-manager/package.json",
            "echo '=== GIT ==='",
            "cd /opt/asset-manager && git log --oneline -3 2>/dev/null || echo NO_GIT",
            "echo '=== API_TEST ==='",
            "curl -s http://localhost:3000/api/assets",
        ])
    
    elif action == "sync":
        ssh_exec([
            "cd /opt/asset-manager && git fetch origin && git reset --hard origin/main",
            "echo '=== INSTALL ==='",
            "cd /opt/asset-manager && npm install -g pnpm@10 2>/dev/null; pnpm install --no-frozen-lockfile 2>&1 | tail -5",
            "echo '=== PRISMA ==='",
            "cd /opt/asset-manager && npx prisma generate 2>&1 | tail -3",
            "cd /opt/asset-manager && npx prisma db push 2>&1 | tail -3",
            "echo '=== RESTART ==='",
            "systemctl restart asset-manager",
            "sleep 5",
            "echo '=== VERIFY ==='",
            "curl -s -o /dev/null -w 'HTTP_STATUS:%{http_code}' http://localhost:3000",
        ])
    
    elif action == "test":
        ssh_exec([
            "echo '=== LOGIN ==='",
            "curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt http://localhost:3000/api/auth/csrf",
            "echo ''",
            "CSRF=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt http://localhost:3000/api/auth/csrf | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"csrfToken\"])' 2>/dev/null)",
            "curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials -H 'Content-Type: application/json' -d \"{\\\"username\\\":\\\"admin\\\",\\\"password\\\":\\\"admin123\\\",\\\"csrfToken\\\":\\\"$CSRF\\\"}\" -w '\\nHTTP_STATUS:%{http_code}' -L",
            "echo ''",
            "echo '=== CREATE ASSET ==='",
            "curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://localhost:3000/api/assets -H 'Content-Type: application/json' -d '{\"assetNo\":\"PC-2026-TEST01\",\"name\":\"Test ThinkPad\",\"category\":\"PC\",\"model\":\"X1C\",\"brand\":\"Lenovo\"}' -w '\\nHTTP_STATUS:%{http_code}'",
            "echo ''",
            "echo '=== LIST ASSETS ==='",
            "curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt http://localhost:3000/api/assets | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f\"Total: {d.get(chr(116)+chr(111)+chr(116)+chr(97)+chr(108),0)}\")' 2>/dev/null || echo 'LIST_FAILED'",
        ])
    
    elif action == "restart":
        ssh_exec([
            "systemctl restart asset-manager",
            "sleep 5",
            "systemctl status asset-manager | head -5",
            "curl -s -o /dev/null -w 'HTTP_STATUS:%{http_code}' http://localhost:3000",
        ])
