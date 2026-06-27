import { CircleCheck, CircleX } from "lucide-react";
import { Toaster as SonnerToaster } from "sonner";

import { useTheme } from "@/theme/theme";

// Sonner toasts themed to our CSS tokens so feedback surfaces match the rest of
// the chrome in both light and dark. Success toasts read green with a check,
// errors a muted red — the variant styling lives in index.css under
// `.scribe-toast`, keyed off Sonner's `data-type`. Custom Lucide icons keep the
// glyphs consistent with the app's icon set.
export function Toaster() {
  const { resolved } = useTheme();

  return (
    <SonnerToaster
      theme={resolved}
      position="top-right"
      gap={8}
      icons={{
        success: <CircleCheck size={18} strokeWidth={2.25} />,
        error: <CircleX size={18} strokeWidth={2.25} />,
      }}
      toastOptions={{ className: "scribe-toast" }}
    />
  );
}
