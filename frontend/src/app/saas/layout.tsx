"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, Activity, Settings, ArrowLeft, CreditCard, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const nav = [
  { label: "Dashboard", href: "/saas", icon: LayoutDashboard },
  { label: "Tenants", href: "/saas/companies", icon: Building2 },
  { label: "Global Users", href: "/saas/users", icon: Users },
  { label: "Billing", href: "/saas/billing", icon: CreditCard },
  { label: "Settings", href: "/saas/settings", icon: Settings },
];

function SaasSidebar({ pathname, onClose }: { pathname: string, onClose?: () => void }) {
  return (
    <aside className="w-[260px] h-full bg-[#0f0f11] border-r border-white/5 flex flex-col shrink-0 relative z-20">
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 relative z-10">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="ml-3 font-semibold tracking-wide text-sm relative z-10">Lumeo SaaS</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="relative z-10 p-1 md:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="p-4 flex-1">
        <div className="text-xs font-medium text-white/40 mb-3 px-3 uppercase tracking-wider">Platform</div>
        <nav className="flex flex-col gap-1.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm group relative",
                  active 
                    ? "text-white bg-white/10 shadow-sm" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}
                <item.icon className={cn("w-4 h-4 transition-colors", active ? "text-indigo-400" : "text-white/40 group-hover:text-white/70")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm text-white/60 hover:text-white hover:bg-white/5 group"
        >
          <ArrowLeft className="w-4 h-4 text-white/40 group-hover:text-white/70" />
          <span className="font-medium">Exit Admin</span>
        </Link>
      </div>
    </aside>
  );
}

export default function SaasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#0a0a0b] text-white selection:bg-indigo-500/30 overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden h-16 border-b border-white/5 flex items-center px-4 shrink-0 bg-[#0f0f11] relative z-20">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-white/60 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-2 font-semibold tracking-wide text-sm">Lumeo SaaS Admin</span>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <SaasSidebar pathname={pathname} />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="h-full bg-[#0f0f11] shadow-2xl animate-in slide-in-from-left duration-200" onClick={(e) => e.stopPropagation()}>
            <SaasSidebar pathname={pathname} onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Background glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto relative z-10 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
