#!/usr/bin/env python3
"""Check what was installed on the server so far"""
import paramiko, sys, time

HOST = "100.87.31.92"
PORT = 22
USER = "root"
PASS = "Secu@7766"

class RS:
    def __init__(self, host, port, user, password):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(host, port, user, password, timeout=30, allow_agent=False, look_for_keys=False)
    
    def run(self, cmds, show=True):
        script = "\n".join(cmds)
        stdin, stdout, stderr = self.client.exec_command(script, get_pty=True, timeout=120)
        out = stdout.read().decode('utf-8', errors='replace')
        if show: print(out)
        return stdout.channel.recv_exit_status() == 0, out
    
    def close(self):
        self.client.close()

rs = RS(HOST, PORT, USER, PASS)

# Quick check
ok, out = rs.run([
    "echo '1. Node.js: '$(node -v 2>/dev/null || echo 'NOT INSTALLED')",
    "echo '2. npm: '$(npm -v 2>/dev/null || echo 'NOT INSTALLED')",
    "echo '3. pnpm: '$(pnpm -v 2>/dev/null || echo 'NOT INSTALLED')",
    "echo '4. Project dir exists: '$([ -d /opt/asset-manager ] && echo 'YES' || echo 'NO')",
    "echo '5. node_modules: '$([ -d /opt/asset-manager/node_modules ] && echo 'YES' || echo 'NO')",
    "echo '6. psql: '$(psql --version 2>/dev/null || echo 'NOT INSTALLED')",
    "echo '7. postgresql running: '$(systemctl is-active postgresql 2>/dev/null || echo 'NO')",
    "echo '8. .env exists: '$([ -f /opt/asset-manager/.env ] && echo 'YES' || echo 'NO')",
])
rs.close()
