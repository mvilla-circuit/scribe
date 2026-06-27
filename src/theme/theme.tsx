import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "scribe-theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}

function applyResolved(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// Apply the persisted theme before React mounts to avoid a flash of the wrong theme.
// eslint-disable-next-line react-refresh/only-export-components
export function initTheme() {
  applyResolved(resolveMode(readStoredMode()));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    resolveMode(readStoredMode()),
  );

  // While in `system`, follow OS changes.
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = media.matches ? "dark" : "light";
      setResolved(next);
      applyResolved(next);
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
    const nextResolved = resolveMode(next);
    setResolved(nextResolved);
    applyResolved(nextResolved);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
