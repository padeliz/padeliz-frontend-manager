#!/usr/bin/env bash
# Write public/robots.txt for Expo web export (build-time).
# Manager is never search-indexable; always Disallow + AI blocks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public"

cat > "$ROOT/public/robots.txt" <<'EOF'
User-agent: *
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
EOF

echo "write-robots: manager Disallow + AI blocks → public/robots.txt"
