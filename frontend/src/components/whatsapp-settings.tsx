"use client";

import { useState, useEffect } from "react";
import { useCurrentCompany, useUpdateCompany } from "@/lib/queries";
import { Loader2, MessageSquare, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Company } from "@/lib/types";

export function WhatsappSettingsForm() {
  const { data: company, isLoading } = useCurrentCompany();
  const updateCompany = useUpdateCompany();

  const [formData, setFormData] = useState({
    whatsapp_access_token: "",
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        whatsapp_access_token: company.whatsapp_access_token || "",
        whatsapp_phone_number_id: company.whatsapp_phone_number_id || "",
        whatsapp_business_account_id: company.whatsapp_business_account_id || "",
      });
    }
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    updateCompany.mutate(
      { id: company.id, payload: formData },
      {
        onSuccess: () => {
          toast.success("WhatsApp credentials saved successfully.");
        },
        onError: (err) => {
          toast.error("Failed to save credentials.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">WhatsApp Integration</h3>
        <p className="text-[14px] text-muted max-w-2xl">
          Connect your Meta WhatsApp Business account to unlock two-way messaging inside the CRM. 
          To set this up, grab these credentials from your Meta for Developers portal.
        </p>
      </div>

      <div className="bg-bone-2 border border-line rounded-xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-[13px] font-semibold text-ink">Webhook Configuration</h4>
          <p className="text-[13px] text-muted">
            In your Meta App settings, set the Webhook Callback URL to <code className="bg-bone px-1 py-0.5 rounded text-ink font-medium">https://lumeo.estgrp.in/api/v1/crm/webhooks/whatsapp/</code> 
            and the Verify Token to <code className="bg-bone px-1 py-0.5 rounded text-ink font-medium">lumeo_crm_whatsapp_token</code>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className="bg-paper border border-line rounded-xl overflow-hidden">
          <div className="p-6 border-b border-line bg-bone/30">
            <h4 className="text-[15px] font-semibold text-ink mb-1">Meta Cloud API Credentials</h4>
            <p className="text-[13px] text-muted">These tokens allow the CRM to send replies directly from your WhatsApp number.</p>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-ink uppercase tracking-wider">System User Access Token</label>
              <input
                type="password"
                value={formData.whatsapp_access_token}
                onChange={(e) => setFormData({ ...formData, whatsapp_access_token: e.target.value })}
                placeholder="EAAGX..."
                className="input w-full font-mono text-[13px]"
              />
              <p className="text-[12px] text-muted">This should be a permanent, never-expiring token generated for a System User.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Phone Number ID</label>
                <input
                  type="text"
                  value={formData.whatsapp_phone_number_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                  placeholder="e.g. 1024567890"
                  className="input w-full font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Business Account ID</label>
                <input
                  type="text"
                  value={formData.whatsapp_business_account_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_business_account_id: e.target.value })}
                  placeholder="e.g. 1204567890"
                  className="input w-full font-mono text-[13px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button 
            type="submit" 
            disabled={updateCompany.isPending}
            className="btn btn-primary min-w-[140px]"
          >
            {updateCompany.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Credentials
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
