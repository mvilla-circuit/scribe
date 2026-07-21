# Local Font Licenses

## Fontshare families

Bespoke Serif, Bespoke Slab, Bespoke Sans, Erode, Gambetta, Recia, Rowan,
Sentient, Zodiak, Chubbo, Neco, Amulya, General Sans, Satoshi, Supreme,
Switzer, Tabular, Frygia, and Industry are distributed by Fontshare under its
free commercial-use license. Their terms permit personal and commercial use,
including embedding in applications; retain the license information when
redistributing these font files.

Source and current terms: <https://www.fontshare.com/licenses>.

## Cardillac

Cardillac is copyright © 2018 Dieter Hofrichter / Hoftype
(<https://www.hoftype.com>).

Bundled as **woff2** static cuts for the Scribe wordmark only (not offered in
the user font picker). These files are for **personal use in this project**.

### Shipping gate

Cardillac assets load only when `isCardillacAllowed()` is true:

- Vite **DEV** (local `npm run tauri dev` / `npm run dev`), or
- `VITE_ALLOW_CARDILLAC=true` in the build env (personal production builds)

Commercial / App Store / public redistribution builds must leave
`VITE_ALLOW_CARDILLAC` unset or set it to `false`. Do not embed Cardillac
without a commercial grant from Hoftype — or replace `--font-brand` first.
