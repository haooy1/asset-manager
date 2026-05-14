#!/usr/bin/env python3
"""Fix: root page.tsx shadows dashboard. Delete it so dashboard becomes root."""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

# Show current root page
s,o,e = c.exec_command('cat /opt/asset-manager/src/app/page.tsx', timeout=15)
print("=== CURRENT ROOT page.tsx ===")
print(o.read().decode('utf-8',errors='replace'))

# The fix: remove root page.tsx OR make it redirect
# Better approach: Make root page.tsx redirect to dashboard
new_root_page = '''import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
'''

sftp = c.open_sftp()
with open('/tmp/root_fix.tsx', 'w') as f:
    f.write(new_root_page)
sftp.put('/tmp/root_fix.tsx', '/opt/asset-manager/src/app/page.tsx')
sftp.close()

# Also fix login page redirect to just use router.push("/")
login_page = '''"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error || "\u767b\u5f55\u5931\u8d25");
    } else if (result?.ok) {
      window.location.replace("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">IT \u8d44\u4ea7\u7ba1\u7406\u7cfb\u7edf</h1>
          <p className="mt-1 text-sm text-gray-500">\u8bf7\u767b\u5f55</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">\u7528\u6237\u540d</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="admin" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">\u5bc6\u7801</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="admin123" />
          </div>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <button type="submit" disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "\u767b\u5f55\u4e2d..." : "\u767b \u5f55"}
          </button>
        </form>
      </div>
    </div>
  );
}
'''

# Write as utf-8
with open('E:/08_code/asystem/scripts/_login_fix.tsx', 'w', encoding='utf-8') as f:
    f.write(login_page)

sftp.put('E:/08_code/asystem/scripts/_login_fix.tsx', '/opt/asset-manager/src/app/(auth)/login/page.tsx')
sftp.close()

# Restart
s,o,e = c.exec_command('systemctl restart asset-manager && sleep 6 && echo READY', timeout=30)
print(o.read().decode())

# Verify
s,o,e = c.exec_command("""echo "=== Root page ===" && curl -s http://localhost:3000/ 2>/dev/null | grep -o '<h1[^>]*>[^<]*' | head -3
echo "=== Dashboard (with cookie) ==="
rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST -b /tmp/cjar.txt -c /tmp/cjar.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" http://localhost:3000/api/auth/callback/credentials >/dev/null
echo "Dashboard HTML:"
curl -s -b /tmp/cjar.txt http://localhost:3000/ 2>/dev/null | grep -o '<h1[^>]*>[^<]*' | head -3""", timeout=30)
print(o.read().decode('utf-8',errors='replace'))

c.close()
