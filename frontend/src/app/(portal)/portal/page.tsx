"use client";

import { useEffect, useState } from "react";
import { Link } from "next/link";
import { CreditCard, FileText, LayoutDashboard, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

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
            <a href="/portal/invoices" className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors tracking-wide">
              VIEW ALL
            </a>
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
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-mono text-muted group-hover:text-ink transition-colors">{inv.invoice_number}</td>
                      <td className="px-6 py-4">
                        <span className={`chip ${inv.status === 'paid' ? 'chip-positive' : inv.status === 'overdue' ? 'chip-danger' : 'chip-warning'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-[15px]">
                        {formatCurrency(parseFloat(inv.total), inv.currency || inv.company?.currency)}
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
            <a href="/portal/tickets" className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors tracking-wide">
              VIEW ALL
            </a>
          </div>
          <div className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-6"><SkeletonTable columns={3} rows={3} /></div>
            ) : tickets.length === 0 ? (
              <div className="py-12">
                <EmptyState icon={Ticket} title="No open tickets" description="We're here if you need us." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-muted text-left bg-black/20">
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Subject</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px] text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-medium group-hover:text-ink transition-colors">{t.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`chip ${t.status === 'resolved' || t.status === 'closed' ? 'chip-positive' : 'chip-gold'}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PROJECTS WIDGET */}
        <div className="card shadow-xl border-white/5 bg-surface/40 backdrop-blur-md">
          <div className="card-head flex items-center justify-between py-5 px-6 border-b border-white/5">
            <div className="card-title flex items-center gap-3 text-[16px]">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-purple-400" />
              </div>
              Recent Projects
            </div>
            <a href="/portal/projects" className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors tracking-wide">
              VIEW ALL
            </a>
          </div>
          <div className="p-0 overflow-hidden">
            <div className="py-12">
              <EmptyState icon={LayoutDashboard} title="No active projects" description="We'll show your projects here once they start." />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
