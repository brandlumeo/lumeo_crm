"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  useQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote, 
  useCustomerPage, useDealPage, useLeadPage, useCurrentCompany, useUnits 
} from "@/lib/queries";
import { downloadQuotePdf, openQuotePdfInNewTab } from "@/lib/api";
import { 
  FileText, Plus, Search, Loader2, Copy, Check, ExternalLink, Download, 
  Trash2, Edit2, Eye, Sparkles, Building2, User, Calendar, Clock, 
  Layers, DollarSign, ShieldAlert, CheckCircle2, ChevronRight, X
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { formatCurrency } from "@/lib/utils";
import { CurrencyPicker } from "@/components/currency-picker";
import { toast } from "sonner";
import type { QuoteLineItem } from "@/lib/types";

// Standard Agency Presets matching BrandLumeo's executive proposal format
const AGENCY_GROWTH_PRESET = {
  title: "Growth Package",
  duration: "1 Month",
  overview: "This quotation covers our Growth Package for client — a one-month digital marketing programme to build brand visibility and generate student enquiries through video content, social media management, Google Business Profile optimisation and Meta advertising.",
  items: [
    { item_number: "1", name: "Growth Package", description: "Comprehensive 1-month digital marketing & lead generation retainer", quantity: 1, unit_price: 15999, tax_rate: 0, unit: "Month", is_included: false },
    { item_number: "1.1", name: "Promotional Videos", description: "Concept, scripting, shooting and editing of short-form videos for Reels, Shorts and feeds", quantity: 4, unit_price: 0, tax_rate: 0, unit: "", is_included: true },
    { item_number: "1.2", name: "Trending Video", description: "Trend-based creative video using current formats to maximise reach", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: true },
    { item_number: "1.3", name: "Social Media Management", description: "Content calendar, post design, captions, scheduling and page management (Instagram & Facebook)", quantity: 1, unit_price: 0, tax_rate: 0, unit: "Month", is_included: true },
    { item_number: "1.4", name: "Google Business Profile Optimisation", description: "Profile setup and audit, categories, keywords, photos, services and review strategy", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: true },
    { item_number: "1.5", name: "Meta Ads Management", description: "Campaign strategy, targeting, ad creatives, setup, monitoring and optimisation", quantity: 1, unit_price: 0, tax_rate: 0, unit: "Month", is_included: true },
  ],
  payment_schedule: [
    { milestone: "50% Advance — on confirmation, to commence the project", amount: 8000 },
    { milestone: "50% Balance — on completion of the monthly scope", amount: 7999 }
  ],
  timeline: [
    { phase: "Week 1", description: "Onboarding, brand review, content calendar approval, Google Business Profile optimisation, Meta ads setup" },
    { phase: "Week 2-3", description: "Video production and publishing, trending video, regular posting, ad launch and optimisation" },
    { phase: "Week 4", description: "Remaining deliverables, campaign optimisation, performance report and recommendations" }
  ],
  client_responsibilities: [
    "Access to Instagram, Facebook, Meta Business Manager and Google Business Profile",
    "Logo, brand assets and course details",
    "Availability of premises and staff for video shoots",
    "Content approvals within 2 working days"
  ],
  exclusions: [
    "Meta ad spend (paid directly by the client to Meta)",
    "Website development, stock assets, influencer fees",
    "Work beyond the stated scope"
  ],
  terms_conditions: [
    "A 50% advance payment is required to commence the project; the balance is payable on completion.",
    "The client must provide all necessary account credentials and materials on time.",
    "Any work beyond the scope of this quotation will be charged additionally.",
    "Each deliverable includes up to two rounds of revisions.",
    "This quotation is valid for 15 days from the date of issue.",
    "Advertising and social media results depend on platform and market factors and are not guaranteed."
  ]
};

function QuotesPageContent() {
  const searchParams = useSearchParams();
  const leadParam = searchParams.get("lead_id");
  const createParam = searchParams.get("create");

  const { data: company } = useCurrentCompany();
  const baseCurrency = (company?.currency || "INR").toUpperCase();
  const { data, isLoading } = useQuotes();
  const { data: customerData } = useCustomerPage({});
  const { data: dealData } = useDealPage({});
  const { data: leadData } = useLeadPage({});
  
  const createMutation = useCreateQuote();
  const deleteMutation = useDeleteQuote();
  const updateMutation = useUpdateQuote();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"client" | "scope" | "terms" | "schedule">("client");
  const [editQuoteId, setEditQuoteId] = useState<number | null>(null);
  
  // Studio Form State
  const [clientType, setClientType] = useState<"lead" | "customer" | "custom">("lead");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("1 Month");
  const [validUntil, setValidUntil] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [overview, setOverview] = useState("");
  
  const [items, setItems] = useState<any[]>([
    { item_number: "1", name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: false }
  ]);
  const [paymentSchedule, setPaymentSchedule] = useState<{ milestone: string; amount: number }[]>([]);
  const [timeline, setTimeline] = useState<{ phase: string; description: string }[]>([]);
  const [clientResponsibilities, setClientResponsibilities] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [termsConditions, setTermsConditions] = useState<string[]>([]);

  const [deleteQuoteId, setDeleteQuoteId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const quotes = data?.results || [];
  const customers = customerData?.results || [];
  const deals = dealData?.results || [];
  const leads = leadData?.results || [];

  // Line item subtotal calculation
  const computedSubtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item.is_included) return acc;
      return acc + (Number(item.quantity || 1) * Number(item.unit_price || 0));
    }, 0);
  }, [items]);

  // Auto split 50/50 payment helper
  const applyAutoPaymentSplit = () => {
    const total = computedSubtotal;
    const half1 = Math.round(total * 0.5);
    const half2 = total - half1;
    setPaymentSchedule([
      { milestone: "50% Advance — on confirmation, to commence the project", amount: half1 },
      { milestone: "50% Balance — on completion of the monthly scope", amount: half2 }
    ]);
    toast.success("Applied 50% Advance / 50% Balance payment split");
  };

  // Load Preset
  const handleLoadPreset = () => {
    setTitle(AGENCY_GROWTH_PRESET.title);
    setDuration(AGENCY_GROWTH_PRESET.duration);
    const cName = clientName.trim() || "the client";
    setOverview(AGENCY_GROWTH_PRESET.overview.replace("client", cName));
    setItems(JSON.parse(JSON.stringify(AGENCY_GROWTH_PRESET.items)));
    setPaymentSchedule(JSON.parse(JSON.stringify(AGENCY_GROWTH_PRESET.payment_schedule)));
    setTimeline(JSON.parse(JSON.stringify(AGENCY_GROWTH_PRESET.timeline)));
    setClientResponsibilities([...AGENCY_GROWTH_PRESET.client_responsibilities]);
    setExclusions([...AGENCY_GROWTH_PRESET.exclusions]);
    setTermsConditions([...AGENCY_GROWTH_PRESET.terms_conditions]);
    toast.success("Loaded BrandLumeo Growth Package SOW Preset");
  };

  // Handle URL params for direct lead quotation creation
  useEffect(() => {
    if (leadParam && leads.length > 0) {
      const l = leads.find((x: any) => String(x.id) === String(leadParam));
      if (l) {
        setClientType("lead");
        setSelectedLeadId(l.id);
        setClientName(l.name || (l as any).company || "");
        setClientPhone(l.mobile || "");
        setClientAddress((l as any).address || "Calicut, Kerala");
        setTitle(`Growth Package - ${l.name}`);
        if (createParam === "true") {
          handleLoadPreset();
          setIsModalOpen(true);
        }
      }
    }
  }, [leadParam, leads, createParam]);

  // When Lead is selected
  const handleLeadSelect = (idStr: string) => {
    const id = parseInt(idStr, 10) || null;
    setSelectedLeadId(id);
    if (!id) return;
    const l = leads.find((x: any) => x.id === id);
    if (l) {
      setClientName(l.name || (l as any).company || "");
      setClientPhone(l.mobile || "");
      setClientAddress((l as any).address || "Calicut, Kerala");
      if (!title) setTitle(`Quotation - ${l.name}`);
    }
  };

  // When Customer is selected
  const handleCustomerSelect = (idStr: string) => {
    const id = parseInt(idStr, 10) || null;
    setSelectedCustomerId(id);
    if (!id) return;
    const c = customers.find((x: any) => x.id === id) as any;
    if (c) {
      if (c.currency && c.currency !== currency) {
        setCurrency(c.currency);
        setExchangeRate(1);
      }
      setClientName(c.name || c.company_name || "");
      setClientPhone(c.phone || "");
      setClientAddress(c.address || c.custom_data?.address || "");
      if (!title) setTitle(`Quotation - ${c.name}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setEditQuoteId(null);
    setClientType("lead");
    setSelectedLeadId(null);
    setSelectedCustomerId(null);
    setSelectedDealId(null);
    setClientName("");
    setClientAddress("");
    setClientPhone("");
    setTitle("");
    setDuration("1 Month");
    setValidUntil("");
    setCurrency(company?.currency || "INR");
    setExchangeRate(1);
    setOverview("");
    setItems([{ item_number: "1", name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: false }]);
    setPaymentSchedule([]);
    setTimeline([]);
    setClientResponsibilities([]);
    setExclusions([]);
    setTermsConditions([]);
    setActiveTab("client");
  };

  // Open edit modal
  const handleEditClick = (quote: any) => {
    setEditQuoteId(quote.id);
    if (quote.lead) {
      setClientType("lead");
      setSelectedLeadId(quote.lead);
    } else if (quote.customer) {
      setClientType("customer");
      setSelectedCustomerId(quote.customer);
    } else {
      setClientType("custom");
    }
    setSelectedDealId(quote.deal || null);
    setClientName(quote.client_name || quote.customer_details?.name || quote.lead_details?.name || "");
    setClientAddress(quote.client_address || quote.customer_details?.address || "");
    setClientPhone(quote.client_phone || quote.customer_details?.phone || quote.lead_details?.mobile || "");
    setTitle(quote.title || "");
    setDuration(quote.duration || "1 Month");
    setValidUntil(quote.valid_until || "");
    setCurrency(quote.currency || company?.currency || "INR");
    setExchangeRate(parseFloat(quote.exchange_rate || "1") || 1);
    setOverview(quote.overview || "");
    
    setItems(quote.items && quote.items.length > 0 ? quote.items : [
      { item_number: "1", name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: false }
    ]);
    setPaymentSchedule(quote.payment_schedule || []);
    setTimeline(quote.timeline || []);
    setClientResponsibilities(quote.client_responsibilities || []);
    setExclusions(quote.exclusions || []);
    setTermsConditions(quote.terms_conditions || []);
    setActiveTab("client");
    setIsModalOpen(true);
  };

  // Submit quote
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a Quotation Title");
      return;
    }
    const validItems = items.filter(it => it.name.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item deliverable");
      return;
    }

    const payload: any = {
      title,
      duration,
      currency,
      ...(currency !== baseCurrency && exchangeRate > 0 && exchangeRate !== 1 ? { exchange_rate: exchangeRate } : {}),
      overview,
      client_name: clientName,
      client_address: clientAddress,
      client_phone: clientPhone,
      items: validItems,
      payment_schedule: paymentSchedule,
      timeline,
      client_responsibilities: clientResponsibilities,
      exclusions,
      terms_conditions: termsConditions,
    };

    if (clientType === "lead" && selectedLeadId) {
      payload.lead = selectedLeadId;
    } else if (clientType === "customer" && selectedCustomerId) {
      payload.customer = selectedCustomerId;
    }
    if (selectedDealId) payload.deal = selectedDealId;
    if (validUntil) payload.valid_until = validUntil;

    if (editQuoteId) {
      updateMutation.mutate({ id: editQuoteId, payload }, {
        onSuccess: () => {
          toast.success("Quotation updated successfully");
          setIsModalOpen(false);
          resetForm();
        },
        onError: () => toast.error("Failed to update quotation")
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Executive Quotation created successfully");
          setIsModalOpen(false);
          resetForm();
        },
        onError: () => toast.error("Failed to create quotation")
      });
    }
  };

  // Handle PDF Preview in new tab
  const handleOpenPdf = async (id: number) => {
    try {
      setPdfLoadingId(id);
      await openQuotePdfInNewTab(id);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to generate PDF";
      toast.error(typeof msg === "string" ? msg : "Failed to generate PDF");
    } finally {
      setPdfLoadingId(null);
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async (id: number, quoteNumber: string) => {
    try {
      setPdfLoadingId(id);
      await downloadQuotePdf(id, quoteNumber);
      toast.success("Quotation PDF downloaded");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to download PDF";
      toast.error(typeof msg === "string" ? msg : "Failed to download PDF");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/quote/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    if (!searchQuery.trim()) return quotes;
    const q = searchQuery.toLowerCase();
    return quotes.filter((item: any) => 
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.quote_number && item.quote_number.toLowerCase().includes(q)) ||
      (item.client_name && item.client_name.toLowerCase().includes(q)) ||
      (item.lead_details?.name && item.lead_details.name.toLowerCase().includes(q)) ||
      (item.customer_details?.name && item.customer_details.name.toLowerCase().includes(q))
    );
  }, [quotes, searchQuery]);

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8 w-full min-w-0 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Agency Statement of Work (SOW)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink mt-1">Quotations &amp; Proposals</h1>
            <p className="text-muted text-sm mt-0.5">
              Draft executive multi-page proposals, link with leads or clients, and render verified 2-page quotation PDFs.
            </p>
          </div>
          <button 
            onClick={() => {
              resetForm();
              handleLoadPreset(); // Default to clean Growth Package preset
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#55B334] hover:bg-[#499e2b] text-white font-medium rounded-lg shadow-sm transition-all shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            New Quotation SOW
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-line flex flex-col sm:flex-row items-center justify-between gap-3 bg-bone-2">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by quote #, title, or client..."
                className="w-full pl-9 pr-4 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
              />
            </div>
            <div className="text-xs text-muted font-medium">
              Showing {filteredQuotes.length} of {quotes.length} quotations
            </div>
          </div>

          {isLoading ? (
            <SkeletonTable columns={6} rows={6} />
          ) : filteredQuotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotations found"
              description="Create a statement of work proposal for your leads or clients to send executive quotations."
            />
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap relative">
                <thead className="sticky top-0 z-10 text-muted bg-bone/90 backdrop-blur-md shadow-[0_1px_0_0_var(--color-line)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Quote # &amp; Title</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Prepared For</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-right">Investment Total</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredQuotes.map((quote: any) => {
                    const clientDisp = quote.client_name || quote.lead_details?.name || quote.customer_details?.name || quote.deal_details?.title || "—";
                    const isLeadSource = !!quote.lead;
                    
                    return (
                      <tr key={quote.id} className="hover:bg-bone-2/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-ink flex items-center gap-1.5">
                            {quote.title || "Untitled Quote"}
                          </div>
                          <div className="text-xs font-mono text-muted mt-0.5">{quote.quote_number}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-ink flex items-center gap-1.5">
                            {isLeadSource ? (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">LEAD</span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded border border-purple-200">CLIENT</span>
                            )}
                            <span className="truncate max-w-[180px]">{clientDisp}</span>
                          </div>
                          <div className="text-xs text-muted truncate max-w-[200px]">
                            {quote.client_address || quote.client_phone || quote.customer_details?.email || ""}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted">
                          {quote.duration || "1 Month"}
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            value={quote.status}
                            onChange={(e) => updateMutation.mutate({ id: quote.id, payload: { status: e.target.value } })}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize outline-none transition-colors border cursor-pointer ${
                              quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              quote.status === 'declined' ? 'bg-red-100 text-red-800 border-red-300' :
                              quote.status === 'expired' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                            <option value="expired">Expired</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-ink text-right">
                          {formatCurrency(parseFloat(quote.total || "0"), quote.currency || company?.currency || "INR")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View PDF Button (Opens 2-page Statement of Work in new tab) */}
                            <button
                              onClick={() => handleOpenPdf(quote.id)}
                              disabled={pdfLoadingId === quote.id}
                              className="px-2.5 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                              title="View 2-Page Executive SOW PDF in new tab"
                            >
                              {pdfLoadingId === quote.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              View PDF
                            </button>

                            {/* Download PDF Button */}
                            <button
                              onClick={() => handleDownloadPdf(quote.id, quote.quote_number)}
                              disabled={pdfLoadingId === quote.id}
                              className="p-1.5 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditClick(quote)}
                              className="p-1.5 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                              title="Edit Quote"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Copy Public Link */}
                            <button
                              onClick={() => copyToClipboard(quote.public_token)}
                              className="p-1.5 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                              title="Copy E-Signature Link"
                            >
                              {copiedLink === quote.public_token ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this quotation?")) {
                                  deleteMutation.mutate(quote.id);
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-line"
                              title="Delete Quote"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          EXECUTIVE SOW PROPOSAL STUDIO MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-bone">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  BrandLumeo Executive Proposal Studio
                </span>
                <h2 className="text-lg font-bold text-ink mt-1">
                  {editQuoteId ? "Edit Quotation Statement of Work" : "Create New Quotation SOW"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadPreset}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Load digital marketing Growth Package defaults"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Growth Package Preset
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-muted hover:text-ink text-2xl font-light w-8 h-8 rounded-lg grid place-items-center hover:bg-bone-2 transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="flex border-b border-line bg-bone-2 px-6 pt-2 gap-2 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("client")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "client" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                1. Client &amp; Meta
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("scope")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "scope" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                2. Scope &amp; Pricing ({items.length} items)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "schedule" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                3. Payment &amp; Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("terms")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "terms" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                4. Responsibilities &amp; Terms
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} id="quote-studio-form" className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* TAB 1: CLIENT & META */}
              {activeTab === "client" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setClientType("lead")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        clientType === "lead" ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20" : "border-line bg-bone hover:border-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Link from Lead</div>
                      <div className="text-xs text-muted mt-1">Pre-fill contact from qualified lead</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientType("customer")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        clientType === "customer" ? "border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20" : "border-line bg-bone hover:border-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-700">Existing Customer</div>
                      <div className="text-xs text-muted mt-1">Select from registered CRM clients</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientType("custom")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        clientType === "custom" ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20" : "border-line bg-bone hover:border-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Custom Recipient</div>
                      <div className="text-xs text-muted mt-1">Type custom name, phone &amp; address</div>
                    </button>
                  </div>

                  {clientType === "lead" && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-ink mb-1.5">Select Lead *</label>
                      <select
                        value={selectedLeadId || ""}
                        onChange={(e) => handleLeadSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      >
                        <option value="">Choose a lead to quote...</option>
                        {leads.map((l: any) => (
                          <option key={l.id} value={l.id}>{l.name} {l.company ? `(${l.company})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {clientType === "customer" && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-ink mb-1.5">Select Customer *</label>
                      <select
                        value={selectedCustomerId || ""}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      >
                        <option value="">Choose a customer...</option>
                        {customers.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Client Snapshot Details */}
                  <div className="p-4 bg-bone-2 border border-line rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">Prepared For (Client Name) *</label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. EDUFIX LEARNING"
                        className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">Client Address</label>
                      <input
                        type="text"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="e.g. Calicut, Payyoli - 673522"
                        className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">Client Phone / Mobile</label>
                      <input
                        type="text"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="e.g. +91 70342 87049"
                        className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink"
                      />
                    </div>
                  </div>

                  {/* Proposal Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase text-ink mb-1.5">Quotation / Package Title *</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Growth Package"
                        className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm font-semibold outline-none focus:border-ink"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-ink mb-1.5">Duration</label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 1 Month"
                        className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-ink mb-1.5">Valid Until</label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink"
                      />
                    </div>

                    <CurrencyPicker
                      label="Quote Currency"
                      currency={currency}
                      rate={exchangeRate}
                      baseCurrency={baseCurrency}
                      onChange={(code, rate) => {
                        setCurrency(code);
                        setExchangeRate(rate);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: OVERVIEW & SCOPE & PRICING */}
              {activeTab === "scope" && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold uppercase text-emerald-700 mb-1.5 flex items-center justify-between">
                      <span>Executive Overview Narrative</span>
                      <span className="text-[11px] font-normal text-muted">Page 1 Executive Summary paragraph</span>
                    </label>
                    <textarea
                      rows={3}
                      value={overview}
                      onChange={(e) => setOverview(e.target.value)}
                      placeholder="This quotation covers our Growth Package for Edufix Learning — a one-month digital marketing programme..."
                      className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm leading-relaxed outline-none focus:border-ink"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Scope &amp; Pricing Deliverables</h3>
                        <p className="text-xs text-muted">Add parent packages with monetary pricing, and check 'Included' for sub-deliverables.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextNum = `${items.length + 1}`;
                            setItems([...items, { item_number: nextNum, name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: false }]);
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-bone hover:bg-bone-2 text-ink border border-line rounded-md transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Package Row
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextNum = `1.${items.length}`;
                            setItems([...items, { item_number: nextNum, name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, unit: "", is_included: true }]);
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Sub-Deliverable (Included)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {items.map((it, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-xl border transition-all ${
                            it.is_included ? "bg-bone/40 border-dashed border-slate-300 ml-4" : "bg-bone border-line shadow-xs"
                          }`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                            {/* # number */}
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] font-bold text-muted mb-0.5">#</label>
                              <input
                                type="text"
                                value={it.item_number || `${idx + 1}`}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].item_number = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full px-2 py-1 bg-paper border border-line rounded text-xs font-mono font-bold text-center"
                              />
                            </div>

                            {/* Name & Description */}
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-bold text-muted mb-0.5">Deliverable Name &amp; Description</label>
                              <input
                                type="text"
                                required
                                value={it.name}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].name = e.target.value;
                                  setItems(updated);
                                }}
                                placeholder="e.g. Promotional Videos"
                                className="w-full px-2.5 py-1 bg-paper border border-line rounded text-xs font-semibold outline-none focus:border-ink"
                              />
                              <input
                                type="text"
                                value={it.description || ""}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].description = e.target.value;
                                  setItems(updated);
                                }}
                                placeholder="Description (e.g. Concept, scripting, shooting and editing...)"
                                className="w-full mt-1 px-2.5 py-0.8 bg-paper/60 border border-line/80 rounded text-[11px] text-muted outline-none focus:border-ink"
                              />
                            </div>

                            {/* Qty & Unit */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-muted mb-0.5">Qty / Unit</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantity}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                                    setItems(updated);
                                  }}
                                  className="w-14 px-1.5 py-1 bg-paper border border-line rounded text-xs text-center"
                                />
                                <input
                                  type="text"
                                  value={it.unit || ""}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[idx].unit = e.target.value;
                                    setItems(updated);
                                  }}
                                  placeholder="Unit"
                                  className="w-full px-1.5 py-1 bg-paper border border-line rounded text-xs"
                                />
                              </div>
                            </div>

                            {/* Rate / Included toggle */}
                            <div className="sm:col-span-3">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[10px] font-bold text-muted">Rate ({currency})</label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={it.is_included}
                                    onChange={(e) => {
                                      const updated = [...items];
                                      updated[idx].is_included = e.target.checked;
                                      if (e.target.checked) updated[idx].unit_price = 0;
                                      setItems(updated);
                                    }}
                                    className="rounded border-line text-emerald-600 focus:ring-0 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-emerald-700">Included</span>
                                </label>
                              </div>
                              {it.is_included ? (
                                <div className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold text-center italic">
                                  included in package
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.unit_price}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[idx].unit_price = parseFloat(e.target.value) || 0;
                                    setItems(updated);
                                  }}
                                  className="w-full px-2 py-1 bg-paper border border-line rounded text-xs font-semibold text-right"
                                />
                              )}
                            </div>

                            {/* Delete item button */}
                            <div className="sm:col-span-1 pt-4 text-right">
                              <button
                                type="button"
                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                disabled={items.length <= 1}
                                className="text-muted hover:text-red-600 p-1 rounded transition-colors disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total summary bar */}
                    <div className="mt-4 p-4 bg-bone-2 border border-line rounded-xl flex items-center justify-between">
                      <div className="text-xs text-muted">
                        Total investment calculated for quotation:
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted mr-2">Total Amount:</span>
                        <span className="text-lg font-bold text-ink">
                          {formatCurrency(computedSubtotal, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENT SCHEDULE & TIMELINE */}
              {activeTab === "schedule" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Payment Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Payment Milestones</h3>
                        <p className="text-xs text-muted">Split the total investment into advance and completion milestones.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={applyAutoPaymentSplit}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md transition-colors"
                        >
                          Auto 50% / 50% Split
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSchedule([...paymentSchedule, { milestone: "", amount: 0 }])}
                          className="px-2.5 py-1 text-xs font-medium bg-bone hover:bg-bone-2 text-ink border border-line rounded-md transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Milestone
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {paymentSchedule.map((p, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-bone p-2.5 rounded-lg border border-line">
                          <input
                            type="text"
                            value={p.milestone}
                            onChange={(e) => {
                              const updated = [...paymentSchedule];
                              updated[idx].milestone = e.target.value;
                              setPaymentSchedule(updated);
                            }}
                            placeholder="e.g. 50% Advance — on confirmation..."
                            className="flex-1 px-2.5 py-1 bg-paper border border-line rounded text-xs outline-none focus:border-ink"
                          />
                          <div className="w-32">
                            <input
                              type="number"
                              step="0.01"
                              value={p.amount}
                              onChange={(e) => {
                                const updated = [...paymentSchedule];
                                updated[idx].amount = parseFloat(e.target.value) || 0;
                                setPaymentSchedule(updated);
                              }}
                              placeholder={`Amount (${currency})`}
                              className="w-full px-2 py-1 bg-paper border border-line rounded text-xs font-semibold text-right outline-none focus:border-ink"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaymentSchedule(paymentSchedule.filter((_, i) => i !== idx))}
                            className="text-muted hover:text-red-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Project Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Project Delivery Timeline</h3>
                        <p className="text-xs text-muted">Weekly or phase-based execution deliverables for Page 2.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTimeline([...timeline, { phase: `Week ${timeline.length + 1}`, description: "" }])}
                        className="px-2.5 py-1 text-xs font-medium bg-bone hover:bg-bone-2 text-ink border border-line rounded-md transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Timeline Phase
                      </button>
                    </div>

                    <div className="space-y-2">
                      {timeline.map((t, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-bone p-2.5 rounded-lg border border-line">
                          <div className="w-28 shrink-0">
                            <input
                              type="text"
                              value={t.phase}
                              onChange={(e) => {
                                const updated = [...timeline];
                                updated[idx].phase = e.target.value;
                                setTimeline(updated);
                              }}
                              placeholder="Week 1"
                              className="w-full px-2 py-1 bg-paper border border-line rounded text-xs font-bold outline-none focus:border-ink"
                            />
                          </div>
                          <input
                            type="text"
                            value={t.description}
                            onChange={(e) => {
                              const updated = [...timeline];
                              updated[idx].description = e.target.value;
                              setTimeline(updated);
                            }}
                            placeholder="Deliverables for this phase..."
                            className="flex-1 px-2.5 py-1 bg-paper border border-line rounded text-xs outline-none focus:border-ink"
                          />
                          <button
                            type="button"
                            onClick={() => setTimeline(timeline.filter((_, i) => i !== idx))}
                            className="text-muted hover:text-red-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RESPONSIBILITIES, EXCLUSIONS & TERMS */}
              {activeTab === "terms" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Client Responsibilities */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">Client Responsibilities</label>
                        <button
                          type="button"
                          onClick={() => setClientResponsibilities([...clientResponsibilities, ""])}
                          className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {clientResponsibilities.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-muted text-xs">•</span>
                            <input
                              type="text"
                              value={r}
                              onChange={(e) => {
                                const updated = [...clientResponsibilities];
                                updated[idx] = e.target.value;
                                setClientResponsibilities(updated);
                              }}
                              placeholder="e.g. Access to Instagram / Meta Business Manager..."
                              className="flex-1 px-2 py-1 bg-bone border border-line rounded text-xs outline-none focus:border-ink"
                            />
                            <button
                              type="button"
                              onClick={() => setClientResponsibilities(clientResponsibilities.filter((_, i) => i !== idx))}
                              className="text-muted hover:text-red-600 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exclusions */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">Scope Exclusions</label>
                        <button
                          type="button"
                          onClick={() => setExclusions([...exclusions, ""])}
                          className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {exclusions.map((e, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-muted text-xs">•</span>
                            <input
                              type="text"
                              value={e}
                              onChange={(e) => {
                                const updated = [...exclusions];
                                updated[idx] = e.target.value;
                                setExclusions(updated);
                              }}
                              placeholder="e.g. Meta ad spend (paid directly to Meta)..."
                              className="flex-1 px-2 py-1 bg-bone border border-line rounded text-xs outline-none focus:border-ink"
                            />
                            <button
                              type="button"
                              onClick={() => setExclusions(exclusions.filter((_, i) => i !== idx))}
                              className="text-muted hover:text-red-600 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">Contract Terms &amp; Conditions</label>
                      <button
                        type="button"
                        onClick={() => setTermsConditions([...termsConditions, ""])}
                        className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Term
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {termsConditions.map((tc, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-muted text-xs">•</span>
                          <input
                            type="text"
                            value={tc}
                            onChange={(e) => {
                              const updated = [...termsConditions];
                              updated[idx] = e.target.value;
                              setTermsConditions(updated);
                            }}
                            placeholder="e.g. A 50% advance payment is required to commence..."
                            className="flex-1 px-2.5 py-1 bg-bone border border-line rounded text-xs outline-none focus:border-ink"
                          />
                          <button
                            type="button"
                            onClick={() => setTermsConditions(termsConditions.filter((_, i) => i !== idx))}
                            className="text-muted hover:text-red-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted">
                  {editQuoteId ? "Editing existing SOW" : "New proposal document"}
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-muted hover:text-ink hover:bg-bone transition-colors w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2 bg-[#55B334] hover:bg-[#499e2b] text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {editQuoteId ? "Save Quotation Changes" : "Generate & Save SOW Quotation"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted text-sm">Loading quotations...</div>}>
      <QuotesPageContent />
    </Suspense>
  );
}
