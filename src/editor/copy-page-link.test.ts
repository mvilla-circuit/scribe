import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyPageLink } from "./copy-page-link";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("copyPageLink", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("copies a page ref and toasts", async () => {
    await copyPageLink("document", "11111111-1111-1111-1111-111111111111");
    expect(writeText).toHaveBeenCalledWith(
      "scribe://page/11111111-1111-1111-1111-111111111111",
    );
    expect(toast.success).toHaveBeenCalledWith("Link copied");
  });

  it("copies a book ref", async () => {
    await copyPageLink("book", "22222222-2222-2222-2222-222222222222");
    expect(writeText).toHaveBeenCalledWith(
      "scribe://book/22222222-2222-2222-2222-222222222222",
    );
    expect(toast.success).toHaveBeenCalledWith("Link copied");
  });

  it("toasts an error when the clipboard write fails", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    await expect(copyPageLink("document", "doc-1")).resolves.toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("Couldn't copy link");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
