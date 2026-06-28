# AGENTS.md — src-tauri

The **Tauri 2 (Rust)** desktop shell: window/titlebar config, native plugins, and
capabilities. See the root [`AGENTS.md`](../AGENTS.md) for repo-wide conventions.

## Area-specific rules

- **Format**: `npm run rust:fmt` (or `cargo fmt --manifest-path src-tauri/Cargo.toml`).
  CI runs `cargo fmt --all --check`, so format before committing. Config is in
  `rustfmt.toml`.
- **Lint**: `npm run rust:lint` runs Clippy with `-D warnings` (warnings fail).
- **Toolchain**: pinned by `rust-toolchain.toml`; use `rustup show` to install the
  pinned toolchain + components. Don't hardcode a different version.
- **Capabilities/permissions**: the app's permission set lives in `capabilities/`.
  When adding a plugin or a command that needs a new permission, declare it there.
- **Don't double-build the frontend**: `tauri build` runs the Vite build
  automatically via `beforeBuildCommand` in `tauri.conf.json`. Use
  `npm run tauri dev` / `npm run tauri build` rather than building the frontend
  separately as part of a Tauri build.
- **Generated/vendored**: `gen/` and `target/` are build output — don't edit them.
