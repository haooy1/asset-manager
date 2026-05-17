import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('100.87.31.92', username='root', password='Secu@7766', timeout=10)
sftp = ssh.open_sftp()

remote_base = "/opt/asset-manager"
local_base = r"e:\08_code\asystem"

skip_dirs = {'.git', 'node_modules', '.next', '.venv', 'check_remote.py', 'deploy_check.py', 'deploy_sync.py'}
skip_files = {'.env'}

uploaded = 0
errors = 0

def should_upload(local_path, rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for p in parts:
        if p in skip_dirs:
            return False
    basename = os.path.basename(local_path)
    if basename in skip_files or basename in skip_dirs:
        return False
    return True

def ensure_remote_dir(remote_path):
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        parts = remote_path.split("/")
        current = ""
        for part in parts:
            if not part:
                continue
            current += "/" + part
            try:
                sftp.stat(current)
            except FileNotFoundError:
                try:
                    sftp.mkdir(current)
                except:
                    pass

def upload_file(local_path, remote_path):
    global uploaded, errors
    try:
        ensure_remote_dir(os.path.dirname(remote_path))
        sftp.put(local_path, remote_path)
        uploaded += 1
        if uploaded % 50 == 0:
            print(f"  已上传 {uploaded} 个文件...")
    except Exception as e:
        errors += 1
        print(f"  上传失败: {remote_path} - {e}")

def sync_directory(local_dir, remote_dir, rel_base=""):
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        rel_path = os.path.join(rel_base, item) if rel_base else item
        if not should_upload(local_path, rel_path):
            continue
        if os.path.isdir(local_path):
            remote_subdir = remote_dir + "/" + item
            sync_directory(local_path, remote_subdir, rel_path)
        elif os.path.isfile(local_path):
            remote_file = remote_dir + "/" + item
            upload_file(local_path, remote_file)

print("=== 开始SFTP同步 ===")
sync_directory(local_base, remote_base)
print(f"\n上传文件数: {uploaded}, 失败数: {errors}")

sftp.close()
ssh.close()
print("同步完成!")
