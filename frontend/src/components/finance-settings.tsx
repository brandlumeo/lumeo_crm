"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  DollarSign, Loader2, CheckCircle, XCircle, Shield, 
  FileText, Hash, Percent, CalendarDays, Wallet, Image, AlignLeft, Users, Settings2, Bell, Grid, Plus, Trash2, Edit2, LayoutDashboard, Cloud, UploadCloud, Link as LinkIcon
} from "lucide-react";
import { useCurrentCompany, useCurrentUser, useInvoiceSettings, useUpdateInvoiceSettings, usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod, useUpdateCompany } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function FinanceSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const { data: invoiceSettings, isLoading: settingsLoading } = useInvoiceSettings();
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethods();
  const updateSettingsMutation = useUpdateInvoiceSettings();

  const [activeTab, setActiveTab] = useState("general"); // general, template, prefix, units, quickbooks, payment

  // General Settings
  const [defaultTaxRate, setDefaultTaxRate] = useState("0.00");
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

  // Prefix Settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceSeparator, setInvoiceSeparator] = useState("-");
  const [invoiceDigits, setInvoiceDigits] = useState(5);

  const [estimatePrefix, setEstimatePrefix] = useState("EST");
  const [estimateSeparator, setEstimateSeparator] = useState("-");
  const [estimateDigits, setEstimateDigits] = useState(5);

  const [creditNotePrefix, setCreditNotePrefix] = useState("CN");
  const [creditNoteSeparator, setCreditNoteSeparator] = useState("-");
  const [creditNoteDigits, setCreditNoteDigits] = useState(5);

  const [orderPrefix, setOrderPrefix] = useState("ORD");
  const [orderSeparator, setOrderSeparator] = useState("-");
  const [orderDigits, setOrderDigits] = useState(5);

  // Template Settings
  const [invoiceTemplate, setInvoiceTemplate] = useState("template1");

  // Quickbooks Settings
  const [quickbooksSyncStatus, setQuickbooksSyncStatus] = useState(false);

  // Payment Gateways Settings
  const [stripePublicKey, setStripePublicKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalSecret, setPaypalSecret] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");

  const updateCompanyMutation = useUpdateCompany();

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (invoiceSettings) {
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
      setQuickbooksSyncStatus(invoiceSettings.quickbooks_sync_status ?? false);

      setInvoicePrefix(invoiceSettings.invoice_prefix ?? "INV");
      setInvoiceSeparator(invoiceSettings.invoice_separator ?? "-");
      setInvoiceDigits(invoiceSettings.invoice_digits ?? 5);

      setEstimatePrefix(invoiceSettings.estimate_prefix ?? "EST");
      setEstimateSeparator(invoiceSettings.estimate_separator ?? "-");
      setEstimateDigits(invoiceSettings.estimate_digits ?? 5);

      setCreditNotePrefix(invoiceSettings.credit_note_prefix ?? "CN");
      setCreditNoteSeparator(invoiceSettings.credit_note_separator ?? "-");
      setCreditNoteDigits(invoiceSettings.credit_note_digits ?? 5);

      setOrderPrefix(invoiceSettings.order_prefix ?? "ORD");
      setOrderSeparator(invoiceSettings.order_separator ?? "-");
      setOrderDigits(invoiceSettings.order_digits ?? 5);
    }
    
    if (company) {
      setStripePublicKey(company.stripe_public_key ?? "");
      setStripeSecretKey(company.stripe_secret_key ?? "");
      setPaypalClientId(company.paypal_client_id ?? "");
      setPaypalSecret(company.paypal_secret ?? "");
      setRazorpayKeyId(company.razorpay_key_id ?? "");
      setRazorpayKeySecret(company.razorpay_key_secret ?? "");
    }
  }, [invoiceSettings, company]);

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
        quickbooks_sync_status: quickbooksSyncStatus,
        
        invoice_prefix: invoicePrefix,
        invoice_separator: invoiceSeparator,
        invoice_digits: invoiceDigits,

        estimate_prefix: estimatePrefix,
        estimate_separator: estimateSeparator,
        estimate_digits: estimateDigits,

        credit_note_prefix: creditNotePrefix,
        credit_note_separator: creditNoteSeparator,
        credit_note_digits: creditNoteDigits,

        order_prefix: orderPrefix,
        order_separator: orderSeparator,
        order_digits: orderDigits,
      }
    }, {
      onSuccess: () => {
        // Also update company settings (payment gateways)
        updateCompanyMutation.mutate({
          stripe_public_key: stripePublicKey,
          stripe_secret_key: stripeSecretKey,
          paypal_client_id: paypalClientId,
          paypal_secret: paypalSecret,
          razorpay_key_id: razorpayKeyId,
          razorpay_key_secret: razorpayKeySecret,
        }, {
          onSuccess: () => {
            setMsg({ type: "success", text: "Finance settings updated successfully." });
            setTimeout(() => setMsg(null), 4000);
          }
        });
      },
      onError: () => {
        setMsg({ type: "error", text: "Failed to update finance settings. Please try again." });
      }
    });
  };

  const generatePreview = (prefix: string, separator: string, digits: number) => {
    return `${prefix}${separator}${"1".padStart(digits, "0")}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
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
        
        {isAdmin && activeTab !== "payment" && (
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending || updateCompanyMutation.isPending}
            className={cn(
              "btn px-6 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2",
              (updateSettingsMutation.isPending || updateCompanyMutation.isPending) ? "btn-secondary opacity-70" : "btn-primary bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            )}
          >
            {(updateSettingsMutation.isPending || updateCompanyMutation.isPending) ? (
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

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 border-b border-line pb-px">
        {[
          { id: "general", label: "Invoice Settings", icon: Settings2 },
          { id: "template", label: "Invoice Template", icon: LayoutDashboard },
          { id: "prefix", label: "Prefix Settings", icon: Hash },
          { id: "units", label: "Units", icon: Grid },
          { id: "quickbooks", label: "Quickbooks Settings", icon: Cloud },
          { id: "payment", label: "Invoice Payment Details", icon: Wallet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-[14px] font-medium whitespace-nowrap border-b-2 transition-colors duration-200",
              activeTab === tab.id 
                ? "border-brand text-brand bg-brand/5 rounded-t-xl" 
                : "border-transparent text-muted hover:text-ink hover:bg-bone/50 rounded-t-xl"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2 pb-8">
        
        {/* TAB: GENERAL SETTINGS */}
        {activeTab === "general" && (
          <div className="space-y-8 animate-fade-in">
            {/* Payment Details & Branding */}
            <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8">
              <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Invoice Appearance</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                 <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink">Invoice Logo</label>
                    <div className="w-full h-32 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center bg-bone/30 hover:bg-bone/50 transition-colors cursor-pointer text-muted relative overflow-hidden group">
                        {invoiceLogo ? (
                          <img src={invoiceLogo} alt="Logo" className="object-contain w-full h-full p-2" />
                        ) : (
                          <>
                            <Image className="w-8 h-8 mb-2 opacity-50 group-hover:scale-110 transition-transform" />
                            <span className="text-[13px] font-medium">Choose a file</span>
                          </>
                        )}
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink">Authorised Signature</label>
                    <div className="w-full h-32 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center bg-bone/30 hover:bg-bone/50 transition-colors cursor-pointer text-muted relative overflow-hidden group">
                        {authorisedSignatory ? (
                          <img src={authorisedSignatory} alt="Signature" className="object-contain w-full h-full p-2" />
                        ) : (
                          <>
                            <Image className="w-8 h-8 mb-2 opacity-50 group-hover:scale-110 transition-transform" />
                            <span className="text-[13px] font-medium">Choose a file</span>
                          </>
                        )}
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted font-medium bg-paper px-2 py-0.5 rounded border border-line">Day(s)</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Automation & Visibility */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8">
                <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Reminders & Fields</h4>
                <div className="grid grid-cols-2 gap-4 mb-8">
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
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted font-medium">Day(s)</span>
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
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted font-medium">Day(s)</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <ToggleSwitch label="Show Tax number" checked={showTaxNumber} onChange={setShowTaxNumber} disabled={!isAdmin} />
                    <ToggleSwitch label="Hsn/Sac Code Show" checked={showHsnSac} onChange={setShowHsnSac} disabled={!isAdmin} />
                    <ToggleSwitch label="Show Status" checked={showStatus} onChange={setShowStatus} disabled={!isAdmin} />
                    <ToggleSwitch label="Show Authorised Signatory" checked={showAuthSignatory} onChange={setShowAuthSignatory} disabled={!isAdmin} />
                    <div className="col-span-2">
                        <ToggleSwitch label="Show tax calculation message" checked={showTaxCalcMessage} onChange={setShowTaxCalcMessage} disabled={!isAdmin} />
                    </div>
                </div>
              </div>

              <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8">
                <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Client Info To Show</h4>
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <ToggleSwitch label="Client Name" checked={showClientName} onChange={setShowClientName} disabled={!isAdmin} />
                    <ToggleSwitch label="Client Email" checked={showClientEmail} onChange={setShowClientEmail} disabled={!isAdmin} />
                    <ToggleSwitch label="Client Phone" checked={showClientPhone} onChange={setShowClientPhone} disabled={!isAdmin} />
                    <ToggleSwitch label="Company Name" checked={showClientCompany} onChange={setShowClientCompany} disabled={!isAdmin} />
                    <ToggleSwitch label="Client Address" checked={showClientAddress} onChange={setShowClientAddress} disabled={!isAdmin} />
                    <ToggleSwitch label="Show Project on invoice" checked={showProject} onChange={setShowProject} disabled={!isAdmin} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TEMPLATES */}
        {activeTab === "template" && (
          <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
            <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Invoice Template</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
                    "cursor-pointer rounded-2xl border-2 transition-all p-3 flex flex-col items-center gap-4 group",
                    !isAdmin && "opacity-70 cursor-not-allowed",
                    invoiceTemplate === template.id 
                      ? "border-brand bg-brand/5 shadow-md shadow-brand/10 ring-4 ring-brand/10" 
                      : "border-transparent bg-bone/30 hover:bg-bone/60"
                  )}
                >
                  <div className="w-full aspect-[1/1.4] bg-paper border border-line/60 rounded-xl overflow-hidden shadow-sm relative flex flex-col group-hover:-translate-y-1 transition-transform duration-300">
                     {/* Mock miniature template designs */}
                     {template.id === "template1" && (
                       <>
                         <div className="h-8 bg-blue-600/10 w-full flex items-center px-3"><div className="w-1/2 h-2 bg-blue-600/40 rounded-full" /></div>
                         <div className="flex-1 p-3 space-y-3">
                           <div className="w-1/3 h-1.5 bg-line rounded-full" />
                           <div className="w-full h-10 bg-bone/40 rounded-md mt-2" />
                         </div>
                       </>
                     )}
                     {template.id === "template2" && (
                       <div className="flex-1 p-4 space-y-4">
                         <div className="w-1/4 h-2 bg-slate-800/20 rounded-full mx-auto" />
                         <div className="w-full h-[1px] bg-line" />
                         <div className="w-full h-8 bg-bone/40 rounded-md" />
                       </div>
                     )}
                     {template.id === "template3" && (
                       <>
                         <div className="flex-1 p-3 space-y-2 mt-2">
                            <div className="w-1/2 h-2 bg-red-500/40 rounded-full" />
                            <div className="w-full h-6 bg-red-500/10 rounded-md mt-2" />
                         </div>
                         <div className="h-3 bg-red-500 w-full" />
                       </>
                     )}
                     {template.id === "template4" && (
                       <div className="flex-1 flex">
                          <div className="w-1/4 h-full bg-slate-800/5" />
                          <div className="w-3/4 p-3 space-y-2 mt-2">
                             <div className="w-1/2 h-2 bg-line rounded-full" />
                             <div className="w-full h-10 bg-bone/40 rounded-md mt-2" />
                          </div>
                       </div>
                     )}
                     {template.id === "template5" && (
                       <>
                         <div className="flex justify-between p-3">
                           <div className="w-1/3 h-2 bg-slate-800/30 rounded-full" />
                           <div className="w-1/4 h-2 bg-slate-800/10 rounded-full" />
                         </div>
                         <div className="flex-1 px-3 pb-3">
                           <div className="w-full h-10 bg-bone/40 rounded-md border border-line/50" />
                         </div>
                       </>
                     )}
                  </div>
                  <div className="flex items-center justify-between w-full px-1">
                    <span className={cn(
                        "text-[13.5px] font-semibold",
                        invoiceTemplate === template.id ? "text-brand" : "text-ink"
                    )}>
                        {template.name}
                    </span>
                    {invoiceTemplate === template.id && <CheckCircle className="w-4 h-4 text-brand" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PREFIX SETTINGS */}
        {activeTab === "prefix" && (
          <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
            <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Prefix Settings</h4>
            
            <div className="space-y-6">
                <PrefixRow 
                    title="Invoice"
                    prefix={invoicePrefix} setPrefix={setInvoicePrefix}
                    separator={invoiceSeparator} setSeparator={setInvoiceSeparator}
                    digits={invoiceDigits} setDigits={setInvoiceDigits}
                    isAdmin={isAdmin}
                    generatePreview={generatePreview}
                />
                <PrefixRow 
                    title="Estimate"
                    prefix={estimatePrefix} setPrefix={setEstimatePrefix}
                    separator={estimateSeparator} setSeparator={setEstimateSeparator}
                    digits={estimateDigits} setDigits={setEstimateDigits}
                    isAdmin={isAdmin}
                    generatePreview={generatePreview}
                />
                <PrefixRow 
                    title="Credit Note"
                    prefix={creditNotePrefix} setPrefix={setCreditNotePrefix}
                    separator={creditNoteSeparator} setSeparator={setCreditNoteSeparator}
                    digits={creditNoteDigits} setDigits={setCreditNoteDigits}
                    isAdmin={isAdmin}
                    generatePreview={generatePreview}
                />
                <PrefixRow 
                    title="Order"
                    prefix={orderPrefix} setPrefix={setOrderPrefix}
                    separator={orderSeparator} setSeparator={setOrderSeparator}
                    digits={orderDigits} setDigits={setOrderDigits}
                    isAdmin={isAdmin}
                    generatePreview={generatePreview}
                />
            </div>
          </div>
        )}

        {/* TAB: UNITS */}
        {activeTab === "units" && (
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-line/50">
              <h4 className="text-[16px] font-semibold text-ink">Unit Types</h4>
              {isAdmin && (
                <button className="btn btn-primary text-[13px] px-4 py-2 bg-ink hover:bg-ink/80 text-white rounded-lg flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Unit Type
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[13.5px]">
                    <thead className="bg-bone/40 text-muted border-b border-line">
                        <tr>
                            <th className="px-6 py-4 font-medium w-16">#</th>
                            <th className="px-6 py-4 font-medium">Unit Type</th>
                            <th className="px-6 py-4 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {/* Mock units until full CRUD */}
                        <tr className="hover:bg-bone/20 transition-colors">
                            <td className="px-6 py-4">1</td>
                            <td className="px-6 py-4 font-medium text-ink">Hours</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button className="p-2 text-muted hover:text-brand bg-bone/30 hover:bg-brand/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button className="p-2 text-muted hover:text-rose-600 bg-bone/30 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                        <tr className="hover:bg-bone/20 transition-colors">
                            <td className="px-6 py-4">2</td>
                            <td className="px-6 py-4 font-medium text-ink">Kg</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button className="p-2 text-muted hover:text-brand bg-bone/30 hover:bg-brand/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button className="p-2 text-muted hover:text-rose-600 bg-bone/30 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </div>
        )}
        
        {/* TAB: QUICKBOOKS SETTINGS */}
        {activeTab === "quickbooks" && (
          <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
            <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Quickbooks Settings</h4>
            
            <div className="bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-start mb-6">
                <LinkIcon className="w-5 h-5 shrink-0 text-cyan-600 mt-0.5" />
                <span className="font-medium">It is only One-Way Sync. If you create an invoice or payment here then an invoice or payment will be created on Quickbooks too.</span>
            </div>
            
            <div className="max-w-md">
                <ToggleSwitch 
                    label="Sync Status" 
                    checked={quickbooksSyncStatus} 
                    onChange={setQuickbooksSyncStatus} 
                    disabled={!isAdmin} 
                />
            </div>
          </div>
        )}
        
        {/* TAB: INVOICE PAYMENT DETAILS */}
        {activeTab === "payment" && (
          <div className="space-y-6">
            <div className="bg-paper border border-line rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
                <h4 className="text-[16px] font-semibold text-ink mb-6 pb-4 border-b border-line/50">Payment Gateways</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Razorpay */}
                    <div className="space-y-4">
                        <h5 className="font-medium text-ink flex items-center gap-2"><Wallet className="w-4 h-4" /> Razorpay</h5>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[13px] font-medium text-muted block mb-1">Key ID</label>
                                <input type="text" value={razorpayKeyId} onChange={e => setRazorpayKeyId(e.target.value)} disabled={!isAdmin} className="input w-full bg-bone/30 focus:bg-white" placeholder="rzp_test_..." />
                            </div>
                            <div>
                                <label className="text-[13px] font-medium text-muted block mb-1">Key Secret</label>
                                <input type="password" value={razorpayKeySecret} onChange={e => setRazorpayKeySecret(e.target.value)} disabled={!isAdmin} className="input w-full bg-bone/30 focus:bg-white" placeholder="Secret Key" />
                            </div>
                        </div>
                    </div>

                    {/* Stripe */}
                    <div className="space-y-4">
                        <h5 className="font-medium text-ink flex items-center gap-2"><DollarSign className="w-4 h-4" /> Stripe</h5>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[13px] font-medium text-muted block mb-1">Public Key</label>
                                <input type="text" value={stripePublicKey} onChange={e => setStripePublicKey(e.target.value)} disabled={!isAdmin} className="input w-full bg-bone/30 focus:bg-white" placeholder="pk_test_..." />
                            </div>
                            <div>
                                <label className="text-[13px] font-medium text-muted block mb-1">Secret Key</label>
                                <input type="password" value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} disabled={!isAdmin} className="input w-full bg-bone/30 focus:bg-white" placeholder="sk_test_..." />
                            </div>
                        </div>
                    </div>

                    {/* PayPal */}
                    <div className="space-y-4 md:col-span-2 max-w-md">
                        <h5 className="font-medium text-ink flex items-center gap-2"><Wallet className="w-4 h-4" /> PayPal</h5>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[13px] font-medium text-muted block mb-1">Client ID</label>
                                <input type="text" value={paypalClientId} onChange={e => setPaypalClientId(e.target.value)} disabled={!isAdmin} className="input w-full bg-bone/30 focus:bg-white" placeholder="Client ID" />
                            </div>
                            <div>
                                <label className="text-[13px] font-medium text-muted block mb-1">Secret</label>
                                <input type="password" value={paypalSecret} onChange={e => setPaypalSecret(e.target.value)} disabled={!isAdmin} className="input w-full bg-bone/30 focus:bg-white" placeholder="Secret" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PaymentDetailsTab isAdmin={isAdmin} paymentMethods={paymentMethods || []} isLoading={paymentMethodsLoading} />
          </div>
        )}

      </div>
    </div>
  );
}

// Payment Details Tab Subcomponent
function PaymentDetailsTab({ isAdmin, paymentMethods, isLoading }: { isAdmin: boolean, paymentMethods: any[], isLoading: boolean }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<any | null>(null);
    const createMutation = useCreatePaymentMethod();
    const updateMutation = useUpdatePaymentMethod();
    const deleteMutation = useDeletePaymentMethod();
    
    const [title, setTitle] = useState("");
    const [details, setDetails] = useState("");
    const [qrCode, setQrCode] = useState("");

    const openModal = (method: any | null = null) => {
        setEditingMethod(method);
        setTitle(method ? method.title : "");
        setDetails(method ? method.details : "");
        setQrCode(method ? (method.qr_code || "") : "");
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!title.trim()) return;
        
        const payload = { title, details, qr_code: qrCode };
        
        if (editingMethod) {
            updateMutation.mutate({ id: editingMethod.id, data: payload }, {
                onSuccess: () => setIsModalOpen(false)
            });
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => setIsModalOpen(false)
            });
        }
    };
    
    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this payment method?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-line/50">
              <h4 className="text-[16px] font-semibold text-ink">Invoice Payment Details</h4>
              {isAdmin && (
                <button 
                  onClick={() => openModal()}
                  className="btn btn-primary text-[13px] px-4 py-2 bg-ink hover:bg-ink/80 text-white rounded-lg flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> Add Payment Detail
                </button>
              )}
            </div>
            
            {isLoading ? (
                <div className="p-12 flex justify-center text-muted"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : paymentMethods.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-muted">
                    <div className="w-16 h-16 bg-bone rounded-full flex items-center justify-center mb-4">
                        <Wallet className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-[14px]">No payment details configured yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13.5px]">
                        <thead className="bg-bone/40 text-muted border-b border-line">
                            <tr>
                                <th className="px-6 py-4 font-medium">Title</th>
                                <th className="px-6 py-4 font-medium">Payment Details</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {paymentMethods.map((method: any) => (
                                <tr key={method.id} className="hover:bg-bone/20 transition-colors">
                                    <td className="px-6 py-4 font-medium text-ink w-1/4">{method.title}</td>
                                    <td className="px-6 py-4 text-muted max-w-md whitespace-pre-wrap">{method.details}</td>
                                    <td className="px-6 py-4 text-right w-32">
                                        {isAdmin && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openModal(method)} className="p-2 text-muted hover:text-brand bg-bone/30 hover:bg-brand/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(method.id)} className="p-2 text-muted hover:text-rose-600 bg-bone/30 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Payment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-paper w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-rise">
                        <div className="flex items-center justify-between p-5 border-b border-line">
                            <h3 className="font-semibold text-[16px] text-ink">{editingMethod ? "Edit Payment Detail" : "Add Payment Detail"}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-muted hover:text-ink rounded-lg transition-colors"><XCircle className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-muted">Title <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    placeholder="Payment Description (e.g. HDFC)"
                                    className="input w-full h-11 bg-white focus:bg-white focus:ring-2 focus:ring-brand/20 border-line" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-muted">Payment Details</label>
                                <textarea 
                                    value={details} 
                                    onChange={e => setDetails(e.target.value)} 
                                    placeholder="Add Payment Method Details (e.g., Bank Account, Transfer Information)"
                                    className="input w-full p-3 min-h-[100px] bg-white focus:bg-white focus:ring-2 focus:ring-brand/20 border-line resize-none" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-muted">QR Code URL</label>
                                <div className="border-2 border-dashed border-line rounded-xl p-6 flex flex-col items-center justify-center bg-bone/20 hover:bg-bone/40 transition-colors group text-center relative overflow-hidden">
                                    <input 
                                        type="url" 
                                        value={qrCode} 
                                        onChange={e => setQrCode(e.target.value)} 
                                        placeholder="Enter image URL for QR code..."
                                        className="w-full h-11 px-4 text-[13px] bg-white border border-line rounded-lg focus:outline-brand/50 z-10"
                                    />
                                    {qrCode && (
                                        <div className="mt-4 p-2 bg-white rounded-lg border border-line shadow-sm relative">
                                            <img src={qrCode} alt="QR Code Preview" className="w-24 h-24 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-line bg-bone/30">
                            <button onClick={() => setIsModalOpen(false)} className="btn text-[14px] px-5 py-2 hover:bg-bone/80 text-muted font-medium transition-colors">Close</button>
                            <button onClick={handleSave} disabled={!title.trim() || createMutation.isPending || updateMutation.isPending} className="btn bg-brand hover:bg-brand-600 text-white px-6 py-2 rounded-xl text-[14px] font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponents
function ToggleSwitch({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: (c: boolean) => void, disabled: boolean }) {
    return (
        <label className={cn("flex items-center justify-between cursor-pointer group bg-bone/30 hover:bg-bone/60 p-4 rounded-xl border border-transparent hover:border-line transition-all", disabled && "opacity-60 cursor-not-allowed")}>
            <span className="text-[14px] font-medium text-ink pr-4">{label}</span>
            <div className="relative">
                <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} className="sr-only" />
                <div className={cn("block w-11 h-6 rounded-full transition-colors duration-300", checked ? "bg-emerald-500" : "bg-slate-300")} />
                <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm", checked ? "transform translate-x-5" : "")} />
            </div>
        </label>
    );
}

function PrefixRow({ title, prefix, setPrefix, separator, setSeparator, digits, setDigits, isAdmin, generatePreview }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-bone/20 p-5 rounded-2xl border border-line">
            <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted">{title} Prefix <span className="text-rose-500">*</span></label>
                <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} disabled={!isAdmin} className="input w-full h-11 bg-white focus:bg-white focus:ring-2 focus:ring-brand/20 border-line" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted">Number Separator</label>
                <input type="text" value={separator} onChange={e => setSeparator(e.target.value)} disabled={!isAdmin} className="input w-full h-11 bg-white focus:bg-white focus:ring-2 focus:ring-brand/20 border-line" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted">Number Digits</label>
                <input type="number" min="1" max="10" value={digits} onChange={e => setDigits(Number(e.target.value))} disabled={!isAdmin} className="input w-full h-11 bg-white focus:bg-white focus:ring-2 focus:ring-brand/20 border-line" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted">Number Example</label>
                <div className="h-11 w-full bg-slate-100/80 text-ink/70 rounded-xl px-4 flex items-center font-mono text-[14px] border border-line/60">
                    {generatePreview(prefix, separator, digits)}
                </div>
            </div>
        </div>
    );
}
