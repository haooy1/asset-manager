#!/usr/bin/env python3
"""Fix: Delete root page.tsx, dashboard should take over / route"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

# 1. Delete root page.tsx (conflicts with dashboard)
print(run("rm -f /opt/asset-manager/src/app/page.tsx && echo 'root page.tsx deleted'"))

# 2. Fix login page redirect
login_fix = '''"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username, password,
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        setError(result.error || "Login failed");
      } else if (result?.ok) {
        window.location.reload();
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">IT Asset Manager</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="admin" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="admin123" />
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
'''

# Write login page directly via heredoc
script = f"cat > /opt/asset-manager/src/app/"(auth)"/login/page.tsx << 'EOF'\n{login_fix}\nEOF"
run(script, timeout=10)

# 3. Delete any leftover auth layout that might interfere
print(run("cat /opt/asset-manager/src/app/(auth)/layout.tsx 2>/dev/null || echo 'no auth layout'"))

# 4. Restart
print(run("systemctl restart asset-manager && sleep 6 && echo 'RESTARTED'", timeout=30))

# 5. Verify
print("\n=== Verify ===")
print(run("ls /opt/asset-manager/src/app/page.tsx 2>/dev/null || echo 'root page DELETED (OK)'"))
print(run("ls /opt/asset-manager/src/app/(dashboard)/page.tsx 2>/dev/null && echo 'dashboard EXISTS (OK)'"))
print(run("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000/ 2>/dev/null"))
print(run("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000/login 2>/dev/null"))

c.close()
