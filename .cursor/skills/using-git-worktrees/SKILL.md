---
name: using-git-worktrees
description: >-
  Project overlay for git worktree setup in Scribe. After creating an isolated
  worktree, sync `.env.local` and install deps before running the app.
---

# Using Git Worktrees (Scribe)

Follow the general worktree workflow from Superpowers / your platform. After the
worktree exists, run this **Project Setup** before `npm run tauri dev` or
`npm run dev`:

```bash
# From the new worktree root
./scripts/sync-worktree-env.sh
npm install
```

`./scripts/sync-worktree-env.sh` is a no-op when `.env.local` already exists or
when you are in the primary checkout. The Husky `post-checkout` hook usually
runs the same script during `git worktree add`; call it manually if the file is
still missing.

Do not commit `.env.local`.
