"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchTickets } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Ticket as TicketIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

export default function PortalTicketsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => fetchTickets(),
  });

  if (!mounted) return null;

  const tickets = data?.results || [];

  return (
    <div className="space-y-6 animate-rise">
      <Link href="/portal" className="text-sm font-medium text-muted hover:text-ink flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-[32px] leading-none mb-2">Support Tickets</h1>
          <p className="text-muted text-lg">Track your current and past support requests.</p>
        </div>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <SkeletonTable columns={5} rows={5} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets yet"
            description="You don't have any open support tickets at the moment."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                <tr className="text-muted text-left">
                  <th className="p-3 font-medium">Ticket ID</th>
                  <th className="p-3 font-medium">Subject</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Priority</th>
                  <th className="p-3 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-mono text-xs">#{t.id}</td>
                  <td className="p-3">{t.subject}</td>
                  <td className="p-3 capitalize">
                    <span className={`chip ${t.status === 'resolved' || t.status === 'closed' ? 'chip-positive' : 'chip-gold'}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 capitalize">{t.priority}</td>
                  <td className="p-3 text-right text-muted">{formatDateTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
