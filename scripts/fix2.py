#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace'), e.read().decode('utf-8', errors='replace')

# 1. Delete root page.tsx
out, err = run("rm -f /opt/asset-manager/src/app/page.tsx && echo DELETED")
print(out)

# 2. Write login page via a temp file approach
login_js = '''"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
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
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    React.createElement("div", {className: "flex min-h-screen items-center justify-center bg-gray-50"},
      React.createElement("div", {className: "w-full max-w-sm rounded-lg bg-white p-8 shadow-md"},
        React.createElement("div", {className: "mb-6 text-center"},
          React.createElement("h1", {className: "text-2xl font-bold text-gray-900"}, "IT Asset Manager"),
          React.createElement("p", {className: "mt-1 text-sm text-gray-500"}, "Sign in")
        ),
        React.createElement("form", {onSubmit: handleSubmit, className: "space-y-4"},
          React.createElement("div", null,
            React.createElement("label", {className: "block text-sm font-medium text-gray-700"}, "Username"),
            React.createElement("input", {type: "text", required: true, value: username, onChange: (e) => setUsername(e.target.value),
              className: "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm", placeholder: "admin"})
          ),
          React.createElement("div", null,
            React.createElement("label", {className: "block text-sm font-medium text-gray-700"}, "Password"),
            React.createElement("input", {type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value),
              className: "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm", placeholder: "admin123"})
          ),
          error && React.createElement("div", {className: "rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"}, error),
          React.createElement("button", {type: "submit", disabled: loading,
            className: "w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"},
            loading ? "Signing in..." : "Sign In"
          )
        )
      )
    )
  );
}
'''

# Upload login page
sftp = c.open_sftp()
with open('/tmp/login_page_new.tsx', 'w') as f:
    f.write(login_js)
sftp.put('/tmp/login_page_new.tsx', '/opt/asset-manager/src/app/(auth)/login/page.tsx')
sftp.close()
print("login page written")

# 3. Restart
out, err = run("systemctl restart asset-manager && sleep 8 && echo RESTARTED", timeout=30)
print(out)

# 4. Verify
out, err = run("echo 'root_page:'; ls /opt/asset-manager/src/app/page.tsx 2>/dev/null || echo MISSING; echo 'dashboard_page:'; ls /opt/asset-manager/src/app/\(dashboard\)/page.tsx 2>/dev/null || echo MISSING; echo 'login_page:'; ls /opt/asset-manager/src/app/\(auth\)/login/page.tsx 2>/dev/null || echo MISSING")
print(out)

out, err = run("curl -s -o /dev/null -w 'ROOT_HTTP:%{http_code}' http://localhost:3000/; echo; curl -s -o /dev/null -w 'LOGIN_HTTP:%{http_code}' http://localhost:3000/login")
print(out)

c.close()
