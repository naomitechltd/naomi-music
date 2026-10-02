#!/data/data/com.termux/files/usr/bin/bash
# Build test — verifies local npm run build produces all expected files

cd "$(dirname "$0")/.." || exit 1

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

echo "=== Build test ==="
echo ""

# 1. function syntax
node --check functions/api/src/main.js 2>/dev/null
check "Function syntax valid" "$([ $? -eq 0 ] && echo 1 || echo 0)"

# 2. npm run build
echo "  (running npm run build — this takes ~10s)"
BUILD_OUT=$(npm run build 2>&1)
BUILD_STATUS=$?
check "npm run build succeeds" "$([ $BUILD_STATUS -eq 0 ] && echo 1 || echo 0)"

if [ $BUILD_STATUS -ne 0 ]; then
  echo ""
  echo "$BUILD_OUT" | tail -20
  exit 1
fi

# 3. expected dist files
for FILE in index.html robots.txt sitemap.xml manifest.webmanifest sw.js favicon.svg icon-512.svg; do
  check "dist/$FILE exists" "$([ -f "dist/$FILE" ] && echo 1 || echo 0)"
done

# 4. JS bundle exists
JS_COUNT=$(ls dist/assets/*.js 2>/dev/null | wc -l)
check "dist/assets has JS bundle (found $JS_COUNT)" "$([ "$JS_COUNT" -gt 0 ] && echo 1 || echo 0)"

# 5. bundle size sanity check
JS_SIZE=$(stat -c%s dist/assets/*.js 2>/dev/null | head -1)
check "Bundle size < 500KB (got $((${JS_SIZE:-0} / 1024))KB)" "$([ "${JS_SIZE:-0}" -lt 512000 ] && echo 1 || echo 0)"

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
