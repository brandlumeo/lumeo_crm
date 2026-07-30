"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Calendar, IndianRupee } from "lucide-react";
import { useDeal, useCurrentCompany } from "@/lib/queries";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { QuotesInvoices } from "@/components/quotes-invoices";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { formatDateTime, formatINR, toNumber } from "@/lib/utils";
import { Drawer } from "@/components/drawer";

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

export default function InterceptedDealPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { id } = use(params);
  const dealId = parseInt(id, 10);
  
  const { data: deal, isLoading, error } = useDeal(dealId);
  const { data: company } = useCurrentCompany();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(false);
      setTimeout(() => router.back(), 300); // Wait for Radix animation
    } else {
      setOpen(true);
    }
  };

  if (isLoading) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <div className="p-6 text-muted font-sans text-xs flex justify-center items-center min-h-[200px]">
          Loading deal details...
        </div>
      </Drawer>
    );
  }

  if (error || !deal) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <div className="p-6 text-muted font-sans text-xs flex justify-center items-center min-h-[200px]">
          Deal not found.
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
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
        
        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={deal.id} entityType="deal" />
          <DocumentLibrary entityId={deal.id} entityType="deal" />
          <QuotesInvoices dealId={deal.id} />
        </div>
      </div>
    </Drawer>
  );
}
