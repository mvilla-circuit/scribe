# Scribe

A minimalist, zen desktop writing app. Scribe is a [Tauri](https://tauri.app) (Rust) + React + TypeScript application with a Supabase backend and Google sign-in.

## Stack

- **Shell**: Tauri 2 (macOS overlay titlebar)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4 with CSS-variable design tokens (light/dark/system theming, chosen from the sidebar settings menu)
- **State**: Zustand (UI/layout state, persisted to `localStorage`)
- **Backend/Auth**: Supabase (Postgres + Google OAuth via PKCE)

## Prerequisites

- [Node.js](https://nodejs.org) (with `npm`)
- [Rust](https://www.rust-lang.org/tools/install) toolchain (for Tauri)
- A [Supabase](https://supabase.com) project with Google auth enabled

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env.local` in the project root with your Supabase project credentials:

   ```sh
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. **Configure the OAuth redirect URL.** Sign-in uses a localhost loopback
   server (see [Authentication](#authentication)). In the Supabase dashboard go
   to **Authentication → URL Configuration → Redirect URLs** and add:

   ```
   http://localhost:1421
   ```

   This is required for both development and production builds.

## Development

Run the app in development mode (Vite + the Tauri shell, with HMR):

```sh
npm run tauri dev
```

## Build

Produce a distributable desktop bundle:

```sh
npm run tauri build
```

## Scripts

- `npm run tauri dev` — run the desktop app in development
- `npm run tauri build` — build the desktop app
- `npm run dev` — run the Vite frontend only (in a browser)
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — type-check the frontend

## Authentication

Scribe signs in with Google through Supabase using the PKCE flow. Because
OAuth providers don't allow custom URI schemes as redirect targets and macOS
routes custom schemes to a registered `.app` bundle (which breaks under
`tauri dev`), Scribe uses a **localhost loopback** instead:

1. On sign-in, [`tauri-plugin-oauth`](https://github.com/FabianLars/tauri-plugin-oauth)
   starts a temporary local server on port **1421**.
2. The system browser opens the Google consent screen.
3. Supabase redirects back to `http://localhost:1421`, which the same running
   app instance captures — so the PKCE verifier matches and the code exchange
   succeeds.

This works identically in development and production.

## Project structure

```
src/
  components/      App shell: AppShell, Sidebar, MainEmptyState, AuthScreen
    ui/            Reusable primitives (Avatar, DropdownMenu, Dialog, Tooltip, …)
  theme/           ThemeProvider (light/dark/system)
  store/           Zustand UI state (sidebar, selection)
  data/            React Query hooks for books/folders
  lib/             Supabase client, auth provider, generated DB types
  index.css        Design tokens (CSS variables) + Tailwind setup
src-tauri/         Tauri (Rust) shell, config, and capabilities
```

- Table menu might need to be reorganized
- Sidebar collapsed state
- Fix column blocks

- Add sane linting rules
- Commit changes
- Fix all lint warnings and errors
- Review code (refactor as necessary)
- Add tests