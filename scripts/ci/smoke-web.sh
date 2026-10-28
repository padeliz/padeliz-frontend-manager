#!/usr/bin/env bash
# Post-deploy smoke: HTTP 200, not nginx welcome, expected app marker present.
# Env: SMOKE_URL (required), SMOKE_MARKER (required)
# Optional: SMOKE_ATTEMPTS (default 18), SMOKE_SLEEP_SECONDS (default 10) ≈ 3 min

set -euo pipefail

: "${SMOKE_URL:?SMOKE_URL is required}"
: "${SMOKE_MARKER:?SMOKE_MARKER is required}"

ATTEMPTS="${SMOKE_ATTEMPTS:-18}"
SLEEP_SECONDS="${SMOKE_SLEEP_SECONDS:-10}"
NGINX_NEEDLE="Welcome to nginx"

echo "Smoke: ${SMOKE_URL} (marker=${SMOKE_MARKER}, attempts=${ATTEMPTS}, sleep=${SLEEP_SECONDS}s)"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  code="$(curl -sS -L --max-time 30 -o "$tmp" -w "%{http_code}" "$SMOKE_URL" || true)"
  body="$(cat "$tmp" 2>/dev/null || true)"

  if [ "$code" = "200" ] \
    && ! printf '%s' "$body" | grep -Fq "$NGINX_NEEDLE" \
    && printf '%s' "$body" | grep -Fq "$SMOKE_MARKER"; then
    echo "Smoke OK (attempt ${i}/${ATTEMPTS}, HTTP ${code})"
    exit 0
  fi

  if [ "$i" -lt "$ATTEMPTS" ]; then
    echo "Attempt ${i}/${ATTEMPTS}: HTTP ${code}; retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
  else
    echo "Attempt ${i}/${ATTEMPTS}: HTTP ${code}"
  fi
  i=$((i + 1))
done

echo "Smoke FAILED after ${ATTEMPTS} attempts"
echo "Last HTTP status: ${code:-unknown}"
if printf '%s' "${body:-}" | grep -Fq "$NGINX_NEEDLE"; then
  echo "Response still looks like the default nginx welcome page."
fi
if ! printf '%s' "${body:-}" | grep -Fq "$SMOKE_MARKER"; then
  echo "Response missing expected marker: ${SMOKE_MARKER}"
fi
exit 1
