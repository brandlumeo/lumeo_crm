"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDownRight, ArrowUpRight, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Health } from "@/lib/saas";

/*
 * "Dark luxe" design language for the platform admin:
 * near-black canvas, hairline borders, soft inner highlight, champagne-gold + violet accents,
 * Instrument Serif for headline figures, Geist for UI, tabular numerals everywhere.
 */

export const accent = {
  gold: "#D9B97A",
  violet: "#9D8CFF",
  teal: "#5EEAD4",
  rose: "#FB7185",
  amber: "#FBBF24",
  slate: "#64748B",
};

export function Panel({ children, className, title, action, subtitle, padded = true }: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-white/[0.07] bg-[#0E0E13]/90 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            {title && <h3 className="text-[13.5px] font-medium tracking-wide text-white/90">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[12px] text-white/40">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(padded && "p-5 sm:p-6", (title || action) && padded && "pt-4 sm:pt-4")}>{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#D9B97A]/80">{eyebrow}</div>}
        <h1 className="font-serif text-[34px] leading-[1.05] tracking-tight text-white sm:text-[40px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13.5px] text-white/45">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Delta({ value, suffix = "%", invert = false }: { value: number | null | undefined; suffix?: string; invert?: boolean }) {
  if (value === null || value === undefined) return <span className="text-[11px] text-white/30">—</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        good ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

export function Kpi({ label, value, hint, delta, icon, tone = "default", children }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "gold";
  children?: ReactNode;
}) {
  return (
    <Panel className="overflow-hidden" padded={false}>
      <div className="relative p-5">
        {tone === "gold" && <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#D9B97A]/10 blur-3xl" />}
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-white/40">{label}</span>
          {icon && <span className="text-white/30">{icon}</span>}
        </div>
        <div className={cn("mt-3 font-serif text-[34px] leading-none tracking-tight tabular-nums", tone === "gold" ? "text-[#E9D3A3]" : "text-white")}>{value}</div>
        <div className="mt-2.5 flex min-h-[20px] items-center gap-2 text-[12px] text-white/40">
          {delta}
          {hint && <span className="truncate">{hint}</span>}
        </div>
        {children}
      </div>
    </Panel>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  trial: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  suspended: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  inactive: "border-white/10 bg-white/5 text-white/40",
};
const PLAN_STYLES: Record<string, string> = {
  free: "border-white/10 bg-white/[0.04] text-white/55",
  starter: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  pro: "border-[#9D8CFF]/25 bg-[#9D8CFF]/10 text-[#C9C0FF]",
  enterprise: "border-[#D9B97A]/30 bg-[#D9B97A]/10 text-[#E9D3A3]",
};

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] || STATUS_STYLES.inactive}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

export function PlanBadge({ plan, label }: { plan: string; label?: string }) {
  return <Badge className={PLAN_STYLES[plan] || PLAN_STYLES.free}>{label || plan}</Badge>;
}

export function HealthPill({ health }: { health: Health }) {
  const tone = health.label === "healthy" ? "#34D399" : health.label === "attention" ? "#FBBF24" : "#FB7185";
  const label = health.label === "at_risk" ? "At risk" : health.label === "attention" ? "Attention" : "Healthy";
  return (
    <span className="inline-flex items-center gap-2" title={`Health score ${health.score}/100`}>
      <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${health.score}%`, background: tone }} />
      </span>
      <span className="text-[11.5px] tabular-nums" style={{ color: tone }}>
        {label}
      </span>
    </span>
  );
}

export function Meter({ used, max, label }: { used: number; max: number; label: string }) {
  const unlimited = max >= 999999;
  const pct = unlimited || !max ? 0 : Math.min((used / max) * 100, 100);
  const tone = pct >= 90 ? "#FB7185" : pct >= 70 ? "#FBBF24" : "#9D8CFF";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-white/55">{label}</span>
        <span className="tabular-nums text-white/80">
          {used.toLocaleString("en-IN")}
          <span className="text-white/35"> / {unlimited ? "∞" : max.toLocaleString("en-IN")}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all" style={{ width: `${unlimited ? 4 : pct}%`, background: tone }} />
      </div>
    </div>
  );
}

export function Avatar({ name, size = 32, tone }: { name: string; size?: number; tone?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 font-medium text-white/90"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: tone || `linear-gradient(135deg, hsl(${hue} 45% 28%), hsl(${(hue + 40) % 360} 45% 18%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

export function Button({ children, variant = "secondary", size = "md", className, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  const styles = {
    primary: "bg-white text-[#0B0B0F] hover:bg-white/90 border-transparent",
    gold: "bg-gradient-to-b from-[#E9D3A3] to-[#C9A35E] text-[#1A1407] border-[#E9D3A3]/40 hover:brightness-105 shadow-[0_8px_24px_-12px_rgba(217,185,122,0.6)]",
    secondary: "bg-white/[0.04] text-white/85 border-white/10 hover:bg-white/[0.08] hover:text-white",
    ghost: "bg-transparent text-white/60 border-transparent hover:bg-white/[0.05] hover:text-white",
    danger: "bg-rose-500/10 text-rose-300 border-rose-400/20 hover:bg-rose-500/20",
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[13px]",
        styles,
        className,
      )}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export const inputCls =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-white placeholder:text-white/30 outline-none transition focus:border-[#D9B97A]/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#D9B97A]/10";

export function Select({ value, onChange, children, className, ...rest }: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange: (v: string) => void;
}) {
  return (
    <select
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputCls, "w-auto cursor-pointer pr-8 [&>option]:bg-[#121218]", className)}
    >
      {children}
    </select>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
            value === o.value ? "bg-white/[0.09] text-white shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]" : "text-white/50 hover:text-white/80",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="rounded-md bg-white/[0.06] px-1.5 text-[10.5px] tabular-nums text-white/50">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] text-left text-[13px]">{children}</table>
    </div>
  );
}
export function Th({ children, className, onClick, active, dir }: { children?: ReactNode; className?: string; onClick?: () => void; active?: boolean; dir?: "asc" | "desc" }) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "whitespace-nowrap border-b border-white/[0.06] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/35 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
        onClick && "cursor-pointer select-none hover:text-white/70",
        active && "text-white/75",
        className,
      )}
    >
      {children}
      {active && <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap border-b border-white/[0.04] px-4 py-3.5 text-white/75 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", className)}>{children}</td>;
}

export function Pagination({ page, pageSize, count, onPage }: { page: number; pageSize: number; count: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (count === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 text-[12.5px] text-white/45 sm:px-6">
      <span className="tabular-nums">
        {from}–{to} of {count.toLocaleString("en-IN")}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="tabular-nums text-white/60">
          {page} / {pages}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-white/40">{icon}</div>}
      <div className="text-[14px] font-medium text-white/80">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-[12.5px] text-white/40">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/[0.05]", className)} />;
}

export function Modal({ open, onOpenChange, title, description, children, footer, wide }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[91] max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#101016] text-white shadow-2xl focus:outline-none",
            wide ? "max-w-2xl" : "max-w-md",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5">
            <div>
              <Dialog.Title className="font-serif text-[22px] leading-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[12.5px] text-white/45">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Dialog</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="p-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-white/[0.06] p-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: any[]; label?: string; format?: (v: number, name: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#14141B]/95 px-3 py-2 text-[12px] shadow-xl backdrop-blur">
      {label && <div className="mb-1 text-white/45">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-white/85">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
          <span className="text-white/55">{p.name}</span>
          <span className="ml-auto pl-3 tabular-nums">{format ? format(Number(p.value), p.name) : Number(p.value).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-white/55">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-white/35">{hint}</span>}
    </label>
  );
}
