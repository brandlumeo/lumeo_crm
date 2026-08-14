import type { Route } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageAction {
  href?: Route;
  label: string;
  variant?: "default" | "primary";
  onClick?: () => void;
}

interface PageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageAction[];
  children: React.ReactNode;
}

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PageShellProps) {
  return (
    <div className="p-4 md:p-7 pb-16 max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 animate-rise">
        <div className="min-w-0">
          {eyebrow && (
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
              <span className="w-[18px] h-px bg-accent" />
              {eyebrow}
            </div>
          )}
          <h1 className="font-sans font-bold tracking-tight text-3xl md:text-4xl text-ink leading-tight">{title}</h1>
          {description && <p className="text-muted mt-2 text-[15px] max-w-2xl leading-relaxed">{description}</p>}
        </div>

        {actions && actions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions.map((action) => {
              const className = cn(
                "btn",
                action.variant === "primary" && "btn-primary",
              );
              const content = (
                <>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.3} />
                  {action.label}
                </>
              );

              if (action.href) {
                return (
                  <Link key={action.label} href={action.href} className={className}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}
