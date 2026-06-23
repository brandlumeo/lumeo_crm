"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchInvoices } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

export default function PortalInvoicesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => fetchInvoices(),
  });

  if (!mounted) return null;

  const invoices = data?.results || [];

  return (
    <div className="space-y-6 animate-rise">
      <Link href="/portal" className="text-sm font-medium text-muted hover:text-ink flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      
      <div className="mb-8">
        <h1 className="font-serif text-[32px] leading-none mb-2">Invoices</h1>
        <p className="text-muted text-lg">All your past and active invoices.</p>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <SkeletonTable columns={5} rows={5} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="You don't have any invoices from us yet."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                <tr className="text-muted text-left">
                  <th className="p-3 font-medium">Invoice #</th>
                  <th className="p-3 font-medium">Issue Date</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02]">
                  <td className="p-3">{inv.invoice_number}</td>
                  <td className="p-3">{formatDateTime(inv.issue_date)}</td>
                  <td className="p-3 capitalize">{inv.status}</td>
                  <td className="p-3 text-right font-medium">{inv.total}</td>
                  <td className="p-3 text-right">
                    <a href={`/public/invoice/${inv.public_token}`} target="_blank" className="btn btn-secondary text-xs py-1 px-2">View</a>
                  </td>
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
