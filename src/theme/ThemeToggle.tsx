import { useTheme, type ThemeMode } from "./theme";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex w-full rounded-lg border border-border bg-bg p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(opt.value)}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              active
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
