import { cn } from "@/lib/cn";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  badge?: string;
  description?: string;
  /** Right-side actions: buttons, selects, segmented controls, etc. */
  actions?: React.ReactNode;
  size?: "large" | "medium" | "small";
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  badge,
  description,
  actions,
  size = "medium",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-0 w-full", className)}>
      {/* Eyebrow */}
      {eyebrow && (
        <p className="text-size-2 text-neutral-11 leading-5 mb-0.5">{eyebrow}</p>
      )}

      {/* Main row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* Left: title + description */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-end gap-3">
            <h1
              className={cn(
                "font-serif not-italic text-neutral-11 leading-tight tracking-tight",
                size === "large"  && "text-size-8 leading-[2.5rem]",
                size === "medium" && "text-size-7 leading-[2.25rem]",
                size === "small"  && "text-size-6 font-sans font-semibold leading-[1.875rem]",
              )}
            >
              {title}
            </h1>
            {badge && (
              <span className="mb-1 inline-flex items-center px-1.5 py-0.5 rounded-1 bg-accent-a3 text-accent-a11 text-size-1 font-medium leading-4">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-size-3 text-neutral-11 leading-6">{description}</p>
          )}
        </div>

        {/* Right: actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pill-style segmented toggle — pass as part of `actions` */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex h-8 items-center rounded-md overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(0,0,51,0.06) 0%, rgba(0,0,51,0.06) 100%), linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) 100%)",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-full px-4 text-size-2 leading-5 rounded-md transition-colors",
              active
                ? "bg-surface border border-neutral-a4 font-medium text-neutral-a12 shadow-sm"
                : "text-neutral-11 font-normal",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
