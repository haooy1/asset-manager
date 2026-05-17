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

def run(cmd, timeout=30):
    print(f">>> {cmd[:80]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err:
        print(f"[stderr] {err[:500]}")
    return stdout.channel.recv_exit_status(), out, err

run("uname -a")
run("df -h /")
run("free -h")
run("node -v")
run("npm -v")
run("ps aux | grep 'next-server' | grep -v grep || echo '无Next服务'")
run("ss -tlnp | grep 3000 || echo '3000端口未占用'")
run("systemctl status postgresql 2>/dev/null | head -3 || echo 'PG状态检查失败'")
run("cd /opt/asset-manager && git log --oneline -3 2>/dev/null || echo 'Git检查失败'")

ssh.close()
print("\n环境检查完成!")
