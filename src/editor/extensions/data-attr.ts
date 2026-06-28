// Factories for the `data-*` node/mark attribute specs that recur across the
// editor extensions. Each Tiptap attribute that persists a value as a single
// `data-<name>` HTML attribute otherwise repeats the same parseHTML/renderHTML
// boilerplate; these helpers collapse that to one call while keeping the exact
// round-trip semantics (absent attribute -> default, falsy value -> omitted).

/** Spec object Tiptap's `addAttributes()` expects for one attribute. */
export interface DataAttrSpec<T> {
  default: T;
  parseHTML: (el: HTMLElement) => T;
  renderHTML: (attrs: Record<string, unknown>) => Record<string, string>;
}

// camelCase attribute key -> `data-kebab-case` HTML attribute name.
function dataName(key: string): string {
  return `data-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

/**
 * A string attribute persisted as `data-<key>`. By default it reads back as
 * `null` when absent and is omitted from rendered HTML when empty/falsy. Pass a
 * `default` to fall back to it on parse, and `always: true` to emit the attr
 * even when empty (for values that must always round-trip explicitly).
 */
export function stringAttr<T extends string | null = string | null>(
  key: string,
  options: { default?: T; always?: boolean } = {},
): DataAttrSpec<T> {
  const name = dataName(key);
  const fallback = (options.default ?? null) as T;
  const always = options.always ?? false;
  return {
    default: fallback,
    parseHTML: (el) => (el.getAttribute(name) ?? fallback) as T,
    renderHTML: (attrs) => {
      const value = attrs[key] as string | null | undefined;
      if (always) return { [name]: value ?? "" };
      return value ? { [name]: value } : {};
    },
  };
}

/**
 * A boolean attribute persisted as `data-<key>`. With the default `false`, the
 * attribute is written as `"true"` only when set and read via `=== "true"`.
 * With a `true` default the sense inverts: it's written as `"false"` only when
 * cleared and read via `!== "false"`, so the common-case value stays implicit.
 */
export function boolAttr(
  key: string,
  options: { default?: boolean } = {},
): DataAttrSpec<boolean> {
  const name = dataName(key);
  const def = options.default ?? false;
  return {
    default: def,
    parseHTML: (el) =>
      def
        ? el.getAttribute(name) !== "false"
        : el.getAttribute(name) === "true",
    renderHTML: (attrs) => {
      const value = Boolean(attrs[key]);
      if (value === def) return {};
      return { [name]: value ? "true" : "false" };
    },
  };
}
