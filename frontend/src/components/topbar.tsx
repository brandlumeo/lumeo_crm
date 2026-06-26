"use client";

import { Bell, Inbox, LogOut, Search, X, CheckCheck, HelpCircle, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clearSession, markNotificationsRead } from "@/lib/api";
import { useCurrentCompany, useCurrentUser, useNotifications, useUnreadCount } from "@/lib/queries";
import { getDisplayName, getInitials } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { SearchPalette } from "./search-palette";
import { AttendanceWidget } from "./attendance-widget";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/customers": "Customers",
  "/deals": "Deals",
  "/tasks": "Tasks",
  "/notes": "Notes",
  "/billing": "Billing",
  "/team": "Team",
  "/settings": "Settings",
  "/attendance": "Attendance & Leave",
  "/expenses": "Financial Expenses",
  "/assets": "Office Assets Catalog",
};

const typeIcon: Record<string, string> = {
  lead_assigned: "🎯",
  deal_won: "🎉",
  task_due: "📅",
  subscription_expiring: "⚠️",
  subscription_upgraded: "⬆️",
  general: "💬",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  return (
    <div
      className={[
        "flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 transition-colors",
        notification.is_read ? "opacity-60" : "bg-accent-soft/30",
      ].join(" ")}
    >
      <div className="w-8 h-8 rounded-full bg-bone-2 border border-line grid place-items-center text-sm shrink-0 mt-0.5">
        {typeIcon[notification.notification_type] ?? "💬"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-ink leading-snug">{notification.title}</p>
          {!notification.is_read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="shrink-0 text-muted hover:text-ink transition-colors mt-0.5"
              title="Mark as read"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-[12px] text-muted mt-0.5 leading-snug line-clamp-2">{notification.body}</p>
        <p className="text-[11px] text-muted/70 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
    </div>
  );
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: notificationsData, isLoading } = useNotifications();
  const notifications = notificationsData?.results ?? [];

  const markMutation = useMutation({
    mutationFn: (ids?: number[]) => markNotificationsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] bg-paper border border-line rounded-xl shadow-lg overflow-hidden z-[200] animate-rise">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-bone">
        <div className="font-medium text-[13px] text-ink">Notifications</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => markMutation.mutate(undefined)}
            className="text-[11px] text-muted hover:text-ink transition-colors flex items-center gap-1"
            title="Mark all read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={(id) => markMutation.mutate([id])}
            />
          ))
        )}
      </div>
      <div className="border-t border-line p-2 text-center bg-bone">
        <Link 
          href="/notifications" 
          onClick={onClose}
          className="text-[12px] font-medium text-accent hover:underline"
        >
          View all history
        </Link>
      </div>
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: company } = useCurrentCompany();
  const { data: unreadData } = useUnreadCount();

  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const current = titles[pathname] ?? "Lumeo";
  const displayName = getDisplayName(user);
  const unreadCount = unreadData?.unread_count ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5 px-4 md:px-7 py-3.5 border-b border-line bg-bone sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden w-8 h-8 grid place-items-center border border-line bg-paper rounded-md text-ink-2"
          >
            <Menu className="w-4 h-4" />
          </button>
          <nav className="flex items-center gap-2 text-[13px] text-muted">
            <span className="hidden sm:inline">{company?.name ?? "Lumeo"}</span>
            <span className="opacity-40 hidden sm:inline">/</span>
            <span className="text-ink font-medium">{current}</span>
          </nav>
        </div>

      <div className="w-full md:ml-6 md:w-auto md:flex-1 md:max-w-[360px] relative order-last md:order-none mt-2 md:mt-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full bg-paper border border-line rounded-md pl-8 pr-12 py-1.5 text-[13px] text-left text-muted outline-none focus:border-ink transition-colors hover:bg-bone-2"
        >
          Search...
        </button>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] bg-bone-2 px-1.5 py-0.5 rounded text-muted border border-line pointer-events-none hidden sm:inline">
          Ctrl K
        </span>
      </div>

      <SearchPalette open={searchOpen} setOpen={setSearchOpen} />

      <div className="ml-auto flex items-center gap-2">
        <AttendanceWidget />
        {/* Live notification bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="w-8 h-8 border border-line bg-paper rounded-md grid place-items-center text-ink-2 hover:bg-bone-2 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-[15px] h-[15px]" strokeWidth={1.6} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 border-[1.5px] border-paper">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationDropdown onClose={() => setNotifOpen(false)} />
          )}
        </div>

        <button
          type="button"
          className="hidden md:grid w-8 h-8 border border-line bg-paper rounded-md place-items-center text-ink-2 hover:bg-bone-2 transition-colors"
          aria-label="Inbox"
        >
          <Inbox className="w-[15px] h-[15px]" strokeWidth={1.6} />
        </button>

        <ThemeToggle />

        <a
          href="https://mail.google.com/mail/?view=cm&fs=1&to=support@crm.estgrp.in"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:grid w-8 h-8 border border-line bg-paper rounded-md place-items-center text-ink-2 hover:bg-bone-2 transition-colors"
          aria-label="Contact Support"
          title="Contact Support"
        >
          <HelpCircle className="w-[15px] h-[15px]" strokeWidth={1.6} />
        </a>

        <button
          type="button"
          onClick={handleLogout}
          className="hidden md:grid w-8 h-8 border border-line bg-paper rounded-md place-items-center text-ink-2 hover:bg-bone-2 transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-[15px] h-[15px]" strokeWidth={1.6} />
        </button>

        <Link
          href="/settings"
          className="flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 border border-line bg-paper rounded-full hover:bg-bone-2 transition-colors"
        >
          <div className="w-6 h-6 bg-ink text-paper rounded-full grid place-items-center text-[11px] font-medium overflow-hidden shrink-0">
            {user?.avatar ? (
               <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
               getInitials(displayName)
            )}
          </div>
          <span className="text-[12.5px] font-medium hidden sm:inline truncate max-w-[100px]">{displayName}</span>
        </Link>
      </div>
    </header>
    
    {mobileMenuOpen && (
      <div 
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm md:hidden flex"
        onClick={() => setMobileMenuOpen(false)}
      >
        <div 
          className="w-[240px] h-full bg-paper shadow-2xl animate-in slide-in-from-left"
          onClick={(e) => e.stopPropagation()}
        >
          <Sidebar onClose={() => setMobileMenuOpen(false)} />
        </div>
      </div>
    )}
    </>
  );
}
