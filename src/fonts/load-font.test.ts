import { describe, expect, it, vi } from "vitest";

// Build a fake catalog so we control which ids have a loader and can count how
// often each loader runs, without importing the real (heavy) @fontsource CSS.
const mocks = vi.hoisted(() => {
  const cacheLoad = vi.fn(() => Promise.resolve());
  const concurrentLoad = vi.fn(() => Promise.resolve());
  const failLoad = vi.fn(() => Promise.reject(new Error("offline")));
  const aliasLoad = vi.fn(() => Promise.resolve());

  const registry: Record<
    string,
    {
      id: string;
      family: string;
      stack: string;
      system?: boolean;
      load?: () => Promise<void>;
    }
  > = {
    "system-serif": {
      id: "system-serif",
      family: "System Serif",
      stack: "system-stack",
      system: true,
    },
    "web-cache": {
      id: "web-cache",
      family: "Cache",
      stack: "cache-stack",
      load: cacheLoad,
    },
    "web-concurrent": {
      id: "web-concurrent",
      family: "Concurrent",
      stack: "concurrent-stack",
      load: concurrentLoad,
    },
    "web-fail": {
      id: "web-fail",
      family: "Fail",
      stack: "fail-stack",
      load: failLoad,
    },
    "web-ready": {
      id: "web-ready",
      family: "Ready",
      stack: "ready-stack",
      load: () => Promise.resolve(),
    },
    "web-alias-target": {
      id: "web-alias-target",
      family: "Alias",
      stack: "alias-stack",
      load: aliasLoad,
    },
  };

  return { cacheLoad, concurrentLoad, failLoad, aliasLoad, registry };
});

vi.mock("./catalog", () => ({
  FONT_REGISTRY: mocks.registry,
  FONT_ROLES: ["display", "text", "code"],
  resolveFontEntry: (fontId: string | undefined, role: string) =>
    (fontId && mocks.registry[fontId]) || { stack: `default-${role}` },
}));

vi.mock("./aliases", () => ({
  canonicalizeFontId: (fontId: string) =>
    fontId === "legacy-web" ? "web-alias-target" : fontId,
  FONT_ALIASES: { "legacy-web": "web-alias-target" },
}));

const {
  ensureFontLoaded,
  ensureFontReady,
  fontStackFor,
  fontVarsFor,
  isFontLoaded,
} = await import("./load-font");
describe("fontStackFor", () => {
  it("returns the resolved entry's stack for a known id", () => {
    expect(fontStackFor("web-cache", "text")).toBe("cache-stack");
  });

  it("returns the role default stack for an unknown id", () => {
    expect(fontStackFor("nope", "display")).toBe("default-display");
    expect(fontStackFor(undefined, "code")).toBe("default-code");
  });
});

describe("fontVarsFor", () => {
  it("emits stacks and optical metrics for every resolved role", () => {
    expect(
      fontVarsFor({
        display: "web-cache",
        text: "web-concurrent",
        code: "web-fail",
      }),
    ).toMatchObject({
      "--font-display": "cache-stack",
      "--font-text": "concurrent-stack",
      "--font-code": "fail-stack",
      "--font-display-size": "50px",
      "--font-display-regular": "400",
      "--font-display-bold": "700",
      "--font-display-line": "1.42",
      "--font-display-spacing": "-0.01em",
      "--font-text-size": "16px",
      "--font-text-regular": "400",
      "--font-text-bold": "700",
      "--font-text-line": "1.55",
      "--font-text-spacing": "0em",
      "--font-code-size": "16px",
      "--font-code-regular": "400",
      "--font-code-bold": "700",
      "--font-code-line": "1.55",
      "--font-code-spacing": "0em",
    });
  });
});

describe("isFontLoaded", () => {
  it("is true for system fonts that need no loader", () => {
    expect(isFontLoaded("system-serif")).toBe(true);
  });

  it("is false for web fonts until ensureFontLoaded succeeds", async () => {
    expect(isFontLoaded("web-ready")).toBe(false);
    await ensureFontLoaded("web-ready");
    expect(isFontLoaded("web-ready")).toBe(true);
  });
});

describe("ensureFontReady", () => {
  it("waits for document.fonts cuts after CSS loads", async () => {
    const load = vi.fn(() => Promise.resolve([] as FontFace[]));
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load },
    });

    await expect(ensureFontReady("web-ready", [400, 700])).resolves.toBe(true);
    expect(load).toHaveBeenCalledWith('400 16px "Ready"');
    expect(load).toHaveBeenCalledWith('italic 400 16px "Ready"');
    expect(load).toHaveBeenCalledWith('700 16px "Ready"');
    expect(load).toHaveBeenCalledWith('italic 700 16px "Ready"');
  });

  it("returns false when the CSS loader fails", async () => {
    await expect(ensureFontReady("web-fail")).resolves.toBe(false);
  });

  it("returns false when document.fonts.load rejects", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        load: vi.fn(() => Promise.reject(new Error("decode failed"))),
      },
    });

    await expect(ensureFontReady("web-ready", [400])).resolves.toBe(false);
  });
});

describe("ensureFontLoaded", () => {
  it("resolves immediately for system fonts without a loader", async () => {
    await expect(ensureFontLoaded("system-serif")).resolves.toBeUndefined();
  });
  it("resolves immediately for ids missing from the registry", async () => {
    await expect(ensureFontLoaded("unknown-id")).resolves.toBeUndefined();
  });

  it("loads a web font once and caches it for later calls", async () => {
    await ensureFontLoaded("web-cache");
    await ensureFontLoaded("web-cache");
    expect(mocks.cacheLoad).toHaveBeenCalledTimes(1);
  });

  it("loads the successor when given a legacy alias id", async () => {
    await ensureFontLoaded("legacy-web");
    expect(mocks.aliasLoad).toHaveBeenCalledTimes(1);
  });

  it("de-dupes concurrent loads of the same font", async () => {
    const a = ensureFontLoaded("web-concurrent");
    const b = ensureFontLoaded("web-concurrent");
    await Promise.all([a, b]);
    expect(mocks.concurrentLoad).toHaveBeenCalledTimes(1);
  });

  it("swallows loader failures so the UI can fall back", async () => {
    mocks.failLoad.mockClear();
    await expect(ensureFontLoaded("web-fail")).resolves.toBeUndefined();
    expect(mocks.failLoad).toHaveBeenCalledTimes(1);
  });
});
