#!/usr/bin/env bash
# One-time setup: installs Playwright, stores the OpenAI key in the macOS Keychain, writes a default config.
#   setup.sh            full setup (asks for the key; Enter skips it)
#   setup.sh status     report what is configured, reveal nothing
#   setup.sh --no-install   skip the Playwright install
set -euo pipefail

SERVICE="${VIDEO_WALKTHROUGH_KEYCHAIN_SERVICE:-video-walkthrough-openai}"
HOME_DIR="${VIDEO_WALKTHROUGH_HOME:-$HOME/.config/video-walkthrough}"
ACCOUNT="${USER:-$(id -un)}"

have_key() { security find-generic-password -s "$SERVICE" >/dev/null 2>&1; }

if [ "${1:-}" = "status" ]; then
  [ -n "${OPENAI_API_KEY:-}" ] && echo "OPENAI_API_KEY: set (wins over Keychain)" || echo "OPENAI_API_KEY: not set"
  have_key && echo "Keychain ($SERVICE): key stored" || echo "Keychain ($SERVICE): no key"
  [ -f "$HOME_DIR/config.toml" ] && echo "config: $HOME_DIR/config.toml" || echo "config: none (default engine: macos)"
  [ -d "$HOME_DIR/node_modules/playwright" ] && echo "playwright: installed" || echo "playwright: missing"
  exit 0
fi

mkdir -p "$HOME_DIR"

if [ "${1:-}" != "--no-install" ]; then
  [ -f "$HOME_DIR/package.json" ] || echo '{"private":true}' > "$HOME_DIR/package.json"
  npm install --silent --prefix "$HOME_DIR" playwright
  "$HOME_DIR/node_modules/.bin/playwright" install chromium
fi

echo
echo "OpenAI API key (platform.openai.com, billed per use; a ChatGPT subscription does not include API access)."
echo "Input is hidden. Press Enter to skip and use the macOS voice."
IFS= read -rs -p "Key: " key || true; echo
if [ -n "$key" ]; then
  # `security -i` reads the command from stdin, so the key never appears in `ps`.
  esc=${key//\\/\\\\}; esc=${esc//\"/\\\"}
  printf 'add-generic-password -U -s "%s" -a "%s" -w "%s"\n' "$SERVICE" "$ACCOUNT" "$esc" | security -i >/dev/null
  unset key esc
  echo "Stored in the Keychain as service '$SERVICE'."
  if [ ! -f "$HOME_DIR/config.toml" ]; then
    cat > "$HOME_DIR/config.toml" <<CFG
# video-walkthrough defaults. Per-call: voice=openai:nova or voice=macos:Sara
engine = "openai"
voice = "coral"
model = "gpt-4o-mini-tts"
instructions = "Speak calmly and naturally."
language = "en"
CFG
    echo "Wrote $HOME_DIR/config.toml"
  fi
else
  have_key && echo "Kept the existing Keychain key." || echo "No key stored; the macos engine is used."
fi
