#!/usr/bin/env bash
# Create a linked worktree and copy `.env.local` from the primary checkout.
#
# Husky's post-checkout hook cannot run on a fresh `git worktree add` — the
# new tree has no `.husky/_` until `npm install` — so this wrapper is the
# supported way to get env into a new worktree automatically.
#
# Usage (same args as `git worktree add`; run from inside the repo):
#   ./scripts/git-worktree-add.sh .worktrees/foo -b feature/foo main
#   ./scripts/git-worktree-add.sh -b feature/foo .worktrees/foo main
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <git worktree add args...>" >&2
  echo "  examples:" >&2
  echo "    $0 .worktrees/foo -b feature/foo main" >&2
  echo "    $0 -b feature/foo .worktrees/foo main" >&2
  exit 2
fi

# Find <path> the same way git does: first non-option argument, skipping
# options that take a separate value (-b/-B/--reason).
path=""
args=("$@")
i=0
while ((i < ${#args[@]})); do
  arg="${args[i]}"
  case "$arg" in
    --)
      i=$((i + 1))
      if ((i < ${#args[@]})); then
        path="${args[i]}"
      fi
      break
      ;;
    -b | -B | --reason)
      i=$((i + 2))
      ;;
    --reason=*)
      i=$((i + 1))
      ;;
    -*)
      i=$((i + 1))
      ;;
    *)
      path="$arg"
      break
      ;;
  esac
done

if [[ -z "$path" ]]; then
  echo "usage: $0 <git worktree add args...>  (could not find <path>)" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"

# Run from the caller's cwd so relative <path> matches plain `git worktree add`.
git worktree add "$@"

path="$(cd -- "$path" && pwd)"

"$script_dir/sync-worktree-env.sh" "$path"
