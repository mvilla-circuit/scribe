import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "scribe-theme";
const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

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
  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}

function applyResolved(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// Apply the persisted theme before React mounts to avoid a flash of the wrong theme.
// eslint-disable-next-line react-refresh/only-export-components -- This module pairs the ThemeProvider component with this pre-mount helper by design.
export function initTheme() {
  applyResolved(resolveMode(readStoredMode()));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    resolveMode(readStoredMode()),
  );

  // Reflect the resolved theme to the DOM whenever it changes — the single place
  // that mutates the root class, so every path (initial mount, setMode, and OS
  // changes) goes through one apply.
  useEffect(() => {
    applyResolved(resolved);
  }, [resolved]);

  // While in `system`, follow OS changes by updating `resolved` (the effect
  // above applies it to the DOM).
  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia(COLOR_SCHEME_QUERY);
    const onChange = () => {
      setResolved(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
    setResolved(resolveMode(next));
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- The theme context hook intentionally ships alongside its ThemeProvider component.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
