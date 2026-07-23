"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building, Loader2, CheckCircle, XCircle, Shield, 
  Globe, DollarSign, LayoutDashboard
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function WorkspaceForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [name, setName] = useState(company?.name ?? "");
  const [currency, setCurrency] = useState(company?.currency ?? "USD");
  const [domain, setDomain] = useState(company?.domain ?? "");
  const [companyEmail, setCompanyEmail] = useState(company?.company_email ?? "");
  const [companyWebsite, setCompanyWebsite] = useState(company?.company_website ?? "");

  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setCurrency(company.currency ?? "USD");
      setDomain(company.domain ?? "");
      setCompanyEmail(company.company_email ?? "");
      setCompanyWebsite(company.company_website ?? "");
    }
  }, [company]);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const [workspaceMsg, setWorkspaceMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setWorkspaceMsg({ type: "success", text: "Workspace settings updated successfully." });
      setTimeout(() => setWorkspaceMsg(null), 4000);
    },
    onError: () => {
      setWorkspaceMsg({ type: "error", text: "Failed to update workspace settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <Building className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Company Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Manage your global company branding and workspace preferences.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => {
              let formattedWebsite = companyWebsite || null;
              if (formattedWebsite && !formattedWebsite.startsWith('http://') && !formattedWebsite.startsWith('https://')) {
                formattedWebsite = 'https://' + formattedWebsite;
              }
              mutation.mutate({ name, currency, domain: domain || null, company_email: companyEmail || null, company_website: formattedWebsite });
            }}
            disabled={mutation.isPending}
            className="btn btn-primary shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden "
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can make changes.</span>
        </div>
      )}

      {workspaceMsg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          workspaceMsg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {workspaceMsg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {workspaceMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* General Settings */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
          <div className="p-6 sm:p-8 space-y-8 flex-1 pt-9">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">General Info</h4>
                <p className="text-[13px] text-muted">Company's visible name.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isAdmin}
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper text-[14px]", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  Company Email
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g. hello@brandlumeo.com"
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper text-[14px]", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  Company Website
                </label>
                <input
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g. www.brandlumeo.com"
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper text-[14px]", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
            </div>
          </div>
          <div className="bg-bone/40 px-8 py-4 border-t border-line flex items-center justify-between mt-auto">
            <span className="text-[12.5px] text-muted flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              Reflected on invoices and quotes.
            </span>
          </div>
        </div>

        {/* Regional & Domain Settings */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
          <div className="p-6 sm:p-8 space-y-8 flex-1 pt-9">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Regional & Domain</h4>
                <p className="text-[13px] text-muted">Currency and custom branding.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted" /> Currency <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!isAdmin}
                    className={cn("input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10", !isAdmin && "opacity-70 cursor-not-allowed")}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted" /> Custom Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="crm.yourcompany.com"
                  className={cn("input w-full h-11 font-mono text-[13.5px] bg-bone/30 focus:bg-paper", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
            </div>
          </div>
          <div className="bg-bone/40 px-8 py-4 border-t border-line flex items-center justify-between mt-auto">
            <span className="text-[12.5px] text-muted flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              Contact support for domain verification.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
