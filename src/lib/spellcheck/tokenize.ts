/** A word found in a run of text, with its half-open `[from, to)` char range. */
export interface WordToken {
  word: string;
  from: number;
  to: number;
}

// Spans we never want to spell-check, matched first so their inner "words"
// (e.g. the `example`/`com` in a URL) are excluded wholesale: http(s):// and
// bare `www.` links, plus anything that looks like an email address.
const SKIP_RE = /(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+/gi;

// A contiguous run of letters/digits with internal apostrophes — one candidate
// token. Runs starting with a letter/digit can't begin with an apostrophe, so
// contractions ("don't") stay whole while surrounding quotes fall away.
const TOKEN_RE = /[A-Za-z0-9]+(?:['\u2019][A-Za-z0-9]+)*/g;

/**
 * Splits a run of plain text into checkable word tokens, each with its char
 * offset back into the source string. Numbers and alphanumeric tokens (e.g.
 * `abc123`, `3rd`), URLs, and email addresses are dropped so only real words
 * are handed to the spell checker. Callers are responsible for excluding text
 * that carries a `code` mark or lives in a code block.
 */
export function tokenize(text: string): WordToken[] {
  const excluded: [number, number][] = [];
  for (const match of text.matchAll(SKIP_RE)) {
    const start = match.index;
    excluded.push([start, start + match[0].length]);
  }
  const isExcluded = (from: number, to: number): boolean =>
    excluded.some(([start, end]) => from < end && to > start);

  const tokens: WordToken[] = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    const word = match[0];
    const from = match.index;
    const to = from + word.length;
    // Drop pure numbers and mixed alphanumerics, and anything inside a URL/email.
    if (/[0-9]/.test(word)) continue;
    if (isExcluded(from, to)) continue;
    tokens.push({ word, from, to });
  }
  return tokens;
}
