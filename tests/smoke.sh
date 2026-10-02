#!/data/data/com.termux/files/usr/bin/bash
# Smoke test — verifies the deployed site is healthy

SITE="${1:-https://naomimusicrsa.co.za}"
PASS=0
FAIL=0
FAILURES=()

check() {
  local desc="$1"
  local condition="$2"
  if [ "$condition" = "1" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc"
    FAIL=$((FAIL + 1))
    FAILURES+=("$desc")
  fi
}

echo "=== Smoke test: $SITE ==="
echo ""

# 1. Homepage returns 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/")
check "Homepage returns 200 (got $STATUS)" "$([ "$STATUS" = "200" ] && echo 1 || echo 0)"

# 2. Has HTML title
TITLE=$(curl -s "$SITE/" | grep -o "<title>[^<]*</title>" | head -1)
check "Homepage has <title>" "$([ -n "$TITLE" ] && echo 1 || echo 0)"

# 3. JS bundle loads
BUNDLE=$(curl -s "$SITE/" | grep -o 'assets/[^"]*\.js' | head -1)
BUNDLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/$BUNDLE")
check "JS bundle loads ($BUNDLE → $BUNDLE_STATUS)" "$([ "$BUNDLE_STATUS" = "200" ] && echo 1 || echo 0)"

# 4. Bundle has env vars baked in
if [ -n "$BUNDLE" ]; then
  APPWRITE_URL=$(curl -s "$SITE/$BUNDLE" | grep -c "syd.cloud.appwrite.io")
  check "Bundle has APPWRITE endpoint" "$([ "$APPWRITE_URL" -gt 0 ] && echo 1 || echo 0)"

  MESSAGES_ID=$(curl -s "$SITE/$BUNDLE" | grep -c "6ab4e2210008fddba200")
  check "Bundle has messages table ID" "$([ "$MESSAGES_ID" -gt 0 ] && echo 1 || echo 0)"
fi

# 5. robots.txt
ROBOTS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/robots.txt")
check "robots.txt serves" "$([ "$ROBOTS" = "200" ] && echo 1 || echo 0)"

# 6. sitemap.xml
SITEMAP=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/sitemap.xml")
check "sitemap.xml serves" "$([ "$SITEMAP" = "200" ] && echo 1 || echo 0)"

# 7. manifest
MANIFEST=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/manifest.webmanifest")
check "manifest.webmanifest serves" "$([ "$MANIFEST" = "200" ] && echo 1 || echo 0)"

# 8. service worker
SW=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/sw.js")
check "sw.js serves" "$([ "$SW" = "200" ] && echo 1 || echo 0)"

# 9. favicon
FAV=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/favicon.svg")
check "favicon.svg serves" "$([ "$FAV" = "200" ] && echo 1 || echo 0)"

# 10. HTTPS is enforced
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://naomimusicrsa.co.za" 2>/dev/null)
check "HTTP redirects to HTTPS or serves (got $HTTP_STATUS)" "$([ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "308" ] && echo 1 || echo 0)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failed:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
