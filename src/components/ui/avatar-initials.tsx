import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface AvatarInitialsProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function getInitials(name: string): string {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) {
    return (parts[0]?.substring(0, 2) || "??").toUpperCase();
  }
  const first = parts[0]?.[0] || "";
  const last = parts[parts.length - 1]?.[0] || "";
  return (first + last).toUpperCase();
}

export function AvatarInitials({
  name,
  size = "md",
  className,
}: AvatarInitialsProps) {
  const initials = getInitials(name);

  const sizeStyles = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base font-semibold",
    xl: "w-16 h-16 text-xl font-bold",
  };

  return (
    <div
      role="img"
      aria-label={`Avatar for ${name}`}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center rounded-full select-none shrink-0 font-medium",
          "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)]",
          sizeStyles[size],
          className
        )
      )}
    >
      {initials}
    </div>
  );
}
