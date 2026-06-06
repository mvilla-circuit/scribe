// Shared class names for Radix dropdown + context menus so both share the exact
// same premium look (soft elevation, hairline border, fast pop-in motion).
export const menuContentClass =
  "scribe-pop z-50 min-w-[11rem] overflow-hidden rounded-md border border-border " +
  "bg-elevated p-1 text-sm text-text shadow-popover outline-none";

export const menuItemClass =
  "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm " +
  "text-text outline-none transition-colors data-[highlighted]:bg-hover " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const menuItemDangerClass =
  "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm " +
  "text-red-600 outline-none transition-colors data-[highlighted]:bg-red-500/10 " +
  "dark:text-red-400 data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const menuSeparatorClass = "my-1 h-px bg-border";

export const menuLabelClass =
  "px-2 py-1 text-xs font-medium text-muted select-none";
