#!/usr/bin/env bash
# Create a linked worktree and copy `.env.local` from the primary checkout.
#
# Husky's post-checkout hook cannot run on a fresh `git worktree add` — the
# new tree has no `.husky/_` until `npm install` — so this wrapper is the
# supported way to get env into a new worktree automatically.
#
# Usage (same path/rev args as `git worktree add`):
#   ./scripts/git-worktree-add.sh .worktrees/foo -b feature/foo main
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <path> [<git worktree add args>...]" >&2
  exit 2
fi

path="$1"
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

git -C "$repo_root" worktree add "$@"

# `git -C <repo> worktree add <rel-path>` creates the tree under <repo>.
if [[ "$path" != /* ]]; then
  path="$repo_root/$path"
fi
path="$(cd "$path" && pwd)"

"$script_dir/sync-worktree-env.sh" "$path"
