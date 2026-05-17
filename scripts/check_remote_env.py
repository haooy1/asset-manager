#!/usr/bin/env python3
import paramiko
HOST = "100.87.31.92"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, "root", "Secu@7766", timeout=30, allow_agent=False, look_for_keys=False)
stdin, stdout, stderr = c.exec_command("cat /opt/asset-manager/.env && echo '---' && env | grep DATABASE")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
c.close()
