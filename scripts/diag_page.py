#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

# Get the dashboard page HTML
s,o,e = c.exec_command('curl -s http://localhost:3000/ 2>/dev/null | head -30', timeout=15)
print("=== DASHBOARD HTML ===")
print(o.read().decode('utf-8',errors='replace')[:3000])

# Get logs with errors
s,o,e = c.exec_command('journalctl -u asset-manager --no-pager -n 40 2>/dev/null | grep -i error | tail -5', timeout=15)
print("\n=== ERRORS ===")
print(o.read().decode('utf-8',errors='replace')[:2000])

# Check what modules are missing
s,o,e = c.exec_command('ls /opt/asset-manager/node_modules/bcryptjs/index.js 2>/dev/null && echo bcryptjs_OK || echo bcryptjs_MISSING; ls /opt/asset-manager/node_modules/next-auth 2>/dev/null && echo next-auth_OK || echo next-auth_MISSING; ls /opt/asset-manager/src/lib/auth/config.ts && ls /opt/asset-manager/src/lib/auth/middleware.ts', timeout=10)
print("\n=== MODULES ===")
print(o.read().decode('utf-8',errors='replace'))

# Check current config and middleware
s,o,e = c.exec_command('cat /opt/asset-manager/src/lib/auth/config.ts', timeout=10)
print("\n=== CONFIG ===")
print(o.read().decode('utf-8',errors='replace')[:2000])

c.close()
