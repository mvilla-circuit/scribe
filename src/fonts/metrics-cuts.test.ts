import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FONT_REGISTRY, FONT_ROLES } from "./catalog";
import { isLocalFont } from "./loaders/local";
import metrics from "./metrics.json";

function availableWeights(id: string): number[] {
  return readdirSync(resolve("node_modules/@fontsource", id))
    .flatMap((filename) => {
      const match = /^latin-(\d+)\.css$/.exec(filename);
      return match ? Number(match[1]) : [];
    })
    .sort((a, b) => a - b);
}

describe("Fontsource metric cuts", () => {
  it("declares an installed latin stylesheet for every applied metric weight", () => {
    for (const role of FONT_ROLES) {
      for (const [id, { regular, bold }] of Object.entries(metrics[role])) {
        const entry = FONT_REGISTRY[id];
        // Skip role defaults, locals, and platform faces (no Fontsource package).
        if (entry?.system || isLocalFont(id) || !entry?.load) continue;

        const weights = availableWeights(id);
        expect(weights, `${role}/${id} regular`).toContain(regular);
        expect(weights, `${role}/${id} bold`).toContain(bold);
      }
    }
  });
});
