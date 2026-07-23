"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInvoice, useUpdateInvoice, useCustomerPage, useDealPage, useCurrentCompany } from "@/lib/queries";
import { Loader2, ArrowLeft, Plus, Trash2, Save, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
        })) : [{ name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
      });
    }
  }, [invoice]);

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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
  };
  
  const calculateTax = () => {
    return formData.items.reduce((sum: number, item: any) => {
      const lineTotal = item.quantity * item.unit_price;
      return sum + (lineTotal * (item.tax_rate / 100));
    }, 0);
  };
  
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      toast.error("Customer is required");
      return;
    }
    
    const validItems = formData.items.filter((item: any) => item.name.trim() !== "");
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
      items: validItems
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

  const curr = company?.currency ? 
    (company.currency === 'USD' ? '$' : company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : company.currency === 'INR' ? '₹' : company.currency) 
    : '$';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="p-2 -ml-2 text-muted hover:text-ink hover:bg-bone-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit Invoice</h1>
          <p className="text-sm text-muted">{formData.invoice_number}</p>
        </div>
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
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Additional Details (HSN/SAC, etc.)</label>
                      <input
                        type="text"
                        placeholder="Optional details or codes"
                        value={item.description}
                        onChange={(e) => handleItemChange(i, "description", e.target.value)}
                        className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(i, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                      />
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
                      <label className="block text-xs font-medium text-muted mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.tax_rate}
                        onChange={(e) => handleItemChange(i, "tax_rate", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                      />
                    </div>
                  </div>
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
            <div className="w-full max-w-sm space-y-3 bg-bone-2 p-5 rounded-lg border border-line">
              <div className="flex justify-between text-sm text-muted">
                <span>Subtotal</span>
                <span>{curr}{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted">
                <span>Tax</span>
                <span>{curr}{calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-ink pt-3 border-t border-line/50">
                <span>Total</span>
                <span>{curr}{calculateTotal().toFixed(2)}</span>
              </div>
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
