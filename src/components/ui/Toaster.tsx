import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "../../theme/theme";

// Sonner toasts themed to our CSS tokens so error/feedback surfaces match the
// rest of the chrome in both light and dark.
export function Toaster() {
  const { resolved } = useTheme();

  return (
    <SonnerToaster
      theme={resolved}
      position="bottom-right"
      gap={8}
      toastOptions={{
        style: {
          background: "var(--color-elevated)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-popover)",
          fontSize: "13px",
        },
      }}
    />
  );
}
