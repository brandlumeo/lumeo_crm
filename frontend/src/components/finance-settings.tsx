"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  DollarSign, Loader2, CheckCircle, XCircle, Shield, 
  FileText, Hash, Percent, CalendarDays, Wallet, Image, AlignLeft, Users, Settings2, Bell
} from "lucide-react";
import { useCurrentCompany, useCurrentUser, useInvoiceSettings, useUpdateInvoiceSettings } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function FinanceSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const { data: invoiceSettings, isLoading: settingsLoading } = useInvoiceSettings();
  const updateSettingsMutation = useUpdateInvoiceSettings();
  const queryClient = useQueryClient();

  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [quotePrefix, setQuotePrefix] = useState("QT-");
  const [defaultTaxRate, setDefaultTaxRate] = useState("0.00");
  const [paymentTerms, setPaymentTerms] = useState("due_on_receipt");

  const [invoiceTemplate, setInvoiceTemplate] = useState("template1");
  const [invoiceLogo, setInvoiceLogo] = useState("");
  const [authorisedSignatory, setAuthorisedSignatory] = useState("");
  const [invoiceLanguage, setInvoiceLanguage] = useState("en");
  const [dueAfterDays, setDueAfterDays] = useState(15);
  const [sendReminderBefore, setSendReminderBefore] = useState(0);
  const [sendReminderAfter, setSendReminderAfter] = useState(3);
  
  const [showTaxNumber, setShowTaxNumber] = useState(false);
  const [showHsnSac, setShowHsnSac] = useState(false);
  const [showTaxCalcMessage, setShowTaxCalcMessage] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [showAuthSignatory, setShowAuthSignatory] = useState(false);
  
  const [showClientName, setShowClientName] = useState(true);
  const [showClientCompany, setShowClientCompany] = useState(true);
  const [showClientEmail, setShowClientEmail] = useState(true);
  const [showClientPhone, setShowClientPhone] = useState(true);
  const [showClientAddress, setShowClientAddress] = useState(true);
  const [showProject, setShowProject] = useState(true);
  
  const [invoiceTerms, setInvoiceTerms] = useState("Thank you for your business.");
  const [invoiceOtherInfo, setInvoiceOtherInfo] = useState("");

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize from settings when loaded
  useEffect(() => {
    if (invoiceSettings) {
      setInvoicePrefix(invoiceSettings.invoice_prefix ?? "INV-");
      setQuotePrefix(invoiceSettings.estimate_prefix ?? "QT-");
      setDefaultTaxRate(invoiceSettings.default_tax_rate ?? "0.00");
      setInvoiceTemplate(invoiceSettings.template_id ?? "template1");
      setInvoiceLogo(invoiceSettings.invoice_logo ?? "");
      setAuthorisedSignatory(invoiceSettings.authorised_signatory_signature ?? "");
      setInvoiceLanguage(invoiceSettings.language ?? "en");
      setDueAfterDays(invoiceSettings.invoice_due_after_days ?? 15);
      setSendReminderBefore(invoiceSettings.send_reminder_before_days ?? 0);
      setSendReminderAfter(invoiceSettings.send_reminder_after_days ?? 3);
      setShowTaxNumber(invoiceSettings.show_sender_tax_number ?? false);
      setShowHsnSac(invoiceSettings.show_hsn_sac_code ?? false);
      setShowTaxCalcMessage(invoiceSettings.show_tax_calculation_message ?? false);
      setShowStatus(invoiceSettings.show_status_on_invoice ?? true);
      setShowAuthSignatory(invoiceSettings.show_authorised_signatory ?? false);
      setShowClientName(invoiceSettings.show_client_name ?? true);
      setShowClientCompany(invoiceSettings.show_client_company_name ?? true);
      setShowClientEmail(invoiceSettings.show_client_email ?? true);
      setShowClientPhone(invoiceSettings.show_client_phone ?? true);
      setShowClientAddress(invoiceSettings.show_client_address ?? true);
      setShowProject(invoiceSettings.show_project_on_invoice ?? true);
      setInvoiceTerms(invoiceSettings.invoice_terms ?? "Thank you for your business.");
      setInvoiceOtherInfo(invoiceSettings.invoice_other_information ?? "");
    }
  }, [invoiceSettings]);

  if (!company || settingsLoading) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const handleSave = () => {
    if (!invoiceSettings?.id) return;
    
    updateSettingsMutation.mutate({
      id: invoiceSettings.id,
      data: {
        invoice_prefix: invoicePrefix,
        estimate_prefix: quotePrefix,
        default_tax_rate: defaultTaxRate,
        template_id: invoiceTemplate,
        invoice_logo: invoiceLogo,
        authorised_signatory_signature: authorisedSignatory,
        language: invoiceLanguage,
        invoice_due_after_days: dueAfterDays,
        send_reminder_before_days: sendReminderBefore,
        send_reminder_after_days: sendReminderAfter,
        show_sender_tax_number: showTaxNumber,
        show_hsn_sac_code: showHsnSac,
        show_tax_calculation_message: showTaxCalcMessage,
        show_status_on_invoice: showStatus,
        show_authorised_signatory: showAuthSignatory,
        show_client_name: showClientName,
        show_client_company_name: showClientCompany,
        show_client_email: showClientEmail,
        show_client_phone: showClientPhone,
        show_client_address: showClientAddress,
        show_project_on_invoice: showProject,
        invoice_terms: invoiceTerms,
        invoice_other_information: invoiceOtherInfo,
      }
    }, {
      onSuccess: () => {
        setMsg({ type: "success", text: "Finance settings updated successfully." });
        setTimeout(() => setMsg(null), 4000);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: () => {
        setMsg({ type: "error", text: "Failed to update finance settings. Please try again." });
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line sticky top-0 bg-bone/80 backdrop-blur-md z-10 -mx-6 px-6 pt-6 -mt-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
            <DollarSign className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Finance & Invoicing</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure defaults, invoice appearance, and communication preferences.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className={cn(
              "btn px-6 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2",
              updateSettingsMutation.isPending ? "btn-secondary opacity-70" : "btn-primary bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            )}
          >
            {updateSettingsMutation.isPending ? (
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
          <span className="font-medium">Read-only access: Only Owners and Admins can modify finance settings.</span>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Core Financial Defaults */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow xl:col-span-2">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-line/50">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Core Financial Defaults</h4>
                <p className="text-[13px] text-muted">Prefixes, tax rates, and basic parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  disabled={!isAdmin}
                  className="input w-full h-11 bg-bone/30 focus:bg-paper"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink">Quote Prefix</label>
                <input
                  type="text"
                  value={quotePrefix}
                  onChange={(e) => setQuotePrefix(e.target.value)}
                  disabled={!isAdmin}
                  className="input w-full h-11 bg-bone/30 focus:bg-paper"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">Default Tax Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(e.target.value)}
                    disabled={!isAdmin}
                    className="input w-full h-11 pr-10 bg-bone/30 focus:bg-paper"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <span className="text-muted font-medium">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Template Picker */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow lg:col-span-2">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-line/50">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Invoice Template</h4>
                <p className="text-[13px] text-muted">Select the visual layout for your generated invoices</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { id: "template1", name: "Modern Blue" },
                { id: "template2", name: "Classic Minimal" },
                { id: "template3", name: "Bold Accent" },
                { id: "template4", name: "Edge Sidebar" },
                { id: "template5", name: "Clean Corporate" },
              ].map((template) => (
                <div 
                  key={template.id}
                  onClick={() => isAdmin && setInvoiceTemplate(template.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 transition-all p-2 flex flex-col items-center gap-3",
                    !isAdmin && "opacity-70 cursor-not-allowed",
                    invoiceTemplate === template.id 
                      ? "border-brand bg-brand/5 shadow-sm" 
                      : "border-transparent bg-bone/30 hover:bg-bone/60"
                  )}
                >
                  <div className="w-full aspect-[1/1.4] bg-paper border border-line/60 rounded overflow-hidden shadow-sm relative flex flex-col">
                     {/* Mock miniature template designs */}
                     {template.id === "template1" && (
                       <>
                         <div className="h-6 bg-blue-600/10 w-full flex items-center px-2"><div className="w-1/2 h-1.5 bg-blue-600/40 rounded-full" /></div>
                         <div className="flex-1 p-2 space-y-2">
                           <div className="w-1/3 h-1 bg-line rounded-full" />
                           <div className="w-full h-8 bg-bone/40 rounded mt-2" />
                         </div>
                       </>
                     )}
                     {template.id === "template2" && (
                       <div className="flex-1 p-3 space-y-3">
                         <div className="w-1/4 h-2 bg-slate-800/20 rounded-full mx-auto" />
                         <div className="w-full h-[1px] bg-line" />
                         <div className="w-full h-6 bg-bone/40 rounded" />
                       </div>
                     )}
                     {template.id === "template3" && (
                       <>
                         <div className="flex-1 p-2 space-y-1 mt-2">
                            <div className="w-1/2 h-1.5 bg-red-500/40 rounded-full" />
                            <div className="w-full h-4 bg-red-500/10 rounded mt-2" />
                         </div>
                         <div className="h-2 bg-red-500 w-full" />
                       </>
                     )}
                     {template.id === "template4" && (
                       <div className="flex-1 flex">
                          <div className="w-1/4 h-full bg-slate-800/5" />
                          <div className="w-3/4 p-2 space-y-1.5 mt-2">
                             <div className="w-1/2 h-1.5 bg-line rounded-full" />
                             <div className="w-full h-8 bg-bone/40 rounded mt-2" />
                          </div>
                       </div>
                     )}
                     {template.id === "template5" && (
                       <>
                         <div className="flex justify-between p-2">
                           <div className="w-1/3 h-1.5 bg-slate-800/30 rounded-full" />
                           <div className="w-1/4 h-1.5 bg-slate-800/10 rounded-full" />
                         </div>
                         <div className="flex-1 px-2 pb-2">
                           <div className="w-full h-8 bg-bone/40 rounded border border-line/50" />
                         </div>
                       </>
                     )}
                  </div>
                  <span className={cn(
                    "text-[12.5px] font-medium text-center",
                    invoiceTemplate === template.id ? "text-brand" : "text-muted"
                  )}>
                    {template.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice Payment Details */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-line/50">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Invoice Payment Details</h4>
                <p className="text-[13px] text-muted">Branding and payment terms</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink">Invoice Logo</label>
                    <div className="w-full h-24 border-2 border-dashed border-line rounded-xl flex items-center justify-center bg-bone/30 hover:bg-bone/50 transition-colors cursor-pointer text-muted">
                        <div className="text-center">
                            <Image className="w-6 h-6 mx-auto mb-1 opacity-50" />
                            <span className="text-[12px]">Choose a file</span>
                        </div>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink">Authorised Signature</label>
                    <div className="w-full h-24 border-2 border-dashed border-line rounded-xl flex items-center justify-center bg-bone/30 hover:bg-bone/50 transition-colors cursor-pointer text-muted">
                        <div className="text-center">
                            <Image className="w-6 h-6 mx-auto mb-1 opacity-50" />
                            <span className="text-[12px]">Choose a file</span>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                 <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink">Language</label>
                    <select
                        value={invoiceLanguage}
                        onChange={(e) => setInvoiceLanguage(e.target.value)}
                        disabled={!isAdmin}
                        className="input w-full h-11 bg-bone/30 focus:bg-paper"
                    >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink">Due after <span className="text-rose-500">*</span></label>
                    <div className="relative">
                        <input
                            type="number"
                            value={dueAfterDays}
                            onChange={(e) => setDueAfterDays(Number(e.target.value))}
                            disabled={!isAdmin}
                            className="input w-full h-11 bg-bone/30 focus:bg-paper pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">Day(s)</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders & Visibility */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-line/50">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Reminders & Fields</h4>
                <p className="text-[13px] text-muted">Automation and field visibility</p>
              </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[13.5px] font-medium text-ink">Send Reminder Before</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={sendReminderBefore}
                                onChange={(e) => setSendReminderBefore(Number(e.target.value))}
                                disabled={!isAdmin}
                                className="input w-full h-11 bg-bone/30 focus:bg-paper pr-16"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">Day(s)</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13.5px] font-medium text-ink">Send Reminder After</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={sendReminderAfter}
                                onChange={(e) => setSendReminderAfter(Number(e.target.value))}
                                disabled={!isAdmin}
                                className="input w-full h-11 bg-bone/30 focus:bg-paper pr-16"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">Day(s)</span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={showTaxNumber} onChange={e => setShowTaxNumber(e.target.checked)} disabled={!isAdmin} className="w-4 h-4 rounded border-line text-brand accent-brand" />
                        <span className="text-[13px] text-ink group-hover:text-brand transition-colors">Show Tax number</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={showHsnSac} onChange={e => setShowHsnSac(e.target.checked)} disabled={!isAdmin} className="w-4 h-4 rounded border-line text-brand accent-brand" />
                        <span className="text-[13px] text-ink group-hover:text-brand transition-colors">Hsn/Sac Code Show</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={showStatus} onChange={e => setShowStatus(e.target.checked)} disabled={!isAdmin} className="w-4 h-4 rounded border-line text-brand accent-brand" />
                        <span className="text-[13px] text-ink group-hover:text-brand transition-colors">Show Status</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={showAuthSignatory} onChange={e => setShowAuthSignatory(e.target.checked)} disabled={!isAdmin} className="w-4 h-4 rounded border-line text-brand accent-brand" />
                        <span className="text-[13px] text-ink group-hover:text-brand transition-colors">Show Authorised Signatory</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group col-span-2">
                        <input type="checkbox" checked={showTaxCalcMessage} onChange={e => setShowTaxCalcMessage(e.target.checked)} disabled={!isAdmin} className="w-4 h-4 rounded border-line text-brand accent-brand" />
                        <span className="text-[13px] text-ink group-hover:text-brand transition-colors">Show tax calculation message</span>
                    </label>
                </div>
            </div>
          </div>
        </div>

        {/* Client Info to Show */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow xl:col-span-2">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-line/50">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Client Info To Show On Invoice</h4>
                <p className="text-[13px] text-muted">Select which client details appear on the final document</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-8">
                <label className="flex items-center gap-3 cursor-pointer group bg-bone/30 p-3 rounded-lg border border-transparent hover:border-line transition-all">
                    <input type="checkbox" checked={showClientName} onChange={e => setShowClientName(e.target.checked)} disabled={!isAdmin} className="w-4.5 h-4.5 rounded border-line text-brand accent-brand" />
                    <span className="text-[13.5px] font-medium text-ink">Client Name</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group bg-bone/30 p-3 rounded-lg border border-transparent hover:border-line transition-all">
                    <input type="checkbox" checked={showClientEmail} onChange={e => setShowClientEmail(e.target.checked)} disabled={!isAdmin} className="w-4.5 h-4.5 rounded border-line text-brand accent-brand" />
                    <span className="text-[13.5px] font-medium text-ink">Client Email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group bg-bone/30 p-3 rounded-lg border border-transparent hover:border-line transition-all">
                    <input type="checkbox" checked={showClientPhone} onChange={e => setShowClientPhone(e.target.checked)} disabled={!isAdmin} className="w-4.5 h-4.5 rounded border-line text-brand accent-brand" />
                    <span className="text-[13.5px] font-medium text-ink">Client Phone</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group bg-bone/30 p-3 rounded-lg border border-transparent hover:border-line transition-all">
                    <input type="checkbox" checked={showClientCompany} onChange={e => setShowClientCompany(e.target.checked)} disabled={!isAdmin} className="w-4.5 h-4.5 rounded border-line text-brand accent-brand" />
                    <span className="text-[13.5px] font-medium text-ink">Company Name</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group bg-bone/30 p-3 rounded-lg border border-transparent hover:border-line transition-all">
                    <input type="checkbox" checked={showClientAddress} onChange={e => setShowClientAddress(e.target.checked)} disabled={!isAdmin} className="w-4.5 h-4.5 rounded border-line text-brand accent-brand" />
                    <span className="text-[13.5px] font-medium text-ink">Client Address</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group bg-bone/30 p-3 rounded-lg border border-transparent hover:border-line transition-all">
                    <input type="checkbox" checked={showProject} onChange={e => setShowProject(e.target.checked)} disabled={!isAdmin} className="w-4.5 h-4.5 rounded border-line text-brand accent-brand" />
                    <span className="text-[13.5px] font-medium text-ink">Show Project on invoice</span>
                </label>
            </div>
          </div>
        </div>

        {/* Text Areas */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow lg:col-span-2">
          <div className="p-6 md:p-8 flex-1">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-line/50">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <AlignLeft className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Terms & Information</h4>
                <p className="text-[13px] text-muted">Boilerplate text appended to invoices</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink">Terms and Conditions</label>
                <textarea
                  value={invoiceTerms}
                  onChange={(e) => setInvoiceTerms(e.target.value)}
                  disabled={!isAdmin}
                  rows={4}
                  className="input w-full py-3 bg-bone/30 focus:bg-paper resize-none"
                  placeholder="Thank you for your business."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink">Other Information</label>
                <textarea
                  value={invoiceOtherInfo}
                  onChange={(e) => setInvoiceOtherInfo(e.target.value)}
                  disabled={!isAdmin}
                  rows={4}
                  className="input w-full py-3 bg-bone/30 focus:bg-paper resize-none"
                  placeholder="Enter Other Information"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
