"""同步审计日志功能变更到麒麟测试机"""
import paramiko
import os

REMOTE_HOST = "100.87.31.92"
REMOTE_USER = "root"
REMOTE_PASSWORD = "Secu@7766"
REMOTE_PATH = "/opt/asset-manager"
LOCAL_BASE = "e:/08_code/asystem"

CHANGED_FILES = [
    "prisma/schema.prisma",
    "src/lib/db/audit.ts",
    "src/lib/auth/config.ts",
    "src/app/api/audit-logs/route.ts",
    "src/app/(dashboard)/audit-logs/page.tsx",
]


def main():
    print("=" * 60)
    print("同步审计日志变更到麒麟测试机")
    print("=" * 60)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(REMOTE_HOST, 22, REMOTE_USER, REMOTE_PASSWORD, timeout=30)
    sftp = client.open_sftp()

    print("\n[1/4] 上传变更文件...")
    for rel in CHANGED_FILES:
        local = os.path.join(LOCAL_BASE, rel).replace("\\", "/")
        remote = f"{REMOTE_PATH}/{rel}"
        sftp.put(local, remote)
        print(f"  ✓ {rel}")

    sftp.close()

    print("\n[2/4] prisma generate + db push...")
    stdin, stdout, stderr = client.exec_command(
        f"cd {REMOTE_PATH} && npx prisma generate 2>&1 && npx prisma db push --accept-data-loss 2>&1",
        timeout=120,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    print(out[-1000:])

    print("\n[3/4] 重新构建...")
    stdin, stdout, stderr = client.exec_command(
        f"cd {REMOTE_PATH} && npx next build 2>&1 | tail -20",
        timeout=300,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    print(out[-1500:])

    print("\n[4/4] 重启服务...")
    stdin, stdout, stderr = client.exec_command(
        "systemctl restart asset-manager && sleep 3 && systemctl status asset-manager --no-pager 2>&1 | head -8",
        timeout=30,
    )
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)

    stdin, stdout, stderr = client.exec_command(
        "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000",
        timeout=10,
    )
    status = stdout.read().decode().strip()
    print(f"\n健康检查: {status}")

    client.close()
    print("\n✅ 部署完成")


if __name__ == "__main__":
    main()
