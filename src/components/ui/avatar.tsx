import { useState } from "react";

import { cn } from "@/lib/utils";

function initials(name: string | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0]?.toUpperCase() ?? "?";
}

export function Avatar({
  src,
  name,
  size = 28,
  className,
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-white",
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name ?? "Profile"}
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(true);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
