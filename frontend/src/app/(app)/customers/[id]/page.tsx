"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, UserCircle2, Mail, Phone, Calendar, Briefcase } from "lucide-react";
import { useCustomer } from "@/lib/queries";
import { PageShell } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { formatDateTime } from "@/lib/utils";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const customerId = parseInt(id, 10);
  
  const { data: customer, isLoading, error } = useCustomer(customerId);

  if (isLoading) {
    return <PageShell title="Loading..."><div className="p-6 text-muted">Loading customer details...</div></PageShell>;
  }

  if (error || !customer) {
    return <PageShell title="Not Found"><div className="p-6 text-muted">Customer not found.</div></PageShell>;
  }

  return (
    <PageShell title={customer.name} eyebrow="Customer Details">
      <div className="mb-6">
        <Link href="/customers" className="inline-flex items-center text-[13px] text-muted hover:text-ink transition-colors font-medium px-3 py-1.5 bg-bone-2 border border-line rounded-md">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to customers
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card animate-rise">
            <div className="p-6 border-b border-line flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-bone-2 rounded-full grid place-items-center mb-3 border border-line shadow-sm">
                <UserCircle2 className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <h2 className="text-[22px] font-serif text-ink tracking-tight">{customer.name}</h2>
            </div>
            
            <div className="p-5 space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Mail className="w-4 h-4 text-muted shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-accent hover:underline truncate">{customer.email}</a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Phone className="w-4 h-4 text-muted shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-ink hover:underline truncate">{customer.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Added: {formatDateTime(customer.created_at)}</span>
              </div>
            </div>
          </div>
          
          <CustomFieldsDisplay modelName="customer" customData={customer.custom_data} />
        </div>

        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={customer.id} entityType="customer" />
          <DocumentLibrary entityId={customer.id} entityType="customer" />
        </div>
      </div>
    </PageShell>
  );
}
