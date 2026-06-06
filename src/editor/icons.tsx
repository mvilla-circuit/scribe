// Compact formatting icons for the selection toolbar. They mirror the stroke
// style used elsewhere in the app (24x24 viewBox, currentColor, rounded caps).
type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true as const,
});

const stroke = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BoldIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" {...stroke} />
      <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" {...stroke} />
    </svg>
  );
}

export function ItalicIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M15 5h-5M14 19H9M14 5l-4 14" {...stroke} />
    </svg>
  );
}

export function UnderlineIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 5v6a5 5 0 0 0 10 0V5M6 20h12" {...stroke} />
    </svg>
  );
}

export function StrikeIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12h14" {...stroke} />
      <path d="M16 7.5A3.5 3.5 0 0 0 12.5 5h-1A3.2 3.2 0 0 0 9 9" {...stroke} />
      <path d="M8.5 15A3.3 3.3 0 0 0 11.5 19h1.5a3.4 3.4 0 0 0 2.4-5" {...stroke} />
    </svg>
  );
}

export function CodeIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M15 7l5 5-5 5M9 7l-5 5 5 5" {...stroke} />
    </svg>
  );
}

export function LinkIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 13a4 4 0 0 0 6 .4l2.5-2.5a4 4 0 0 0-5.7-5.7L11.5 6.6" {...stroke} />
      <path d="M14 11a4 4 0 0 0-6-.4L5.5 13.1a4 4 0 0 0 5.7 5.7L12.5 17.4" {...stroke} />
    </svg>
  );
}

export function ChevronDownIcon({ className, size = 12 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 9l6 6 6-6" {...stroke} />
    </svg>
  );
}

export function CheckIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12l5 5L19 7" {...stroke} />
    </svg>
  );
}

export function NoColorIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M6.5 6.5l11 11" {...stroke} />
    </svg>
  );
}
