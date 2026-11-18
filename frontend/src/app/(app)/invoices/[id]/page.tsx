"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInvoice, useUpdateInvoice, useCustomerPage, useDealPage, useCurrentCompany, useUnits } from "@/lib/queries";
import { Loader2, ArrowLeft, Plus, Trash2, Save, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ShareButton } from "@/components/share-button";
import { DocTaxPanel, DocTaxTotals, LineTaxRate } from "@/components/tax-panel";
import {
  SALES_TAX_REGIMES,
  applyTaxPatch,
  computeDocTax,
  lineTaxFields,
  normalizeTaxId,
  taxPayload,
  taxSettingsFromDoc,
  type DocTaxSettings,
} from "@/lib/tax";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = parseInt(resolvedParams.id);
  
  const { data: invoice, isLoading: isInvoiceLoading } = useInvoice(id);
  const { data: customersData } = useCustomerPage({ limit: 100 });
  const { data: dealsData } = useDealPage({ limit: 100 });
  const { data: company } = useCurrentCompany();
  const updateMutation = useUpdateInvoice();
  
  const customers = customersData?.results || [];
  const deals = dealsData?.results || [];
  const { data: unitsData } = useUnits();
  const units = Array.isArray(unitsData) ? unitsData : (unitsData as any)?.results || [];

  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoice_number: invoice.invoice_number || "",
        customer_id: invoice.customer || "",
        deal_id: invoice.deal || "",
        status: invoice.status || "draft",
        issue_date: invoice.issue_date || "",
        due_date: invoice.due_date || "",
        items: invoice.items?.length > 0 ? invoice.items.map((item: any) => ({
          name: item.name || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          tax_rate: parseFloat(item.tax_rate) || 0,
          tax_category: item.tax_category || "",
          hsn_sac_code: item.hsn_sac_code || "",
          unit: item.unit || "",
        })) : [{ name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, unit: "" }],
        tax: taxSettingsFromDoc(invoice, company),
      });
    }
  }, [invoice, company]);

  if (isInvoiceLoading || !formData) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink/50" />
      </div>
    );
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const tax: DocTaxSettings = formData.tax;
  const taxCfg = SALES_TAX_REGIMES[tax.tax_regime];
  const showHsn = tax.taxApplicable && taxCfg.showHsn;
  const patchTax = (patch: Partial<DocTaxSettings>) => {
    const next = applyTaxPatch(tax, patch, formData.items, company);
    setFormData({ ...formData, tax: next.settings, items: next.items });
  };

  const addItem = () => {
    const rate = tax.taxApplicable ? taxCfg.defaultRate : 0;
    setFormData({
      ...formData,
      items: [...formData.items, { name: "", description: "", quantity: 1, unit_price: 0, tax_rate: rate, tax_category: rate > 0 ? "standard" : "", unit: "" }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const totals = computeDocTax(formData.items, tax);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      toast.error("Customer is required");
      return;
    }
    
    const validItems = formData.items
      .filter((item: any) => item.name.trim() !== "")
      .map((item: any) => ({ ...item, ...lineTaxFields(item, tax) }));
    if (validItems.length === 0) {
      toast.error("At least one valid line item is required");
      return;
    }

    const payload: any = {
      customer: parseInt(formData.customer_id),
      invoice_number: formData.invoice_number,
      status: formData.status,
      issue_date: formData.issue_date || null,
      due_date: formData.due_date || null,
      items: validItems,
      ...taxPayload(tax),
    };

    if (formData.deal_id) {
      payload.deal = parseInt(formData.deal_id);
    } else {
      payload.deal = null;
    }

    updateMutation.mutate({ id, payload }, {
      onSuccess: () => {
        toast.success("Invoice updated successfully");
        router.push("/invoices");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to update invoice");
      }
    });
  };

  // Show amounts in the invoice's own currency (falls back to the company currency).
  const docCurrency = ((invoice as any)?.currency || company?.currency || "USD").toUpperCase();
  const CURRENCY_SIGNS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };
  const curr = CURRENCY_SIGNS[docCurrency] || `${docCurrency} `;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="p-2 -ml-2 text-muted hover:text-ink hover:bg-bone-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-ink">Edit Invoice</h1>
          <p className="text-sm text-muted">{formData.invoice_number}</p>
        </div>
        <ShareButton docType="invoice" docId={id} variant="button" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Core Details */}
        <div className="bg-paper border border-line rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-ink mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted" /> Document Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Customer *</label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) => {
                  const c: any = customers.find((x: any) => String(x.id) === e.target.value);
                  const next = c?.tax_id ? applyTaxPatch(tax, { customer_tax_id: normalizeTaxId(c.tax_id) }, formData.items, company) : null;
                  setFormData({ ...formData, customer_id: e.target.value, ...(next ? { tax: next.settings, items: next.items } : {}) });
                }}
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
              >
                <option value="">Select a customer</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Project / Deal</label>
              <select
                value={formData.deal_id || ""}
                onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
              >
                <option value="">No deal attached</option>
                {deals.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Invoice Number</label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                placeholder="INV-XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="void">Void</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Issue Date</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
              />
            </div>
          </div>
        </div>

        <DocTaxPanel value={tax} onChange={patchTax} docLabel="invoice" />

        {/* Line Items */}
        <div className="bg-paper border border-line rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-ink">Line Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 bg-bone-2 text-ink rounded-md text-sm font-medium hover:bg-line transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.items.map((item: any, i: number) => (
              <div key={i} className="flex gap-4 items-start p-4 bg-bone/50 border border-line rounded-lg">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Item Name / Service *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Web Development"
                        value={item.name}
                        onChange={(e) => handleItemChange(i, "name", e.target.value)}
                        className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Quantity *</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(i, "quantity", parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                        />
                        <select
                          value={item.unit || ""}
                          onChange={(e) => handleItemChange(i, "unit", e.target.value)}
                          className="w-24 px-2 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                        >
                          <option value="">None</option>
                          {units.map((u: any) => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Unit Price ({curr}) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(i, "unit_price", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">{taxCfg.taxName}</label>
                      {tax.taxApplicable ? (
                        <LineTaxRate
                          regime={tax.tax_regime}
                          rate={item.tax_rate}
                          category={item.tax_category}
                          onChange={(rate, category) => {
                            const newItems = [...formData.items];
                            newItems[i] = { ...newItems[i], tax_rate: rate, tax_category: category };
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted border border-dashed border-line rounded-md">Not charged</div>
                      )}
                    </div>
                  </div>
                  {showHsn && (
                    <div className="max-w-[200px]">
                      <label className="block text-xs font-medium text-muted mb-1">HSN / SAC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="e.g. 998314"
                        value={item.hsn_sac_code || ""}
                        onChange={(e) => handleItemChange(i, "hsn_sac_code", e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm font-mono outline-none focus:border-ink transition-colors"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="mt-6 p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  disabled={formData.items.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-sm bg-bone-2 p-5 rounded-lg border border-line">
              <DocTaxTotals totals={totals} settings={tax} currency={docCurrency} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/invoices" className="px-5 py-2.5 text-sm font-medium text-ink bg-bone-2 hover:bg-line rounded-lg transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-paper bg-ink hover:opacity-90 rounded-lg transition-opacity disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
