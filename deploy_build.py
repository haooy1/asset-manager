import paramiko
import sys
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('100.87.31.92', username='root', password='Secu@7766', timeout=10)
except Exception as e:
    print(f"SSH连接失败: {e}")
    sys.exit(1)

def run(cmd, timeout=600):
    print(f"\n>>> {cmd[:100]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out[-2500:] if len(out) > 2500 else out)
    if err and "warn" not in err.lower():
        err_lines = err.split('\n')
        print(f"[stderr] {'... '.join(err_lines[-15:])}")
    return exit_code, out, err

base = "cd /opt/asset-manager"

print("=== 0. 安装缺失依赖 ===")
run(f"{base} && npm install tailwindcss autoprefixer @tailwindcss/postcss --save-dev", timeout=120)

print("=== 1. Prisma Generate ===")
run(f"{base} && npx prisma generate", timeout=120)

print("\n=== 2. Prisma DB Push ===")
run(f"{base} && npx prisma db push --accept-data-loss", timeout=120)

print("\n=== 3. npm install ===")
run(f"{base} && npm install", timeout=300)

print("\n=== 4. Clean .next ===")
run(f"{base} && rm -rf .next", timeout=30)

print("\n=== 5. npm run build ===")
rc, out, err = run(f"{base} && npm run build", timeout=600)
if rc != 0:
    print(f"\n❌ 构建失败! 退出码: {rc}")
    ssh.close()
    sys.exit(1)
print("\n✅ 构建成功!")

print("\n=== 6. 停止旧服务 ===")
run("pkill -f 'next-server' 2>/dev/null; sleep 2; echo 'done'")

print("\n=== 7. 启动新服务 ===")
run(f"{base} && nohup npx next start -H 0.0.0.0 -p 3000 > /opt/asset-manager/server.log 2>&1 &", timeout=10)
time.sleep(5)

print("\n=== 8. 验证服务 ===")
rc, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/", timeout=15)
if "200" in out or "302" in out:
    print("✅ 服务启动成功!")
else:
    print(f"⚠️ 状态: {out}")
    run("tail -20 /opt/asset-manager/server.log")

print("\n=== 9. 最终检查 ===")
run("ps aux | grep 'next-server' | grep -v grep")
run("ss -tlnp | grep 3000")

ssh.close()
print("\n部署完成!")
