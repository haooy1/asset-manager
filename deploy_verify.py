import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('100.87.31.92', username='root', password='Secu@7766', timeout=10)
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

print("=== 服务状态 ===")
run("ps aux | grep 'next-server' | grep -v grep")
run("ss -tlnp | grep 3000")

print("\n=== HTTP验证 ===")
for path in ["/", "/assets", "/approvals", "/login"]:
    rc, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000{path}")
    status = out.strip() if out else "N/A"
    print(f"  {path}: {status}")

print("\n=== 日志检查 ===")
run("tail -10 /opt/asset-manager/server.log")

ssh.close()
print("\n验证完成!")
