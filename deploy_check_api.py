import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('100.87.31.92', username='root', password='Secu@7766', timeout=30)

# 检查数据库资产数量（通过 psql）
stdin, stdout, stderr = client.exec_command(
    "PGPASSWORD=asset_manager123 psql -h localhost -U asset_manager -d asset_manager -c 'SELECT COUNT(*) FROM assets;' 2>&1",
    timeout=30
)
out = stdout.read().decode('utf-8', errors='replace').strip()
print("=== 数据库资产数量 ===")
print(out)

# 检查是否有资产数据
stdin, stdout, stderr = client.exec_command(
    "PGPASSWORD=asset_manager123 psql -h localhost -U asset_manager -d asset_manager -c 'SELECT id, asset_no, name, status FROM assets LIMIT 5;' 2>&1",
    timeout=30
)
out = stdout.read().decode('utf-8', errors='replace').strip()
print("\n=== 资产样本 ===")
print(out)

# 检查 categoryGroup 数量
stdin, stdout, stderr = client.exec_command(
    "PGPASSWORD=asset_manager123 psql -h localhost -U asset_manager -d asset_manager -c 'SELECT COUNT(*) FROM category_groups;' 2>&1",
    timeout=30
)
out = stdout.read().decode('utf-8', errors='replace').strip()
print("\n=== 品类组数量 ===")
print(out)

# 检查日志
stdin, stdout, stderr = client.exec_command(
    "tail -20 /opt/asset-manager/server.log 2>&1",
    timeout=30
)
out = stdout.read().decode('utf-8', errors='replace').strip()
print("\n=== 服务日志 ===")
print(out)

client.close()
