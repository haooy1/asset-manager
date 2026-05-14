#!/bin/bash
rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar2.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null
echo "--- SESSION ---"
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session
echo ""
echo "--- DASHBOARD EXTRACT ---"
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | python3 -c "
import sys, re
html = sys.stdin.read()
# Find visible text > 5 chars
texts = re.findall(r'>([^<]{5,})<', html)
for t in texts[:30]:
    t2 = t.strip()
    if t2 and not t2.startswith('!') and not t2.startswith('/*') and 'script' not in t2:
        print(t2[:80])
"
