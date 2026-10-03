#!/usr/bin/env bash
# Symlink every skill in ./skills into ~/.claude/skills.
set -euo pipefail

src="$(cd "$(dirname "$0")/skills" && pwd)"
dest="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$dest"

for dir in "$src"/*/; do
  name="$(basename "$dir")"
  target="$dest/$name"

  if [ -L "$target" ]; then
    ln -sfn "${dir%/}" "$target"
    echo "relinked  $name"
  elif [ -e "$target" ]; then
    echo "skipped   $name (exists and is not a symlink)"
  else
    ln -s "${dir%/}" "$target"
    echo "linked    $name"
  fi
done
