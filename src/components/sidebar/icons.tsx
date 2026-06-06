type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true as const,
});

export function FolderIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FolderOpenIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H21a2 2 0 0 1 1.94 2.5l-1.55 6A2 2 0 0 1 19.46 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 17h13" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function PlusIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoreIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function PencilIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FolderPlusIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v4M10 13h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BookPlusIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 9v5M9 11.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
