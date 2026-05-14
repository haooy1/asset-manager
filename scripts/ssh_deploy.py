#!/usr/bin/env python3
"""SSH helper - runs remote commands with password auth"""
import subprocess, sys, os, time

HOST = "100.87.31.92"
USER = "root"
PASS = "Secu@7766"

def run_remote(command):
    """Run a command on the remote server via SSH with password"""
    # Use SSH with a PTY to handle password prompt
    ssh_cmd = [
        "ssh", "-tt",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "LogLevel=ERROR",
        f"{USER}@{HOST}",
        command
    ]
    
    proc = subprocess.Popen(
        ssh_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    # SSH password prompt goes to TTY, but with -tt and stdin pipe it works
    stdout, _ = proc.communicate(input=f"{PASS}\n", timeout=60)
    
    # Filter out the password prompt line
    lines = stdout.split('\n')
    filtered = [l for l in lines if 'password' not in l.lower() and 'Password' not in l]
    return '\n'.join(filtered).strip()

def run_remote_multi(commands):
    """Run multiple commands in a single SSH session (long-lived)"""
    # Write commands to a temp script, run it remotely
    script = "#!/bin/bash\nset -e\n" + "\n".join(commands)
    
    # Use heredoc in a single SSH call
    heredoc = "\n".join(commands)
    
    cmd = f'set -e\n{heredoc}'
    
    ssh_cmd = [
        "ssh", "-tt",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "LogLevel=ERROR",
        f"{USER}@{HOST}",
        f"bash -c '{cmd}'"
    ]
    
    proc = subprocess.Popen(
        ssh_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    stdout, _ = proc.communicate(input=f"{PASS}\n", timeout=300)
    
    lines = stdout.split('\n')
    filtered = [l for l in lines if 'password' not in l.lower() and 'Password' not in l]
    return proc.returncode, '\n'.join(filtered).strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ssh_helper.py <command>")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == "check":
        cmds = [
            "echo '=== OS ==='",
            "cat /etc/os-release 2>/dev/null || cat /etc/kylin-release 2>/dev/null",
            "echo '=== ARCH ==='",
            "uname -m",
            "echo '=== NODE ==='",
            "node -v 2>&1 || echo NOT_INSTALLED",
            "echo '=== PSQL ==='",
            "psql --version 2>&1 || echo NOT_INSTALLED",
            "echo '=== GIT ==='",
            "git --version 2>&1 || echo NOT_INSTALLED",
            "echo '=== NPM ==='",
            "npm -v 2>&1 || echo NOT_INSTALLED",
            "echo '=== DISK ==='",
            "df -h / | tail -1",
            "echo '=== MEM ==='",
            "free -h | head -2"
        ]
        rc, out = run_remote_multi(cmds)
        print(out)
    
    elif action == "deploy":
        cmds = [
            "echo '[1/6] Installing Node.js 20.x...'",
            "if ! command -v node &>/dev/null; then curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - 2>/dev/null; yum install -y nodejs 2>/dev/null || ( NODE_TAR=node-v20.18.0-linux-x64.tar.xz; [ $(uname -m) = aarch64 ] && NODE_TAR=node-v20.18.0-linux-arm64.tar.xz; wget -q https://nodejs.org/dist/v20.18.0/$NODE_TAR -O /tmp/node.tar.xz; tar -xJf /tmp/node.tar.xz -C /usr/local/; ln -sf /usr/local/node-v20.18.0-*/bin/node /usr/bin/node; ln -sf /usr/local/node-v20.18.0-*/bin/npm /usr/bin/npm; ln -sf /usr/local/node-v20.18.0-*/bin/npx /usr/bin/npx ); fi",
            "echo 'Node.js: '$(node -v)",
            "",
            "echo '[2/6] Configuring npm registry...'",
            "npm config set registry https://registry.npmmirror.com",
            "",
            "echo '[3/6] Cloning project...'",
            "if [ -d /opt/asset-manager/.git ]; then cd /opt/asset-manager && git pull origin main; else git clone https://gitee.com/haooy1/asset-manager.git /opt/asset-manager; fi",
            "",
            "echo '[4/6] Installing dependencies...'",
            "cd /opt/asset-manager",
            "npm install -g pnpm@10 2>/dev/null || true",
            "pnpm install --no-frozen-lockfile 2>/dev/null || npm install 2>/dev/null",
            "",
            "echo '[5/6] Setting up .env...'",
            "if [ ! -f /opt/asset-manager/.env ]; then",
            "  AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | md5sum | head -c 32)",
            "  cat > /opt/asset-manager/.env << ENVEOF",
            "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public",
            "AUTH_SECRET=$AUTH_SECRET",
            "AUTH_URL=http://100.87.31.92:3000",
            "ENVEOF",
            "  echo '.env created'",
            "else echo '.env exists, skipping'",
            "fi",
            "",
            "echo '[6/6] Initializing database...'",
            "npx prisma generate 2>/dev/null || true",
            "npx prisma db push --accept-data-loss 2>/dev/null || echo 'DB push skipped (check PostgreSQL)'",
            "",
            "echo ''",
            "echo '========== DEPLOY COMPLETE =========='",
            "echo 'Start: cd /opt/asset-manager && pnpm dev'",
            "echo 'Access: http://100.87.31.92:3000/login'"
        ]
        rc, out = run_remote_multi(cmds)
        print(out)
        if rc == 0:
            print("\n[DEPLOY SUCCESS]")
        else:
            print(f"\n[DEPLOY FAILED] exit code: {rc}")
    
    elif action == "start":
        cmds = [
            "cd /opt/asset-manager",
            "cat > /etc/systemd/system/asset-manager.service << 'EOF'",
            "[Unit]",
            "Description=IT Asset Manager",
            "After=network.target",
            "[Service]",
            "Type=simple",
            "WorkingDirectory=/opt/asset-manager",
            "ExecStart=/usr/bin/node /opt/asset-manager/node_modules/.bin/next start -p 3000",
            "Restart=always",
            "RestartSec=5",
            "[Install]",
            "WantedBy=multi-user.target",
            "EOF",
            "systemctl daemon-reload",
            "systemctl enable asset-manager",
            "systemctl restart asset-manager 2>/dev/null || ( cd /opt/asset-manager && nohup npx next start -p 3000 > /var/log/asset-manager.log 2>&1 & echo 'Started with nohup, PID: '$! )",
            "sleep 3",
            "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'STARTING'"
        ]
        rc, out = run_remote_multi(cmds)
        print(out)
    
    elif action == "status":
        cmds = [
            "echo '=== Service Status ==='",
            "systemctl status asset-manager 2>&1 | head -5 || echo 'No systemd service'",
            "echo ''",
            "echo '=== Process ==='",
            "ps aux | grep 'next start' | grep -v grep || echo 'Not running'",
            "echo ''",
            "echo '=== Port Check ==='",
            "ss -tlnp | grep 3000 || echo 'Port 3000 not listening'",
            "echo ''",
            "echo '=== HTTP Check ==='",
            "curl -s -o /dev/null -w 'HTTP Status: %{http_code}\n' http://localhost:3000 2>/dev/null || echo 'Service not responding'"
        ]
        rc, out = run_remote_multi(cmds)
        print(out)
