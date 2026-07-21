import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  profileFonts,
  useProfile,
  useUpdateProfileFonts,
} from "@/data/profile";
import { DEFAULT_FONT_ID, type FontRole } from "@/fonts/catalog";
import { displayTitleStyle } from "@/fonts/display-title-style";

import { FontPicker } from "./font-picker";

const ROLE_META: { role: FontRole; label: string; hint: string }[] = [
  { role: "display", label: "Display", hint: "Titles and headlines" },
  { role: "text", label: "Text", hint: "Body and reading" },
  { role: "code", label: "Code", hint: "Inline code and code blocks" },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The Typography settings surface: a global font for each of the three
// reading-surface roles (Display / Text / Code), with a live preview. The
// chosen fonts drive every book and page unless overridden; the app chrome
// stays on the system font regardless.
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: profile } = useProfile();
  const fonts = profileFonts(profile);
  const updateFonts = useUpdateProfileFonts();

  const setRole = (role: FontRole, fontId: string) => {
    updateFonts.mutate({ ...fonts, [role]: fontId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* No overflow/scroll on the dialog body on purpose: the font pickers
          render inline (not portaled) so their lists stay scrollable inside the
          dialog, and an overflow container here would clip those open popovers.
          The content is compact enough to fit without dialog-level scrolling. */}
      <DialogContent className="w-[min(34rem,calc(100vw-2rem))]">
        <DialogTitle>Typography</DialogTitle>
        <DialogDescription>
          Pick a font for each role on your reading surface. The app interface
          always stays on the system font.
        </DialogDescription>

        <div className="mt-5 space-y-3.5">
          {ROLE_META.map(({ role, label, hint }) => (
            <div
              key={role}
              className="grid grid-cols-[7.5rem_1fr] items-center gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{label}</p>
                <p className="text-xs leading-tight text-muted">{hint}</p>
              </div>
              <FontPicker
                role={role}
                value={fonts[role] ?? DEFAULT_FONT_ID[role]}
                onSelect={(id) => {
                  setRole(role, id);
                }}
              />
            </div>
          ))}
        </div>

        <FontPreview />
      </DialogContent>
    </Dialog>
  );
}

// A live sample of the three roles together, styled with the global role
// variables so it updates the instant a font is chosen.
function FontPreview() {
  return (
    <section className="mt-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Preview
      </p>
      <div className="rounded-lg border border-border bg-bg p-5">
        <p className="text-text" style={displayTitleStyle()}>
          The Voyage Begins
        </p>
        <p
          className="mt-3 text-text"
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--font-text-size)",
            fontWeight: "var(--font-text-regular)",
            lineHeight: "var(--font-text-line)",
            letterSpacing: "var(--font-text-spacing)",
          }}
        >
          Body text sets the pace of a long read. It should feel{" "}
          <strong style={{ fontWeight: "var(--font-text-bold)" }}>
            comfortably solid
          </strong>{" "}
          in bold and <em className="italic">gracefully slanted</em> in italics
          — never synthesized.
        </p>
        <p
          className="mt-3 text-text"
          style={{
            fontFamily: "var(--font-code)",
            fontSize: "var(--font-code-size)",
            fontWeight: "var(--font-code-regular)",
            lineHeight: "var(--font-code-line)",
            letterSpacing: "var(--font-code-spacing)",
          }}
        >
          const greet = (name) =&gt; "Hello, " + name;
        </p>
      </div>
    </section>
  );
}
