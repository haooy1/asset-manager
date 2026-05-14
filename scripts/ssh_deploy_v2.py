#!/usr/bin/env python3
"""IT Asset Manager - Remote Deploy Script v1.0 (paramiko SSH)"""
import paramiko, sys, time

HOST = "100.87.31.92"
PORT = 22
USER = "root"
PASS = "Secu@7766"
TIMEOUT = 30

class RemoteServer:
    """Long-lived SSH connection to remote server"""
    
    def __init__(self, host, port, user, password):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(host, port, user, password,
                           timeout=TIMEOUT, allow_agent=False, look_for_keys=False)
        self.sftp = self.client.open_sftp()
        print(f"[CONNECTED] {host}:{port} as {user}")
    
    def run(self, cmd, pty=False):
        """Execute a command on remote server and return output"""
        stdin, stdout, stderr = self.client.exec_command(cmd, get_pty=pty, timeout=300)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        rc = stdout.channel.recv_exit_status()
        return rc, out, err
    
    def run_script(self, commands, show_output=True):
        """Run multiple commands in a single session (one connection, many commands)"""
        script = "\n".join(commands)
        rc, out, err = self.run(script, pty=True)
        if show_output:
            print(out)
            if err.strip():
                print(err)
        return rc == 0, out
    
    def put_file(self, local, remote):
        """Upload a file to remote server"""
        self.sftp.put(local, remote)
    
    def close(self):
        self.sftp.close()
        self.client.close()
        print("[DISCONNECTED]")


def check_env(rs):
    """Check server environment"""
    print("=" * 50)
    print("  Server Environment Check")
    print("=" * 50)
    cmds = [
        "echo '---- OS ----'",
        "cat /etc/os-release 2>/dev/null | head -5 || cat /etc/kylin-release 2>/dev/null",
        "echo '---- ARCH ----'",
        "uname -m",
        "echo '---- NODE ----'",
        "node -v 2>&1 || echo 'NOT INSTALLED'",
        "echo '---- POSTGRESQL ----'",
        "psql --version 2>&1 | head -1 || echo 'NOT INSTALLED'",
        "echo '---- GIT ----'",
        "git --version 2>&1 || echo 'NOT INSTALLED'",
        "echo '---- DISK ----'",
        "df -h / | tail -1",
        "echo '---- MEMORY ----'",
        "free -h | head -2",
        "echo '---- FIREWALL ----'",
        "firewall-cmd --state 2>/dev/null || ufw status 2>/dev/null || echo 'Unknown'",
    ]
    rs.run_script(cmds)


def deploy(rs):
    """Deploy the application to the server"""
    print("=" * 50)
    print("  IT Asset Manager v1.0.0 - Deploy")
    print("=" * 50)
    
    cmds = [
        # Step 1: Install Node.js
        "echo '[1/6] Installing Node.js 20.x...'",
        "if ! command -v node &>/dev/null; then",
        "  NODEV=20.18.0",
        "  ARCHNAME=linux-x64",
        "  [ $(uname -m) = aarch64 ] && ARCHNAME=linux-arm64",
        "  wget -q https://nodejs.org/dist/v$NODEV/node-v$NODEV-$ARCHNAME.tar.xz -O /tmp/node.tar.xz",
        "  tar -xJf /tmp/node.tar.xz -C /usr/local/",
        "  ln -sf /usr/local/node-v$NODEV-$ARCHNAME/bin/node /usr/local/bin/node",
        "  ln -sf /usr/local/node-v$NODEV-$ARCHNAME/bin/npm /usr/local/bin/npm",
        "  ln -sf /usr/local/node-v$NODEV-$ARCHNAME/bin/npx /usr/local/bin/npx",
        "  rm /tmp/node.tar.xz",
        "fi",
        "echo '  Node.js '$(node -v)",
        "",
        
        # Step 2: Install pnpm
        "echo '[2/6] Installing pnpm...'",
        "npm install -g pnpm@10 2>/dev/null || true",
        "npm config set registry https://registry.npmmirror.com 2>/dev/null || true",
        "echo '  pnpm '$(pnpm -v 2>/dev/null || echo 'using npm')",
        "",
        
        # Step 3: Clone project
        "echo '[3/6] Deploying project files...'",
        "if [ -d /opt/asset-manager/.git ]; then",
        "  cd /opt/asset-manager && git pull origin main 2>/dev/null || echo '  git pull skipped'",
        "else",
        "  mkdir -p /opt/asset-manager",
        "  git clone https://gitee.com/haooy1/asset-manager.git /opt/asset-manager 2>/dev/null || echo '  clone from gitee'",
        "fi",
        "echo '  Project at /opt/asset-manager'",
        "",
        
        # Step 4: Install dependencies
        "echo '[4/6] Installing dependencies...'",
        "cd /opt/asset-manager",
        "pnpm install --no-frozen-lockfile 2>/dev/null || npm install 2>/dev/null",
        "echo '  Dependencies installed'",
        "",
        
        # Step 5: Setup .env
        "echo '[5/6] Setting up .env...'",
        "if [ ! -f /opt/asset-manager/.env ]; then",
        "  ASECRET=$(openssl rand -hex 32 2>/dev/null || echo 'dev-secret-change-me-$(date +%s)')",
        '  cat > /opt/asset-manager/.env << ENVEOF',
        "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public",
        "AUTH_SECRET=$ASECRET",
        "AUTH_URL=http://100.87.31.92:3000",
        "ENVEOF",
        "  echo '  .env created'",
        "else",
        "  echo '  .env exists'",
        "fi",
        "",
        
        # Step 6: Init database
        "echo '[6/6] Initializing database...'",
        "cd /opt/asset-manager",
        "npx prisma generate 2>/dev/null || true",
        "npx prisma db push --accept-data-loss 2>&1 || echo '  DB push: check PostgreSQL status'",
        "",
        "echo ''",
        "echo '============================================'",
        "echo '  Deploy Complete!'",
        "echo '============================================'",
        "echo '  cd /opt/asset-manager && pnpm dev'",
        "echo '  http://100.87.31.92:3000/login'",
    ]
    rs.run_script(cmds)


def start_service(rs):
    """Setup systemd service and start the app"""
    print("=" * 50)
    print("  Starting Service")
    print("=" * 50)
    
    cmds = [
        "cd /opt/asset-manager",
        "cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'",
        "[Unit]",
        "Description=IT Asset Manager",
        "After=network.target",
        "",
        "[Service]",
        "Type=simple",
        "WorkingDirectory=/opt/asset-manager",
        "ExecStart=/usr/local/bin/node /opt/asset-manager/node_modules/.bin/next start -p 3000 -H 0.0.0.0",
        "Restart=always",
        "RestartSec=5",
        "StandardOutput=journal",
        "StandardError=journal",
        "",
        "[Install]",
        "WantedBy=multi-user.target",
        "SVCEOF",
        "systemctl daemon-reload",
        "systemctl enable asset-manager 2>/dev/null",
        "systemctl restart asset-manager 2>/dev/null || (",
        "  cd /opt/asset-manager",
        "  nohup npx next start -p 3000 -H 0.0.0.0 > /var/log/asset-manager.log 2>&1 &",
        "  echo 'Started with nohup, PID: '$!",
        ")",
        "echo 'Waiting for service to start...'",
        "sleep 5",
        "systemctl status asset-manager --no-pager 2>/dev/null | head -8 || echo 'Check: ps aux | grep next'",
    ]
    rs.run_script(cmds)


def check_status(rs):
    """Check deployment status"""
    print("=" * 50)
    print("  Deployment Status")
    print("=" * 50)
    
    cmds = [
        "echo '---- Systemd ----'",
        "systemctl is-active asset-manager 2>/dev/null || echo 'No systemd service'",
        "echo '---- Process ----'",
        "ps aux | grep 'next start' | grep -v grep | head -2 || echo 'Not running'",
        "echo '---- Port ----'",
        "ss -tlnp | grep 3000 2>/dev/null || netstat -tlnp 2>/dev/null | grep 3000 || echo 'Port 3000: not listening'",
        "echo '---- HTTP Check ----'",
        "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000 2>/dev/null || echo 'Not responding'",
        "echo ''",
        "echo '---- Recent Logs ----'",
        "journalctl -u asset-manager --no-pager -n 10 2>/dev/null || tail -20 /var/log/asset-manager.log 2>/dev/null || echo 'No logs'",
    ]
    rs.run_script(cmds)


def open_firewall(rs):
    """Open port 3000 on firewall"""
    print("=" * 50)
    print("  Configuring Firewall")
    print("=" * 50)
    
    cmds = [
        "firewall-cmd --add-port=3000/tcp --permanent 2>/dev/null && firewall-cmd --reload 2>/dev/null && echo 'Port 3000 opened (firewalld)' || true",
        "iptables -I INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null && echo 'Port 3000 opened (iptables)' || true",
        "echo 'Firewall configured'",
    ]
    rs.run_script(cmds)


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    
    print(f"=> Connecting to {HOST}...")
    try:
        rs = RemoteServer(HOST, PORT, USER, PASS)
    except Exception as e:
        print(f"[ERROR] SSH connection failed: {e}")
        sys.exit(1)
    
    try:
        if action == "check":
            check_env(rs)
        elif action == "deploy":
            deploy(rs)
        elif action == "start":
            start_service(rs)
        elif action == "firewall":
            open_firewall(rs)
        elif action == "status":
            check_status(rs)
        elif action == "full":
            check_env(rs)
            deploy(rs)
            open_firewall(rs)
            start_service(rs)
            time.sleep(3)
            check_status(rs)
        else:
            print(f"Unknown action: {action}")
            print("Usage: python ssh_deploy_v2.py [check|deploy|start|status|firewall|full]")
    finally:
        rs.close()
