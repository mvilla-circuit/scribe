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

Bundled as **woff2** static cuts under `src/fonts/brand-assets/` for the Scribe
wordmark only (not offered in the user font picker). Personal use only.

### Shipping gate

Vite aliases `@scribe/cardillac-assets` to the real module for `vite` serve /
tests, and to an empty stub for `vite build` unless `VITE_ALLOW_CARDILLAC=true`.
Runtime `isCardillacAllowed()` also skips injection when disallowed.

Commercial / App Store builds must leave `VITE_ALLOW_CARDILLAC` unset. Do not
embed Cardillac without a Hoftype grant — or replace `--font-brand` first.
