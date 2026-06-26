"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  CheckSquare,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Layers,
  Settings,
  UserCircle2,
  Users,
  Users2,
  Package,
  Clock,
  Coins,
  Laptop,
  X,
  Ticket,
  Megaphone,
  Calendar,
  Briefcase,
  CircleDollarSign,
  ShoppingCart,
  CalendarDays,
  ClipboardList,
  Building2,
  Contact2,
  Inbox,
  HelpCircle,
  LogOut,
} from "lucide-react";

import { useCrmCounts, useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { cn, formatRelativeDays, getInitials } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { clearSession } from "@/lib/api";

function NavItem({ 
  item, 
  pathname, 
  counts, 
  openMenus, 
  toggleMenu 
}: { 
  item: any, 
  pathname: string, 
  counts: any, 
  openMenus: Record<string, boolean>, 
  toggleMenu: (label: string) => void 
}) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isOpen = openMenus[item.label];
  
  const isActive = item.href ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false;
  const isSubActive = hasSubItems && item.subItems.some((sub: any) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
  const isExpanded = isOpen || isSubActive;

  return (
    <div className="flex flex-col gap-0.5">
      {hasSubItems ? (
        <button
          onClick={() => toggleMenu(item.label)}
          className={cn(
            "flex items-center justify-between px-2 py-1.5 rounded-md text-[13.5px] transition-colors w-full",
            isSubActive ? "text-ink font-medium" : "text-ink-2 hover:bg-bone-2 hover:text-ink"
          )}
        >
          <div className="flex items-center gap-2.5">
            <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
            <span>{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.countKey && counts?.[item.countKey] ? (
              <span className="font-mono text-[11px] text-muted">
                {counts[item.countKey]}
              </span>
            ) : null}
            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-90")} />
          </div>
        </button>
      ) : item.onClick ? (
        <button
          type="button"
          onClick={item.onClick}
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13.5px] transition-colors w-full text-left",
            "text-ink-2 hover:bg-bone-2 hover:text-ink"
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
          <span>{item.label}</span>
        </button>
      ) : (
        <Link
          href={item.href || "#"}
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13.5px] transition-colors",
            isActive ? "bg-ink text-paper" : "text-ink-2 hover:bg-bone-2 hover:text-ink"
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
          <span>{item.label}</span>
          {item.countKey && counts?.[item.countKey] ? (
            <span
              className={cn(
                "ml-auto font-mono text-[11px]",
                isActive ? "text-paper/60" : "text-muted"
              )}
            >
              {counts[item.countKey]}
            </span>
          ) : null}
        </Link>
      )}

      {hasSubItems && isExpanded && (
        <div className="flex flex-col gap-0.5 mt-0.5 pl-6">
          {item.subItems.map((sub: any) => {
            const subActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors",
                  subActive ? "bg-ink text-paper" : "text-ink-2 hover:bg-bone-2 hover:text-ink"
                )}
              >
                {sub.icon && <sub.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />}
                <span>{sub.label}</span>
                {sub.countKey && counts?.[sub.countKey] ? (
                  <span
                    className={cn(
                      "ml-auto font-mono text-[11px]",
                      subActive ? "text-paper/60" : "text-muted"
                    )}
                  >
                    {counts[sub.countKey]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: company } = useCurrentCompany();
  const { data: counts } = useCrmCounts();
  const { data: user } = useCurrentUser();

  const [mounted, setMounted] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
    router.refresh();
  };

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";
  const isManagerOrAbove = isOwnerOrAdmin || user?.role === "manager" || user?.has_management_access;

  const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Leads", href: "/leads", icon: Contact2, countKey: "leads" as const },
    { label: "Clients", href: "/customers", icon: Building2, countKey: "customers" as const },
    { 
      label: "HR", 
      icon: Users2,
      subItems: [
        ...(mounted && isManagerOrAbove ? [{ label: "Team Directory", href: "/team" }] : []),
        ...(mounted && isManagerOrAbove ? [{ label: "Team Attendance", href: "/team-attendance" }] : []),
        { label: "My Attendance", href: "/attendance" },
        { label: "Holidays", href: "/holidays" },
      ]
    },
    { 
      label: "Work", 
      icon: Briefcase,
      subItems: [
        { label: "Deals", href: "/deals", countKey: "deals" as const },
        { label: "Tasks", href: "/tasks", countKey: "tasks" as const },
        { label: "Notes", href: "/notes", countKey: "notes" as const },
        { label: "Campaigns", href: "/campaigns" },
      ]
    },
    { 
      label: "Finance", 
      icon: CircleDollarSign,
      subItems: [
        { label: "Invoices", href: "/invoices" },
        { label: "Quotes", href: "/quotes" },
        { label: "Expenses", href: "/expenses" },
        { label: "Payroll", href: "/payroll" },
        { label: "Assets", href: "/assets" },
        ...(mounted && isOwnerOrAdmin ? [{ label: "Billing", href: "/billing" }] : []),
      ]
    },
    { label: "Products", href: "/products", icon: Package, countKey: "products" as const },
    { label: "Orders", href: "/orders", icon: ShoppingCart },
    { label: "Tickets", href: "/tickets", icon: Ticket },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Notice Board", href: "/notice-board", icon: ClipboardList },
  ];

  const systemNav = [
    { label: "Settings", href: "/settings", icon: Settings },
    ...(mounted && user?.is_superuser ? [{ label: "SaaS Admin", href: "/saas", icon: Layers }] : []),
    ...(onClose ? [
      { label: "Inbox", href: "#" as any, icon: Inbox },
      { label: "Contact Support", href: "https://mail.google.com/mail/?view=cm&fs=1&to=support@crm.estgrp.in" as any, target: "_blank", icon: HelpCircle },
      { label: "Sign Out", onClick: handleLogout, icon: LogOut },
    ] : []),
  ];

  const workspaceName = company?.name ?? "Lumeo workspace";
  const workspaceState =
    company?.status === "trial"
      ? formatRelativeDays(company.trial_ends_at) ?? "Trial"
      : company?.status
        ? company.status.replaceAll("_", " ")
        : "Workspace";

  const trialProgress = getTrialProgress(company?.created_at, company?.trial_ends_at);

  return (
    <aside className="bg-paper border-r border-line p-3.5 flex flex-col gap-5 sticky top-0 h-screen w-[240px] shrink-0 overflow-y-auto self-start">
      <div className="flex items-center justify-between px-2 pb-3.5 border-b border-line-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ink rounded-md grid place-items-center text-bone font-serif italic text-[20px] leading-none pb-0.5">
            L
          </div>
          <div className="font-serif text-[22px]">
            Lume<em className="text-accent not-italic">o</em>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <WorkspaceSwitcher workspaceName={workspaceName} workspaceState={workspaceState} />

      <nav className="flex flex-col gap-0.5">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted px-2 mb-1.5">
          Menu
        </div>
        {mainNav.map((item) => (
          <NavItem 
            key={item.label} 
            item={item} 
            pathname={pathname} 
            counts={counts} 
            openMenus={openMenus} 
            toggleMenu={toggleMenu} 
          />
        ))}
      </nav>

      <nav className="flex flex-col gap-0.5">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted px-2 mb-1.5">
          System
        </div>
        {systemNav.map((item) => (
          <NavItem 
            key={item.label} 
            item={item} 
            pathname={pathname} 
            counts={counts} 
            openMenus={openMenus} 
            toggleMenu={toggleMenu} 
          />
        ))}
      </nav>

      {mounted && isOwnerOrAdmin && (
        <div className="mt-auto">
          <div className="bg-ink text-paper rounded-md p-3.5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,31,0.25),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.12em] text-accent mb-1.5">
                {company?.status === "trial" ? "Free trial" : "Workspace"}
              </div>
              <div className="font-serif text-[18px] leading-tight mb-2.5">
                {company?.status === "trial"
                  ? workspaceState
                  : company?.status
                    ? company.status.replaceAll("_", " ")
                    : "CRM online"}
              </div>
              <div className="h-[3px] bg-paper/15 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-accent" style={{ width: `${trialProgress}%` }} />
              </div>
              <div className="text-[11px] text-paper/60 font-mono">
                {company?.status === "trial"
                  ? `${Math.round(trialProgress)}% of trial elapsed`
                  : company?.slug ?? "workspace active"}
              </div>
              <Link
                href="/billing"
                className="block bg-paper text-ink text-center py-1.5 rounded-md text-xs font-medium mt-2.5 hover:opacity-85 transition-opacity"
              >
                Manage billing
              </Link>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function getTrialProgress(createdAt?: string, trialEndsAt?: string | null) {
  if (!createdAt || !trialEndsAt) {
    return 64;
  }

  const start = new Date(createdAt).getTime();
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  const total = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now - start, 0), total);
  return (elapsed / total) * 100;
}
