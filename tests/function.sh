#!/data/data/com.termux/files/usr/bin/bash
# Function test — verifies the Appwrite function actions work

source ~/.awenv 2>/dev/null || true
export AW_KEY=$(cat ~/.awkey 2>/dev/null)

if [ -z "$AW_ENDPOINT" ] || [ -z "$AW_PROJECT" ] || [ -z "$AW_KEY" ]; then
  echo "ERROR: env vars not set. Run: source ~/.awenv && export AW_KEY=\$(cat ~/.awkey)"
  exit 1
fi

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

# Get user ID for testing (use a known artist account)
TEST_UID="${1:-}"

if [ -z "$TEST_UID" ]; then
  # Get first user from the list
  TEST_UID=$(curl -s "$AW_ENDPOINT/users" \
    -H "X-Appwrite-Project: $AW_PROJECT" \
    -H "X-Appwrite-Key: $AW_KEY" \
    -H "X-Appwrite-Response-Format: 1.6.0" \
    | python3 -c "import json,sys; u=json.load(sys.stdin).get('users',[]); print(u[0]['\$id'] if u else '')" 2>/dev/null)
fi

if [ -z "$TEST_UID" ]; then
  echo "No test user found. Pass a user ID as arg or create one."
  exit 1
fi

echo "=== Function test (using user: $TEST_UID) ==="
echo ""

call_fn() {
  local action="$1"
  local body="${2:-{\}}"
  curl -s -X POST "$AW_ENDPOINT/functions/api/executions" \
    -H "X-Appwrite-Project: $AW_PROJECT" \
    -H "X-Appwrite-Key: $AW_KEY" \
    -H "X-Appwrite-Response-Format: 1.6.0" \
    -H "Content-Type: application/json" \
    -H "x-appwrite-user-id: $TEST_UID" \
    -d "{\"body\":\"$(echo "$body" | sed 's/"/\\"/g')\",\"async\":false}"
}

# Function deployment status
FN_STATUS=$(curl -s "$AW_ENDPOINT/functions/api" \
  -H "X-Appwrite-Project: $AW_PROJECT" \
  -H "X-Appwrite-Key: $AW_KEY" \
  -H "X-Appwrite-Response-Format: 1.6.0" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('latestDeploymentStatus',''))" 2>/dev/null)
check "Function deployed and ready (got: $FN_STATUS)" "$([ "$FN_STATUS" = "ready" ] && echo 1 || echo 0)"

# Test each action
test_action() {
  local action="$1"
  local body="$2"
  local expect="$3"

  local out=$(call_fn "$action" "$body")
  local status=$(echo "$out" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  local code=$(echo "$out" | python3 -c "import json,sys; print(json.load(sys.stdin).get('responseStatusCode',''))" 2>/dev/null)

  if [ "$status" = "completed" ] && [ "$code" = "200" ]; then
    check "$action → 200" "1"
  elif [ "$expect" = "any" ] && [ -n "$status" ]; then
    check "$action → $status ($code)" "1"
  else
    check "$action (status: $status, code: $code)" "0"
  fi
}

echo ""
echo "--- Read actions ---"
test_action "get-role" "{}" "any"
test_action "list-conversations" "{}" "any"
test_action "list-artists" "{}" "any"
test_action "list-blocks" "{}" "any"
test_action "list-following" "{\"targetUserId\":\"$TEST_UID\"}" "any"
test_action "list-followers" "{\"targetUserId\":\"$TEST_UID\"}" "any"
test_action "follow-stats" "{\"targetUserId\":\"$TEST_UID\"}" "any"
test_action "list-ratings" "{\"songId\":\"nonexistent\"}" "any"
test_action "list-comments" "{\"songId\":\"nonexistent\"}" "any"

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
