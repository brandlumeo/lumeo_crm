"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Calendar, IndianRupee, Edit2 } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useDeal, useCurrentCompany } from "@/lib/queries";
import { patchDeal } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { QuotesInvoices } from "@/components/quotes-invoices";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
import { formatDateTime, formatINR, toNumber } from "@/lib/utils";

function getStageLabel(stage: string, company: any) {
  if (!company?.deal_pipelines) return stage.replaceAll("_", " ");
  const found = company.deal_pipelines.find((s: any) => s.name.toLowerCase() === stage);
  return found ? found.name : stage.replaceAll("_", " ");
}

function getStageColor(stage: string, company: any) {
  if (!company?.deal_pipelines) return undefined;
  const found = company.deal_pipelines.find((s: any) => s.name.toLowerCase() === stage);
  return found ? found.color : undefined;
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const dealId = parseInt(id, 10);
  
  const queryClient = useQueryClient();
  const { data: deal, isLoading, error } = useDeal(dealId);
  const { data: company } = useCurrentCompany();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (deal && isEditing) {
      setForm({
        title: deal.title || "",
        amount: deal.amount || "",
        stage: deal.stage || "",
        deal_category: deal.deal_category || "",
        expected_close_date: deal.expected_close_date || "",
        custom_data: deal.custom_data || {},
      });
    }
  }, [deal, isEditing]);

  const mutation = useMutation({
    mutationFn: (payload: any) => patchDeal(dealId, payload),
    onSuccess: () => {
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["crm", dealId] });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });

  if (isLoading) {
    return (
      <PageShell
        eyebrow="Deals"
        title="Loading..."
        description="Fetching deal details from your workspace..."
      >
        <div className="p-6 text-muted font-sans text-xs">Loading deal details...</div>
      </PageShell>
    );
  }

  if (error || !deal) {
    return (
      <PageShell
        eyebrow="Deals"
        title="Not Found"
        description="The requested deal is not available or has been moved."
      >
        <div className="p-6 text-muted font-sans text-xs">Deal not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={deal.title}
      eyebrow="Deal Details"
      description="Manage communications, timelines, documentation, quotes, and custom attributes for this deal."
    >
      <div className="mb-6 flex items-center justify-between">
        <Link href="/deals" className="inline-flex items-center text-[13px] text-muted hover:text-ink transition-colors font-medium px-3 py-1.5 bg-bone-2 border border-line rounded-md">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to deals
        </Link>
        <button 
          onClick={() => setIsEditing(true)}
          className="btn px-4 py-1.5 bg-bone-2 border border-line text-ink text-[13px] hover:bg-line-2/50 transition-colors flex items-center gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit Deal
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card animate-rise">
            <div className="p-6 border-b border-line flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-bone-2 rounded-full grid place-items-center mb-3 border border-line shadow-sm">
                <Layers className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <h2 className="text-[22px] font-serif text-ink tracking-tight">{deal.title}</h2>
              <span 
                className="mt-2 chip"
                style={getStageColor(deal.stage, company) ? { borderColor: getStageColor(deal.stage, company), color: getStageColor(deal.stage, company), backgroundColor: `${getStageColor(deal.stage, company)}15` } : undefined}
              >
                {getStageLabel(deal.stage, company)}
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              {deal.deal_category && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Layers className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">Category: {deal.deal_category}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-[13px]">
                <IndianRupee className="w-4 h-4 text-muted shrink-0" />
                <span className="font-serif text-[18px] text-ink">{formatINR(toNumber(deal.amount))}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Added: {formatDateTime(deal.created_at)}</span>
              </div>
            </div>
          </div>
          <CustomFieldsDisplay modelName="deal" customData={deal.custom_data} />
        </div>

        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={deal.id} entityType="deal" />
          <DocumentLibrary entityId={deal.id} entityType="deal" />
          <QuotesInvoices dealId={deal.id} />
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-bone border border-line rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 flex items-center justify-between border-b border-line shrink-0">
              <h3 className="font-serif text-xl text-ink">Edit Deal Details</h3>
              <button onClick={() => setIsEditing(false)} className="text-muted hover:text-ink text-xl transition-colors">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form
                id="edit-deal-form"
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate(form);
                }}
              >
                <label className="block">
                  <span className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Deal Title</span>
                  <input
                    required
                    className="input w-full"
                    value={form.title}
                    onChange={(e) => setForm((curr: any) => ({ ...curr, title: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Amount</span>
                  <input
                    required
                    className="input w-full"
                    value={form.amount}
                    onChange={(e) => setForm((curr: any) => ({ ...curr, amount: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Stage</span>
                  <select
                    className="select w-full"
                    value={form.stage}
                    onChange={(e) => setForm((curr: any) => ({ ...curr, stage: e.target.value }))}
                  >
                    {company?.deal_pipelines?.map((stage: any) => (
                      <option key={stage.id} value={stage.name.toLowerCase()}>
                        {stage.name}
                      </option>
                    )) || (
                      <>
                        <option value="prospect">Prospect</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </>
                    )}
                  </select>
                </label>
                {(company?.deal_categories && company.deal_categories.length > 0) ? (
                  <label className="block">
                    <span className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Category</span>
                    <select
                      className="select w-full"
                      value={form.deal_category || ""}
                      onChange={(e) => setForm((curr: any) => ({ ...curr, deal_category: e.target.value }))}
                    >
                      <option value="">None</option>
                      {company.deal_categories.map((cat: any) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="block">
                  <span className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Expected close date</span>
                  <input
                    type="date"
                    className="input w-full"
                    value={form.expected_close_date || ""}
                    onChange={(e) => setForm((curr: any) => ({ ...curr, expected_close_date: e.target.value || null }))}
                  />
                </label>
                
                <div className="pt-2">
                  <CustomFieldsFormInputs
                    modelName="deal"
                    values={form.custom_data || {}}
                    onChange={(custom_data) => setForm((curr: any) => ({ ...curr, custom_data }))}
                  />
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-line shrink-0 flex justify-end gap-3 bg-bone-2/50">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="btn px-4 py-2 hover:bg-line-2/50 text-ink"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="edit-deal-form"
                disabled={mutation.isPending}
                className="btn btn-primary px-6 py-2"
              >
                {mutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </PageShell>
  );
}
