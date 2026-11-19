"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard, Building2, Users, Settings, ArrowLeft, Wallet, Menu, X, Search, ScrollText, Command, Loader2, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/queries";
import { saasApi, type SaasUser, type TenantRow } from "@/lib/saas";
import { Avatar, PlanBadge, StatusBadge } from "@/components/saas/ui";

const NAV = [
  { group: "Insights", items: [{ label: "Overview", href: "/saas", icon: LayoutDashboard }] },
  {
    group: "Customers",
    items: [
      { label: "Tenants", href: "/saas/companies", icon: Building2 },
      { label: "Users", href: "/saas/users", icon: Users },
    ],
  },
  { group: "Revenue", items: [{ label: "Billing & plans", href: "/saas/billing", icon: Wallet }] },
  {
    group: "Platform",
    items: [
      { label: "Audit log", href: "/saas/audit", icon: ScrollText },
      { label: "Settings", href: "/saas/settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/saas" ? pathname === "/saas" : pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({ pathname, onNavigate, onSearch }: { pathname: string; onNavigate?: () => void; onSearch: () => void }) {
  const { data: me } = useCurrentUser();
  const name = me ? `${me.first_name || ""} ${me.last_name || ""}`.trim() || me.email : "Admin";
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080B]/95">
      <div className="flex h-[68px] items-center justify-between px-5">
        <Link href="/saas" onClick={onNavigate} className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9B97A]/30 bg-gradient-to-br from-[#2A2214] to-[#0F0C07] shadow-[0_0_24px_-6px_rgba(217,185,122,0.45)]">
            <span className="font-serif text-[19px] leading-none text-[#E9D3A3]">L</span>
          </span>
          <span className="leading-tight">
            <span className="block text-[14px] font-semibold tracking-wide text-white">Lumeo</span>
            <span className="block text-[10.5px] uppercase tracking-[0.24em] text-[#D9B97A]/70">Platform</span>
          </span>
        </Link>
        {onNavigate && (
          <button onClick={onNavigate} className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white md:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-4">
        <button
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[12.5px] text-white/40 transition hover:border-white/15 hover:text-white/70"
        >
          <Search className="h-3.5 w-3.5" />
          Search tenants, users…
          <kbd className="ml-auto flex items-center gap-0.5 rounded-md border border-white/10 px-1.5 text-[10px] text-white/40">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-6 overflow-y-auto px-3">
        {NAV.map((section) => (
          <div key={section.group}>
            <div className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-white/25">{section.group}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition",
                      active ? "bg-white/[0.06] text-white" : "text-white/50 hover:bg-white/[0.03] hover:text-white/85",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#D9B97A] shadow-[0_0_12px_rgba(217,185,122,0.8)]" />}
                    <item.icon className={cn("h-4 w-4", active ? "text-[#E9D3A3]" : "text-white/35 group-hover:text-white/60")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Avatar name={name} size={30} tone="linear-gradient(135deg,#3A2E17,#16120A)" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[12.5px] text-white/85">{name}</div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[#D9B97A]/70">Super admin</div>
          </div>
        </div>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-white/45 transition hover:bg-white/[0.03] hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CRM
        </Link>
      </div>
    </aside>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [users, setUsers] = useState<SaasUser[]>([]);
  const [cursor, setCursor] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setTenants([]);
      setUsers([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setTenants([]);
      setUsers([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [t, u] = await Promise.all([saasApi.tenants({ search: q, page_size: 5 }), saasApi.users({ search: q, page_size: 5 })]);
        setTenants(t.results);
        setUsers(u.results);
        setCursor(0);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 220);
  }, [q]);

  const items: { key: string; href: string; render: () => React.ReactNode }[] = [
    ...tenants.map((t) => ({
      key: `t-${t.id}`,
      href: `/saas/companies/${t.id}`,
      render: () => (
        <>
          <Avatar name={t.name} size={28} />
          <span className="min-w-0 flex-1 truncate text-white/85">{t.name}</span>
          <PlanBadge plan={t.plan} label={t.plan_display} />
          <StatusBadge status={t.status} />
        </>
      ),
    })),
    ...users.map((u) => ({
      key: `u-${u.id}`,
      href: u.company ? `/saas/companies/${u.company.id}` : "/saas/users",
      render: () => (
        <>
          <Avatar name={u.name} size={28} />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-white/85">{u.name}</span>
            <span className="ml-2 text-white/35">{u.email}</span>
          </span>
          <span className="text-[11.5px] text-white/35">{u.company?.name}</span>
        </>
      ),
    })),
  ];

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[14vh] z-[96] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#101016] shadow-2xl focus:outline-none">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search tenants and users</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-white/40" /> : <Search className="h-4 w-4 text-white/40" />}
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, items.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === "Enter" && items[cursor]) {
                  go(items[cursor].href);
                }
              }}
              placeholder="Search tenants, users, emails…"
              className="h-14 flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
            />
            <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-white/35">ESC</kbd>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {!q.trim() ? (
              <div className="px-3 py-8 text-center text-[12.5px] text-white/35">Type a company name, person or email.</div>
            ) : items.length === 0 && !loading ? (
              <div className="px-3 py-8 text-center text-[12.5px] text-white/35">No matches for “{q}”.</div>
            ) : (
              items.map((item, i) => (
                <button
                  key={item.key}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(item.href)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px]", i === cursor ? "bg-white/[0.06]" : "hover:bg-white/[0.03]")}
                >
                  {item.render()}
                  {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 text-white/30" />}
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function SaasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, isLoading } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!isLoading && me && !me.is_superuser) router.replace("/dashboard");
  }, [isLoading, me, router]);

  if (isLoading || !me || !me.is_superuser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060608]">
        <Loader2 className="h-6 w-6 animate-spin text-[#D9B97A]/70" />
      </div>
    );
  }

  return (
    <div className="saas-luxe flex h-screen w-full overflow-hidden bg-[#060608] font-sans text-white antialiased selection:bg-[#D9B97A]/25">
      <div className="hidden h-full md:flex">
        <Sidebar pathname={pathname} onSearch={() => setSearchOpen(true)} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar pathname={pathname} onNavigate={() => setMenuOpen(false)} onSearch={() => setSearchOpen(true)} />
          </div>
        </div>
      )}

      <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
        {/* Ambient light */}
        <div className="pointer-events-none fixed inset-0 -z-0">
          <div className="absolute -top-40 left-1/3 h-[480px] w-[720px] rounded-full bg-[#9D8CFF]/[0.07] blur-[140px]" />
          <div className="absolute -bottom-40 right-0 h-[420px] w-[620px] rounded-full bg-[#D9B97A]/[0.06] blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 0.6px, transparent 0.6px)", backgroundSize: "22px 22px" }}
          />
        </div>

        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#060608]/80 px-4 backdrop-blur-xl md:hidden">
          <button onClick={() => setMenuOpen(true)} className="-ml-1 rounded-lg p-1.5 text-white/60 hover:text-white" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-serif text-[18px] text-white">Lumeo Platform</span>
          <button onClick={() => setSearchOpen(true)} className="ml-auto rounded-lg p-1.5 text-white/60 hover:text-white" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">{children}</div>
      </main>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
