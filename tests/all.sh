#!/data/data/com.termux/files/usr/bin/bash
# Runs all tests. Pass --live to skip the local build test.

cd "$(dirname "$0")/.." || exit 1

TOTAL_PASS=0
TOTAL_FAIL=0

run_suite() {
  local name="$1"
  local script="$2"
  echo ""
  echo "==============================================="
  echo "  $name"
  echo "==============================================="
  bash "$script"
  if [ $? -eq 0 ]; then
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
}

if [ "$1" != "--live" ]; then
  run_suite "BUILD" "tests/build.sh"
fi

run_suite "FUNCTION" "tests/function.sh"

run_suite "SMOKE" "tests/smoke.sh"

echo ""
echo "==============================================="
echo "  Summary"
echo "==============================================="
echo "  Suites passed: $TOTAL_PASS"
echo "  Suites failed: $TOTAL_FAIL"

if [ "$TOTAL_FAIL" -gt 0 ]; then
  exit 1
fi
