import type { LucideProps } from "lucide-react";
import { Search } from "lucide-react";
import { useId } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  /** Accessible name for the field; visually hidden unless `hideLabel` is false. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show the label instead of visually hiding it. Defaults to false. */
  hideLabel?: boolean;
  /** Leading icon component, or `null` to omit it. Defaults to the search glyph. */
  icon?: React.ComponentType<LucideProps> | null;
  className?: string;
}

/**
 * Labeled search field: a shared-chrome `Input` with a real `<label>` (hidden
 * by default) for its accessible name and an optional leading icon. Used by
 * the collection and datagrid toolbars so every search box looks and behaves
 * the same.
 */
export function SearchField({
  label,
  value,
  onChange,
  placeholder = "Search",
  hideLabel = true,
  icon: Icon = Search,
  className,
}: SearchFieldProps) {
  const id = useId();

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "mb-1 block text-xs text-muted"}
      >
        {label}
      </label>
      {Icon ? (
        <Icon
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      ) : null}
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        className={Icon ? "pl-8" : undefined}
      />
    </div>
  );
}
