#!/usr/bin/env python3
"""同步代码到麒麟测试机并部署"""
import paramiko
import sys
import os

HOST = "100.87.31.92"
USER = "root"
PASS = "Secu@7766"
REMOTE_DIR = "/opt/asset-manager"

class Deployer:
    def __init__(self):
        self.c = paramiko.SSHClient()
        self.c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.c.connect(HOST, 22, USER, PASS, timeout=30, allow_agent=False, look_for_keys=False)
        self.sftp = self.c.open_sftp()

    def upload_dir(self, local_dir, remote_dir, excludes=None):
        """递归上传目录，排除指定文件/目录"""
        excludes = excludes or []
        for root, dirs, files in os.walk(local_dir):
            dirs[:] = [d for d in dirs if d not in excludes]
            rel_path = os.path.relpath(root, local_dir)
            remote_path = os.path.join(remote_dir, rel_path).replace("\\", "/")
            try:
                self.sftp.mkdir(remote_path)
            except IOError:
                pass
            for file in files:
                if file in excludes:
                    continue
                local_file = os.path.join(root, file)
                remote_file = os.path.join(remote_path, file).replace("\\", "/")
                self.sftp.put(local_file, remote_file)

    def run(self, cmd):
        stdin, stdout, stderr = self.c.exec_command(cmd, timeout=300)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        rc = stdout.channel.recv_exit_status()
        return rc, out, err

    def close(self):
        self.sftp.close()
        self.c.close()

def main():
    print(f"=== 连接到麒麟测试机 {HOST} ===")
    d = Deployer()

    # 1. 检查远程环境
    print("\n[1/6] 检查远程环境...")
    rc, out, err = d.run("""
        echo "Node: $(node -v 2>/dev/null || echo 'NO')"
        echo "pnpm: $(/usr/local/bin/pnpm -v 2>/dev/null || echo 'NO')"
        echo "PostgreSQL: $(psql --version 2>/dev/null | head -1 || echo 'NO')"
        echo "PG status: $(systemctl is-active postgresql 2>/dev/null || echo 'NO')"
        echo "Service: $(systemctl is-active asset-manager 2>/dev/null || echo 'NO')"
    """)
    print(out)

    # 2. 上传代码（先传代码）
    print("\n[2/6] 上传代码到远程...")
    local_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    excludes = ['node_modules', '.git', '.next', '.pnpm-store', 'tmp']
    d.upload_dir(local_dir, REMOTE_DIR, excludes)
    print("代码上传完成")

    # 3. 修复远程 .env 配置（上传后再写，避免被覆盖）
    print("\n[3/6] 修复远程数据库配置...")
    rc, out, err = d.run(f"""
        cat > {REMOTE_DIR}/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public
AUTH_SECRET=kylin-deploy-secret-change-me-in-production
AUTH_URL=http://{HOST}:3000
EOF
        echo ".env updated"
        cat {REMOTE_DIR}/.env
    """)
    print(out)

    # 4. 安装依赖并生成 Prisma Client
    print("\n[4/6] 安装依赖并生成 Prisma Client...")
    rc, out, err = d.run(f"""
        cd {REMOTE_DIR}
        export PATH=$PATH:/usr/local/bin
        /usr/local/bin/pnpm install --no-frozen-lockfile 2>&1 | tail -5
        echo "---"
        /usr/local/bin/npx prisma generate 2>&1 | tail -5
    """)
    print(out)
    if rc != 0:
        print("依赖安装失败:", err)
        d.close()
        sys.exit(1)

    # 5. 同步数据库
    print("\n[5/6] 同步数据库...")
    rc, out, err = d.run(f"""
        cd {REMOTE_DIR}
        export PATH=$PATH:/usr/local/bin
        /usr/local/bin/npx prisma db push --accept-data-loss 2>&1 | tail -10
    """)
    print(out)
    if rc != 0:
        print("数据库同步失败:", err)

    # 6. 构建项目
    print("\n[6/6] 构建项目...")
    rc, out, err = d.run(f"""
        cd {REMOTE_DIR}
        export PATH=$PATH:/usr/local/bin
        /usr/local/bin/pnpm run build 2>&1 | tail -25
    """)
    print(out)
    if rc != 0:
        print("构建失败:", err)
        d.close()
        sys.exit(1)

    # 7. 重启服务
    print("\n[7/7] 重启服务...")
    rc, out, err = d.run("""
        systemctl daemon-reload
        systemctl restart asset-manager
        sleep 5
        systemctl status asset-manager --no-pager 2>&1 | head -6
        echo "---"
        curl -s -o /dev/null -w 'HTTP Status: %{http_code}' http://localhost:3000 2>/dev/null || echo "000"
    """)
    print(out)

    d.close()
    print("\n=== 部署完成 ===")
    print(f"访问地址: http://{HOST}:3000")

if __name__ == "__main__":
    main()
