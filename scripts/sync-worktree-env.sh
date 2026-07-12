#!/usr/bin/env bash
# Copy `.env.local` from the primary checkout into a linked worktree when
# missing. Idempotent: never overwrites an existing file.
#
# Usage:
#   ./scripts/sync-worktree-env.sh           # sync into the current worktree
#   ./scripts/sync-worktree-env.sh <path>    # sync into <path> (from primary)
set -euo pipefail

dest_root=""
if [[ $# -ge 1 ]]; then
  if [[ ! -d "$1" ]]; then
    echo "sync-worktree-env: not a directory: $1" >&2
    exit 1
  fi
  dest_root="$(cd "$1" && pwd)"
elif git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  dest_root="$(git rev-parse --show-toplevel)"
else
  exit 0
fi

if ! git -C "$dest_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

common_dir="$(cd "$(git -C "$dest_root" rev-parse --git-common-dir)" && pwd)"
main_root="$(dirname "$common_dir")"

src="$main_root/.env.local"
dest="$dest_root/.env.local"

if [[ "$main_root" == "$dest_root" ]]; then
  exit 0
fi
if [[ ! -f "$src" ]]; then
  exit 0
fi
if [[ -f "$dest" ]]; then
  exit 0
fi

cp "$src" "$dest"
echo "sync-worktree-env: copied .env.local into $dest_root"
