---
name: using-git-worktrees
description: >-
  Project overlay for git worktree setup in Scribe. Create worktrees with
  git-worktree-add.sh so `.env.local` is synced, then install deps before
  running the app.
---

# Using Git Worktrees (Scribe)

Follow the general worktree workflow from Superpowers / your platform, but
**create Scribe worktrees with the repo wrapper** so `.env.local` is copied
from the primary checkout. Husky cannot auto-copy on a fresh
`git worktree add` (`.husky/_` is missing until `npm install`).

## Create a worktree

From the primary checkout (or any checkout that has the scripts):

```bash
./scripts/git-worktree-add.sh .worktrees/<name> -b <branch> main
```

Same path/rev arguments as `git worktree add`.

If the worktree already exists without `.env.local`:

```bash
./scripts/sync-worktree-env.sh                  # from inside the worktree
./scripts/sync-worktree-env.sh .worktrees/<name>  # from the primary checkout
```

## Project setup

```bash
# From the new worktree root
./scripts/sync-worktree-env.sh   # no-op if already copied
npm install
```

Do not commit `.env.local`.
