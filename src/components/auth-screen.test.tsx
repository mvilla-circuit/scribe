import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthScreen } from "./auth-screen";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ signInWithGoogle: vi.fn() }),
}));

describe("AuthScreen", () => {
  it("renders the sign-in CTA as a button", () => {
    render(<AuthScreen />);

    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("does not use a raw shadow-sm on the card", () => {
    render(<AuthScreen />);

    expect(document.body.innerHTML).not.toContain("shadow-sm");
  });
});
