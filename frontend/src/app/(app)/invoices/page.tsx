"use client";

import { useState } from "react";
import { useInvoices, useCreateInvoice, useDeleteInvoice, useCustomerPage, useDealPage } from "@/lib/queries";
import { CreditCard, Plus, Search, Loader2, Copy, Check, ExternalLink } from "lucide-react";

export default function InvoicesPage() {
  const { data, isLoading } = useInvoices({ page_size: 100 });
  const { data: customerData } = useCustomerPage({ page_size: 100 });
  const { data: dealData } = useDealPage({ page_size: 100 });
  
  const createMutation = useCreateInvoice();
  const deleteMutation = useDeleteInvoice();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState<{ customer_id: number | null, deal_id: number | null, due_date: string }>({ 
    customer_id: null, 
    deal_id: null, 
    due_date: "" 
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const invoices = data?.results || [];
  const customers = customerData?.results || [];
  const deals = dealData?.results || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.customer_id) return;
    
    createMutation.mutate(newInvoice as any, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewInvoice({ customer_id: null, deal_id: null, due_date: "" });
      }
    });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/invoice/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-muted text-sm mt-1">Bill your clients and collect e-signatures or payments securely.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line flex items-center gap-3 bg-bone-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full pl-9 pr-4 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-line shadow-sm">
              <CreditCard className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-ink">No invoices found</h3>
            <p className="text-muted text-sm mt-1 mb-6 max-w-sm">Create your first invoice to get paid by your customers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bone-2 border-b border-line">
                <tr>
                  <th className="px-6 py-4 font-medium text-muted">Invoice Number</th>
                  <th className="px-6 py-4 font-medium text-muted">Status</th>
                  <th className="px-6 py-4 font-medium text-muted">Total</th>
                  <th className="px-6 py-4 font-medium text-muted">Issue Date</th>
                  <th className="px-6 py-4 font-medium text-muted text-right">Public Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-bone-2/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink">{invoice.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">
                      ${parseFloat(invoice.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {invoice.issue_date}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/public/invoice/${invoice.public_token}`, '_blank')}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                          title="Open Public Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(invoice.public_token)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-bone-2 text-ink hover:bg-line rounded-md transition-colors"
                        >
                          {copiedLink === invoice.public_token ? (
                            <><Check className="w-4 h-4 text-emerald-600" /> Copied</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Copy Link</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">New Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            <form onSubmit={handleCreate} id="create-invoice-form" className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Customer *</label>
                <select
                  required
                  value={newInvoice.customer_id || ""}
                  onChange={(e) => setNewInvoice({ ...newInvoice, customer_id: parseInt(e.target.value) || null })}
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                >
                  <option value="">Select a customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Deal (Optional)</label>
                <select
                  value={newInvoice.deal_id || ""}
                  onChange={(e) => setNewInvoice({ ...newInvoice, deal_id: parseInt(e.target.value) || null })}
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                >
                  <option value="">Select a deal</option>
                  {deals.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Due Date (Optional)</label>
                <input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                />
              </div>
            </form>
            <div className="p-5 border-t border-line bg-bone flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                form="create-invoice-form"
                type="submit"
                disabled={createMutation.isPending || !newInvoice.customer_id}
                className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
