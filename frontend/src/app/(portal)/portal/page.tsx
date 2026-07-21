"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, FileText, LayoutDashboard, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

import { PageShell } from "@/components/page-shell";
import { SkeletonTable } from "@/components/skeleton-table";
import { EmptyState } from "@/components/empty-state";
import { fetchInvoices, fetchTickets } from "@/lib/api";

export default function PortalDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const invoicesQuery = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => fetchInvoices({ limit: 5 }),
  });

  const ticketsQuery = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => fetchTickets({ limit: 5 }),
  });

  if (!mounted) return null;

  const invoices = invoicesQuery.data?.results || [];
  const tickets = ticketsQuery.data?.results || [];
  const isLoading = invoicesQuery.isLoading || ticketsQuery.isLoading;

  return (
    <div className="space-y-10 animate-rise">
      <div className="mb-10">
        <h1 className="font-serif text-[52px] leading-tight mb-3">Welcome back.</h1>
        <p className="text-muted text-xl max-w-2xl">
          Your centralized client hub. Manage your open invoices, approve quotes, and track support tickets directly with our team.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* INVOICES WIDGET */}
        <div className="card shadow-xl border-white/5 bg-surface/40 backdrop-blur-md">
          <div className="card-head flex items-center justify-between py-5 px-6 border-b border-white/5">
            <div className="card-title flex items-center gap-3 text-[16px]">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-accent" />
              </div>
              Recent Invoices
            </div>
            <Link href="/portal/invoices" className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors tracking-wide">
              VIEW ALL
            </Link>
          </div>
          <div className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-6"><SkeletonTable columns={3} rows={3} /></div>
            ) : invoices.length === 0 ? (
              <div className="py-12">
                <EmptyState icon={FileText} title="No recent invoices" description="You're all caught up!" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-muted text-left bg-black/20">
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Invoice #</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-mono text-muted group-hover:text-ink transition-colors">{inv.invoice_number}</td>
                      <td className="px-6 py-4">
                        <span className={`chip ${inv.status === 'paid' ? 'chip-positive' : inv.status === 'overdue' ? 'chip-danger' : 'chip-warning'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-[15px]">
                        {formatCurrency(parseFloat(inv.total), inv.company?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* TICKETS WIDGET */}
        <div className="card shadow-xl border-white/5 bg-surface/40 backdrop-blur-md">
          <div className="card-head flex items-center justify-between py-5 px-6 border-b border-white/5">
            <div className="card-title flex items-center gap-3 text-[16px]">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-blue-400" />
              </div>
              Support Tickets
            </div>
            <Link href="/portal/tickets" className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors tracking-wide">
              VIEW ALL
            </Link>
          </div>
          <div className="p-0 overflow-hidden">
            {isLoading ? (
               <div className="p-6"><SkeletonTable columns={3} rows={3} /></div>
            ) : tickets.length === 0 ? (
              <div className="py-12">
                <EmptyState icon={LayoutDashboard} title="No open tickets" description="Need help? Open a new ticket in the Support tab." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-muted text-left bg-black/20">
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Subject</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="truncate font-medium group-hover:text-accent transition-colors">{t.subject}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`chip ${t.status === 'open' ? 'chip-warning' : t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' : 'chip-positive'}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 capitalize text-muted group-hover:text-ink">{t.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
