#!/usr/bin/env bash
# Copy `.env.local` from the primary checkout into the current worktree when
# missing. Idempotent: never overwrites an existing file. Safe to run from the
# primary checkout (no-op) or any linked worktree.
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

toplevel="$(git rev-parse --show-toplevel)"
common_dir="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
main_root="$(dirname "$common_dir")"

src="$main_root/.env.local"
dest="$toplevel/.env.local"

if [[ "$main_root" == "$toplevel" ]]; then
  exit 0
fi
if [[ ! -f "$src" ]]; then
  exit 0
fi
if [[ -f "$dest" ]]; then
  exit 0
fi

cp "$src" "$dest"
echo "sync-worktree-env: copied .env.local from $main_root"
