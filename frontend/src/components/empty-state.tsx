import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={`py-16 px-6 text-center ${className || ""}`}>
      <div className="w-12 h-12 rounded-lg bg-bone-2 grid place-items-center mx-auto mb-4">
        <Icon className="w-5 h-5 text-muted" strokeWidth={1.7} />
      </div>
      <div className="font-serif text-[28px] leading-none mb-2">{title}</div>
      <p className="text-sm text-muted max-w-md mx-auto">{description}</p>
    </div>
  );
}
