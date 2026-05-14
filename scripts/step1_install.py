#!/usr/bin/env python3
"""Step 1: Install pnpm + .env + pnpm install"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = [
    'echo === Step 1: Install pnpm ===',
    'npm install -g pnpm@10',
    'export PATH=$PATH:/usr/local/bin',
    'pnpm -v && echo pnpm OK || echo pnpm FAILED',
    '',
    'echo === Step 2: Setup .env ===',
    'cd /opt/asset-manager',
    'ASECRET=$(openssl rand -hex 32)',
    'cat > .env << ENVEOF',
    'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public',
    "AUTH_SECRET=$ASECRET",
    'AUTH_URL=http://100.87.31.92:3000',
    'ENVEOF',
    'echo ".env created"',
    '',
    'echo === Step 3: npm registry ===',
    'npm config set registry https://registry.npmmirror.com',
    '',
    'echo === Step 4: pnpm install (this takes time...) ===',
    'pnpm install --no-frozen-lockfile',
    '',
    'echo === Step 5: Check ===',
    'ls /opt/asset-manager/node_modules/next/package.json 2>/dev/null && echo "Dependencies OK" || echo "Dependencies MISSING"',
    'echo === DONE ===',
]

script = "\n".join(cmds)
stdin, stdout, stderr = c.exec_command(script, get_pty=True, timeout=300)
out = stdout.read().decode('utf-8', errors='replace')
# Filter out pnpm spinner characters that break GBK
clean = out.replace('\u2800','').replace('\u2819','').replace('\u281a','').replace('\u283f','').replace('\u28ff','')
print(clean.encode('ascii', errors='replace').decode('ascii'))
c.close()
