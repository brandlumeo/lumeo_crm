"use client";

import Link from "next/link";
import { Topbar } from "@/components/topbar";

export default function PortalLayout({ 
  children
}: { 
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink">
      <header className="h-16 border-b border-white/5 bg-surface/80 backdrop-blur-md flex items-center px-8 justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-md grid place-items-center text-bone font-serif italic text-[18px] leading-none pb-0.5">
              L
            </div>
            <div className="font-serif text-[20px] font-medium tracking-tight">
              Client Portal
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/portal/invoices" className="text-sm font-medium text-muted hover:text-ink transition-colors">
            Invoices
          </Link>
          <Link href="/portal/tickets" className="text-sm font-medium text-muted hover:text-ink transition-colors">
            Support
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <a href="#" onClick={(e) => {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = "/login";
          }} className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
            Sign out
          </a>
        </div>
      </header>
      
      <main className="flex-1 overflow-x-hidden p-6 md:p-10 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
