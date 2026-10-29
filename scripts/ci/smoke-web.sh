#!/usr/bin/env bash
# Post-deploy smoke for Expo web on App Platform.
# Pass: HTTP 200, Content-Type text/html, not nginx welcome, Expo shell signal.
# Env: SMOKE_URL (required)
# Optional: SMOKE_ATTEMPTS (default 18), SMOKE_SLEEP_SECONDS (default 10) ≈ 3 min

set -euo pipefail

: "${SMOKE_URL:?SMOKE_URL is required}"

ATTEMPTS="${SMOKE_ATTEMPTS:-18}"
SLEEP_SECONDS="${SMOKE_SLEEP_SECONDS:-10}"
NGINX_NEEDLE="Welcome to nginx"
EXPO_HYDRATE="__EXPO_ROUTER_HYDRATE__"
EXPO_STATIC="/_expo/static/"

echo "Smoke: ${SMOKE_URL} (attempts=${ATTEMPTS}, sleep=${SLEEP_SECONDS}s)"

headers="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$headers" "$body"' EXIT

smoke_ok() {
  local code="$1"
  local ctype="$2"
  local html="$3"

  [[ "$code" == "200" ]] || return 1
  printf '%s' "$ctype" | grep -qi 'text/html' || return 1
  ! printf '%s' "$html" | grep -Fq "$NGINX_NEEDLE" || return 1
  printf '%s' "$html" | grep -Fq "$EXPO_HYDRATE" \
    || printf '%s' "$html" | grep -Fq "$EXPO_STATIC" \
    || return 1
  return 0
}

i=1
code=""
ctype=""
html=""
while [[ "$i" -le "$ATTEMPTS" ]]; do
  : >"$headers"
  : >"$body"
  code="$(curl -sS -L --max-time 30 -D "$headers" -o "$body" -w "%{http_code}" "$SMOKE_URL" || true)"
  html="$(cat "$body" 2>/dev/null || true)"
  ctype="$(awk 'BEGIN{IGNORECASE=1} tolower($0) ~ /^content-type:/ {sub(/\r$/,""); sub(/^[^:]*:[[:space:]]*/,""); print; exit}' "$headers")"

  if smoke_ok "$code" "$ctype" "$html"; then
    echo "Smoke OK (attempt ${i}/${ATTEMPTS}, HTTP ${code}, Content-Type=${ctype})"
    exit 0
  fi

  if [[ "$i" -lt "$ATTEMPTS" ]]; then
    echo "Attempt ${i}/${ATTEMPTS}: HTTP ${code}; Content-Type=${ctype:-unknown}; retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
  else
    echo "Attempt ${i}/${ATTEMPTS}: HTTP ${code}; Content-Type=${ctype:-unknown}"
  fi
  i=$((i + 1))
done

echo "Smoke FAILED after ${ATTEMPTS} attempts"
echo "Last HTTP status: ${code:-unknown}"
echo "Last Content-Type: ${ctype:-unknown}"
if [[ "${code:-}" != "200" ]]; then
  echo "Expected HTTP 200."
fi
if ! printf '%s' "${ctype:-}" | grep -qi 'text/html'; then
  echo "Expected Content-Type to include text/html."
fi
if printf '%s' "${html:-}" | grep -Fq "$NGINX_NEEDLE"; then
  echo "Response still looks like the default nginx welcome page."
fi
if ! printf '%s' "${html:-}" | grep -Fq "$EXPO_HYDRATE" \
  && ! printf '%s' "${html:-}" | grep -Fq "$EXPO_STATIC"; then
  echo "Response missing Expo web shell signal (${EXPO_HYDRATE} or ${EXPO_STATIC})."
fi
exit 1
