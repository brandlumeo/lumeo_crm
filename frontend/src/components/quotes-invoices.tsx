"use client";
import { toast } from "sonner";


import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Download, X, Receipt } from "lucide-react";
import {
  fetchQuotes,
  createQuote,
  fetchInvoices,
  createInvoice,
  fetchProducts,
  fetchCustomerPage,
  downloadQuotePdf,
  downloadInvoicePdf,
} from "@/lib/api";
import { formatDateTime, formatINR, toNumber } from "@/lib/utils";
import { useInvoiceSettings } from "@/lib/queries";
import type { Quote, Invoice } from "@/lib/types";

interface QuotesInvoicesProps {
  dealId: number;
}

export function QuotesInvoices({ dealId }: QuotesInvoicesProps) {
  const queryClient = useQueryClient();
  const { data: invoiceSettings } = useInvoiceSettings();
  const [activeTab, setActiveTab] = useState<"quotes" | "invoices">("quotes");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderType, setBuilderType] = useState<"quote" | "invoice">("quote");

  // Form State
  const [title, setTitle] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<
    {
      product?: number;
      name: string;
      description: string;
      quantity: number;
      unit_price: string;
      tax_rate: string;
      hsn_sac_code?: string;
    }[]
  >([]);

  // Fetch Quotes & Invoices
  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ["crm", "quotes", { deal: dealId }],
    queryFn: () => fetchQuotes({ deal: dealId }),
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["crm", "invoices", { deal: dealId }],
    queryFn: () => fetchInvoices({ deal: dealId }),
  });

  // Fetch products for catalog autocomplete
  const { data: productsData } = useQuery({
    queryKey: ["crm", "products"],
    queryFn: () => fetchProducts({ limit: 100 }),
  });

  // Fetch customers for invoice recipient selection
  const { data: customersData } = useQuery({
    queryKey: ["crm", "customers"],
    queryFn: () => fetchCustomerPage({ limit: 100 }),
  });

  // Create Mutations
  const quoteMutation = useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "quotes"] });
      closeBuilder();
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "invoices"] });
      closeBuilder();
    },
  });

  const quotes = quotesData?.results ?? [];
  const invoices = invoicesData?.results ?? [];
  const catalogProducts = productsData?.results ?? [];
  const customers = customersData?.results ?? [];

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    setTitle("");
    setSelectedCustomer("");
    setDueDate("");
    setItems([]);
  };

  const handleProductSelect = (index: number, productIdStr: string) => {
    const prodId = parseInt(productIdStr, 10);
    const selectedProd = catalogProducts.find((p) => p.id === prodId);
    if (!selectedProd) return;

    setItems((current) => {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        product: prodId,
        name: selectedProd.name,
        description: selectedProd.description || "",
        unit_price: selectedProd.price,
        tax_rate: selectedProd.tax_rate,
        hsn_sac_code: selectedProd.hsn_sac_code || "",
      };
      return updated;
    });
  };

  const updateItemField = (index: number, field: string, value: any) => {
    setItems((current) => {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const addItemRow = () => {
    setItems((current) => [
      ...current,
      { 
        name: "", 
        description: "", 
        quantity: 1, 
        unit_price: "0", 
        tax_rate: invoiceSettings?.default_tax_rate?.toString() || "0",
        hsn_sac_code: ""
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  // Live Calculations
  const subtotal = items.reduce(
    (acc, item) => acc + toNumber(item.unit_price) * item.quantity,
    0
  );
  const taxAmount = items.reduce((acc, item) => {
    const itemSub = toNumber(item.unit_price) * item.quantity;
    return acc + itemSub * (toNumber(item.tax_rate) / 100);
  }, 0);
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    if (builderType === "quote") {
      quoteMutation.mutate({
        deal: dealId,
        title,
        items,
      });
    } else {
      if (!selectedCustomer) {
        toast.error("Please select a customer for the invoice.");
        return;
      }
      invoiceMutation.mutate({
        deal: dealId,
        customer: parseInt(selectedCustomer, 10),
        due_date: dueDate || undefined,
        items,
      });
    }
  };

  return (
    <div className="card animate-rise" style={{ animationDelay: "100ms" }}>
      <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="card-title">
          Quotes & Invoices
          <span className="card-title-meta">Financial documents</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setBuilderType("quote");
              setIsBuilderOpen(true);
            }}
            className="btn btn-primary text-[12px] py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Quote
          </button>
          <button
            onClick={() => {
              setBuilderType("invoice");
              setIsBuilderOpen(true);
            }}
            className="btn btn-secondary text-[12px] py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Invoice
          </button>
        </div>
      </div>

      <div className="px-5 border-b border-line flex gap-4">
        <button
          onClick={() => setActiveTab("quotes")}
          className={`py-3 text-[13px] font-medium transition-colors border-b-2 -mb-[2px] ${
            activeTab === "quotes"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Quotes ({quotes.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`py-3 text-[13px] font-medium transition-colors border-b-2 -mb-[2px] ${
            activeTab === "invoices"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Invoices ({invoices.length})
        </button>
      </div>

      <div className="p-5">
        {activeTab === "quotes" ? (
          quotesLoading ? (
            <div className="text-sm text-muted">Loading quotes...</div>
          ) : quotes.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted">
              No quotes generated for this deal yet.
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-3 bg-bone-2 rounded-lg border border-line"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] bg-bone border border-line px-1.5 py-0.5 rounded text-ink">
                        {quote.quote_number}
                      </span>
                      <span className="text-[13px] font-medium text-ink">
                        {quote.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-1">
                      Created {formatDateTime(quote.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-serif text-[14px] text-ink">
                      {formatINR(toNumber(quote.total))}
                    </span>
                    <button
                      onClick={() => void downloadQuotePdf(quote.id, quote.quote_number)}
                      className="p-1.5 hover:bg-bone rounded border border-transparent hover:border-line text-muted hover:text-ink transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : invoicesLoading ? (
          <div className="text-sm text-muted">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">
            No invoices generated for this deal yet.
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-bone-2 rounded-lg border border-line"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-bone border border-line px-1.5 py-0.5 rounded text-ink">
                      {invoice.invoice_number}
                    </span>
                    <span className="chip chip-positive text-[10px] scale-90">
                      {invoice.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-1">
                    Issued {formatDateTime(invoice.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-serif text-[14px] text-ink">
                    {formatINR(toNumber(invoice.total))}
                  </span>
                  <button
                    onClick={() => void downloadInvoicePdf(invoice.id, invoice.invoice_number)}
                    className="p-1.5 hover:bg-bone rounded border border-transparent hover:border-line text-muted hover:text-ink transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal/Overlay Document Builder */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bone w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl border border-line flex flex-col animate-rise">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <h3 className="font-serif text-[20px] text-ink">
                  New {builderType === "quote" ? "Quote" : "Invoice"} Builder
                </h3>
              </div>
              <button
                onClick={closeBuilder}
                className="p-1.5 hover:bg-bone-2 rounded-md border border-transparent hover:border-line text-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {builderType === "quote" ? (
                  <label className="block">
                    <span className="label">Quote Title</span>
                    <input
                      required
                      placeholder="e.g. Enterprise License Deployment"
                      className="input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <label className="block">
                      <span className="label">Customer Recipient</span>
                      <select
                        required
                        className="input"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                      >
                        <option value="">-- Choose Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="label">Due Date (Optional)</span>
                      <input
                        type="date"
                        className="input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink uppercase tracking-wider">
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="btn btn-secondary text-[11px] py-1 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-1 md:grid-cols-[1.5fr_1fr_80px_120px_100px_40px] gap-3 p-3 bg-bone-2 border border-line rounded-lg items-end ${invoiceSettings?.show_hsn_sac_code ? "md:grid-cols-[1.5fr_1fr_100px_80px_120px_100px_40px]" : ""}`}
                    >
                      <label className="block">
                        <span className="label-meta text-[11px]">Product Auto-fill</span>
                        <select
                          className="input"
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          defaultValue=""
                        >
                          <option value="">-- Choose Catalog Product --</option>
                          {catalogProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatINR(toNumber(p.price))})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="label-meta text-[11px]">Name / Override</span>
                        <input
                          required
                          className="input"
                          value={item.name}
                          placeholder="Software License"
                          onChange={(e) => updateItemField(idx, "name", e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="label-meta text-[11px]">Qty</span>
                        <input
                          required
                          type="number"
                          min="1"
                          className="input"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemField(idx, "quantity", parseInt(e.target.value, 10))
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="label-meta text-[11px]">Unit Price (INR)</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          className="input"
                          value={item.unit_price}
                          onChange={(e) => updateItemField(idx, "unit_price", e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="label-meta text-[11px]">Tax Rate (%)</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          className="input"
                          value={item.tax_rate}
                          onChange={(e) => updateItemField(idx, "tax_rate", e.target.value)}
                        />
                      </label>

                      {invoiceSettings?.show_hsn_sac_code && (
                        <label className="block">
                          <span className="label-meta text-[11px]">HSN/SAC</span>
                          <input
                            className="input"
                            value={item.hsn_sac_code || ""}
                            onChange={(e) => updateItemField(idx, "hsn_sac_code", e.target.value)}
                          />
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="btn btn-secondary border-red-200 text-red-600 hover:bg-red-50 p-2 mb-0.5 justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-6 text-center text-xs text-muted border border-dashed border-line rounded-lg">
                      No line items added yet. Click "Add Row" to start building.
                    </div>
                  )}
                </div>
              </div>

              {/* Running Totals Block */}
              <div className="border-t border-line pt-4 flex flex-col items-end gap-2 text-right">
                <div className="text-[13px] text-muted">
                  Subtotal: <span className="font-serif font-medium text-ink ml-2">{formatINR(subtotal)}</span>
                </div>
                <div className="text-[13px] text-muted">
                  Tax: <span className="font-serif font-medium text-ink ml-2">{formatINR(taxAmount)}</span>
                </div>
                <div className="text-[16px] text-ink font-serif font-semibold border-t border-line pt-2">
                  Total: <span className="ml-2 text-accent">{formatINR(grandTotal)}</span>
                </div>
              </div>

              <div className="border-t border-line pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeBuilder}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quoteMutation.isPending || invoiceMutation.isPending}
                  className="btn btn-primary"
                >
                  {quoteMutation.isPending || invoiceMutation.isPending
                    ? "Generating..."
                    : "Generate Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
