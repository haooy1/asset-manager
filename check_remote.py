import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('100.87.31.92', username='root', password='Secu@7766', timeout=10)
    print("SSH连接成功")
except Exception as e:
    print(f"SSH连接失败: {e}")
    sys.exit(1)

commands = [
    ("系统信息", "uname -a"),
    ("磁盘空间", "df -h /"),
    ("内存使用", "free -h"),
    ("Node.js版本", "node -v 2>/dev/null || echo 'Node.js未安装'"),
    ("npm版本", "npm -v 2>/dev/null || echo 'npm未安装'"),
    ("项目目录", "ls -la /opt/asset-manager/ 2>/dev/null || echo '目录不存在'"),
    ("Git状态", "cd /opt/asset-manager && git status 2>/dev/null || echo '非Git仓库'"),
    ("Git日志", "cd /opt/asset-manager && git log --oneline -3 2>/dev/null || echo '无Git日志'"),
    ("进程状态", "ps aux | grep -E 'next|node' | grep -v grep || echo '无Node进程'"),
    ("端口占用", "ss -tlnp | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000 || echo '3000端口未占用'"),
    ("数据库状态", "systemctl status postgresql 2>/dev/null | head -5 || echo 'PostgreSQL服务检查失败'"),
    ("数据库连接", "cd /opt/asset-manager && npx prisma db pull --print 2>/dev/null | head -5 || echo '数据库连接检查失败'"),
    ("环境变量", "cd /opt/asset-manager && cat .env 2>/dev/null | grep -v PASSWORD | grep -v SECRET || echo '.env不存在'"),
    ("package.json", "cd /opt/asset-manager && cat package.json 2>/dev/null | head -20 || echo 'package.json不存在'"),
    ("上传目录", "ls -la /opt/asset-manager/public/uploads/ 2>/dev/null || echo 'uploads目录不存在'"),
]

for label, cmd in commands:
    print(f"\n{'='*20} {label} {'='*20}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err:
        print(f"[stderr] {err}")
    if not out and not err:
        print("(无输出)")

ssh.close()
print("\n\n环境检查完成!")
