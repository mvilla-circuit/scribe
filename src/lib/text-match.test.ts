import { describe, expect, it } from "vitest";

import { matchesNormalizedQuery } from "./text-match";

describe("matchesNormalizedQuery", () => {
  it("matches after trimming and locale-lowercasing the query", () => {
    expect(matchesNormalizedQuery("The Great Gatsby", "  GATSBY  ")).toBe(true);
  });

  it("rejects a query that does not appear in the haystack", () => {
    expect(matchesNormalizedQuery("The Great Gatsby", "moby dick")).toBe(false);
  });

  it("matches everything for an empty or whitespace-only query", () => {
    expect(matchesNormalizedQuery("The Great Gatsby", "")).toBe(true);
    expect(matchesNormalizedQuery("The Great Gatsby", "   ")).toBe(true);
  });
});
