"use client";

import { useState } from "react";
import { useQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote, useCustomerPage, useDealPage } from "@/lib/queries";
import { downloadQuotePdf } from "@/lib/api";
import { FileText, Plus, Search, Loader2, Copy, Check, ExternalLink, Download, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

export default function QuotesPage() {
  const { data, isLoading } = useQuotes();
  const { data: customerData } = useCustomerPage({});
  const { data: dealData } = useDealPage({});
  
  const createMutation = useCreateQuote();
  const deleteMutation = useDeleteQuote();
  const updateMutation = useUpdateQuote();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState<{ title: string, customer_id: number | null, deal_id: number | null, valid_until: string, items: { name: string, quantity: number, unit_price: number, tax_rate: number }[] }>({ 
    title: "",
    customer_id: null, 
    deal_id: null, 
    valid_until: "",
    items: [{ name: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
  });
  const [deleteQuoteId, setDeleteQuoteId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const quotes = data?.results || [];
  const customers = customerData?.results || [];
  const deals = dealData?.results || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.customer_id || !newQuote.title.trim()) return;
    
    const validItems = newQuote.items.filter(item => item.name.trim() !== "");

    const payload: any = { 
      title: newQuote.title,
      customer: newQuote.customer_id, 
      items: validItems 
    };
    if (newQuote.deal_id) payload.deal = newQuote.deal_id;
    if (newQuote.valid_until) payload.valid_until = newQuote.valid_until;
    
    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewQuote({ title: "", customer_id: null, deal_id: null, valid_until: "", items: [{ name: "", quantity: 1, unit_price: 0, tax_rate: 0 }] });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, payload: { status } });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/quote/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Quotes</h1>
          <p className="text-muted text-sm mt-1">Create quotes and share them securely with clients for e-signatures.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line flex items-center gap-3 bg-bone-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search quotes..."
              className="w-full pl-9 pr-4 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable columns={5} rows={8} />
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes found"
            description="Create your first quote to send proposals to your prospective clients."
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap relative">
              <thead className="sticky top-0 z-10 text-muted bg-bone/80 backdrop-blur-md shadow-[0_1px_0_0_var(--color-line)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Quote ID / Title</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotes.map((quote: any) => (
                  <tr key={quote.id} className="hover:bg-bone-2/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-ink">{quote.title || "Untitled Quote"}</div>
                      <div className="text-xs text-muted mt-1">{quote.quote_number}</div>
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={quote.status}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize outline-none transition-colors border cursor-pointer ${
                          quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 focus:border-emerald-400' :
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-200 focus:border-blue-400' :
                          quote.status === 'declined' ? 'bg-red-100 text-red-800 border-red-200 focus:border-red-400' :
                          quote.status === 'expired' ? 'bg-amber-100 text-amber-800 border-amber-200 focus:border-amber-400' :
                          'bg-slate-100 text-slate-800 border-slate-200 focus:border-slate-400'
                        }`}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="declined">Declined</option>
                        <option value="expired">Expired</option>
                      </select>
                    </td>
                    <td className="px-6 py-3 font-medium text-ink">
                      ${parseFloat(quote.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDeleteQuoteId(quote.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-line"
                          title="Delete Quote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadQuotePdf(quote.id, quote.quote_number)}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/public/quote/${quote.public_token}`, '_blank')}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                          title="Open Public Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(quote.public_token)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-bone-2 text-ink hover:bg-line rounded-md transition-colors"
                        >
                          {copiedLink === quote.public_token ? (
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
    </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">New Quote</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            <form onSubmit={handleCreate} id="create-quote-form" className="p-5 overflow-y-auto space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Quote Title *</label>
                <input
                  required
                  type="text"
                  value={newQuote.title}
                  onChange={(e) => setNewQuote({ ...newQuote, title: e.target.value })}
                  placeholder="e.g. Website Redesign"
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Customer *</label>
                  <select
                    required
                    value={newQuote.customer_id || ""}
                    onChange={(e) => setNewQuote({ ...newQuote, customer_id: parseInt(e.target.value) || null })}
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
                    value={newQuote.deal_id || ""}
                    onChange={(e) => setNewQuote({ ...newQuote, deal_id: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                  >
                    <option value="">Select a deal</option>
                    {deals.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Valid Until (Optional)</label>
                  <input
                    type="date"
                    value={newQuote.valid_until}
                    onChange={(e) => setNewQuote({ ...newQuote, valid_until: e.target.value })}
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-ink">Line Items</h3>
                  <button
                    type="button"
                    onClick={() => setNewQuote({ ...newQuote, items: [...newQuote.items, { name: "", quantity: 1, unit_price: 0, tax_rate: 0 }] })}
                    className="text-xs font-medium text-ink bg-bone px-2 py-1 rounded-md border border-line hover:bg-bone-2 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newQuote.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3 p-3 bg-bone-2 rounded-lg border border-line/50">
                      <div className="flex-1 space-y-3">
                        <input
                          required
                          type="text"
                          placeholder="Item description"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...newQuote.items];
                            newItems[index].name = e.target.value;
                            setNewQuote({ ...newQuote, items: newItems });
                          }}
                          className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                        />
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-20">
                            <input
                              required
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={item.quantity || ""}
                              onChange={(e) => {
                                const newItems = [...newQuote.items];
                                newItems[index].quantity = parseInt(e.target.value) || 0;
                                setNewQuote({ ...newQuote, items: newItems });
                              }}
                              className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Price"
                              value={item.unit_price || ""}
                              onChange={(e) => {
                                const newItems = [...newQuote.items];
                                newItems[index].unit_price = parseFloat(e.target.value) || 0;
                                setNewQuote({ ...newQuote, items: newItems });
                              }}
                              className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                            />
                          </div>
                          <div className="w-20">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Tax %"
                              value={item.tax_rate || ""}
                              onChange={(e) => {
                                const newItems = [...newQuote.items];
                                newItems[index].tax_rate = parseFloat(e.target.value) || 0;
                                setNewQuote({ ...newQuote, items: newItems });
                              }}
                              className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = newQuote.items.filter((_, i) => i !== index);
                          setNewQuote({ ...newQuote, items: newItems });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors mt-1"
                        disabled={newQuote.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
            <div className="p-5 border-t border-line bg-bone flex justify-between items-center mt-auto">
              <div className="text-sm font-medium text-ink">
                Total: ${newQuote.items.reduce((sum, item) => sum + (item.quantity * item.unit_price * (1 + item.tax_rate / 100)), 0).toFixed(2)}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="create-quote-form"
                  type="submit"
                  disabled={createMutation.isPending || !newQuote.customer_id || !newQuote.title.trim()}
                  className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Quote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteQuoteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-ink">Delete Quote</h2>
              <p className="text-muted mt-2 text-sm">
                Are you sure you want to delete this quote? This action cannot be undone and will remove the quote from all records.
              </p>
            </div>
            <div className="p-4 border-t border-line bg-bone flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteQuoteId(null)}
                className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteQuoteId !== null) {
                    deleteMutation.mutate(deleteQuoteId, {
                      onSuccess: () => setDeleteQuoteId(null),
                      onError: (err) => {
                        console.error("Delete failed:", err);
                        alert("Failed to delete quote. Check console for details.");
                        setDeleteQuoteId(null);
                      }
                    });
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Quote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
