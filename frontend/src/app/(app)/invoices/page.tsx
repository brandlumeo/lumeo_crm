"use client";

import { useState } from "react";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useCustomerPage, useDealPage, useCurrentCompany, useAddInvoicePayment } from "@/lib/queries";
import { downloadInvoicePdf } from "@/lib/api";
import { CreditCard, Plus, Search, Loader2, Copy, Check, ExternalLink, Download, Trash2, DollarSign, Receipt, Edit } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function InvoicesPage() {
  const { data: company } = useCurrentCompany();
  const { data, isLoading } = useInvoices();
  const { data: customerData } = useCustomerPage({});
  const { data: dealData } = useDealPage({});
  
  const createMutation = useCreateInvoice();
  const deleteMutation = useDeleteInvoice();
  const updateMutation = useUpdateInvoice();
  const addPaymentMutation = useAddInvoicePayment();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState<{ customer_id: number | null, deal_id: number | null, due_date: string, items: { name: string, quantity: number, unit_price: number, tax_rate: number }[] }>({ 
    customer_id: null, 
    deal_id: null, 
    due_date: "",
    items: [{ name: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
  });
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_method: "Bank Transfer", transaction_id: "", notes: "" });

  const invoices = data?.results || [];
  const customers = customerData?.results || [];
  const deals = dealData?.results || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.customer_id) return;
    
    // Filter out items without a name
    const validItems = newInvoice.items.filter(item => item.name.trim() !== "");

    const payload: any = { customer: newInvoice.customer_id, items: validItems };
    if (newInvoice.deal_id) payload.deal = newInvoice.deal_id;
    if (newInvoice.due_date) payload.due_date = newInvoice.due_date;
    
    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewInvoice({ customer_id: null, deal_id: null, due_date: "", items: [{ name: "", quantity: 1, unit_price: 0, tax_rate: 0 }] });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, payload: { status } });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/invoice/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || newPayment.amount <= 0) return;
    
    addPaymentMutation.mutate({ id: selectedInvoice.id, payload: newPayment }, {
      onSuccess: () => {
        setIsPaymentModalOpen(false);
        setNewPayment({ amount: 0, payment_method: "Bank Transfer", transaction_id: "", notes: "" });
        setSelectedInvoice(null);
      }
    });
  };

  return (
    <>
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
                      <select
                        value={invoice.status}
                        onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize outline-none transition-colors border cursor-pointer ${
                          invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 focus:border-emerald-400' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-200 focus:border-blue-400' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200 focus:border-red-400' :
                          invoice.status === 'void' ? 'bg-slate-200 text-slate-800 border-slate-300 focus:border-slate-400' :
                          'bg-slate-100 text-slate-800 border-slate-200 focus:border-slate-400'
                        }`}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="void">Void</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">
                      {formatCurrency(parseFloat(invoice.total), company?.currency)}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {invoice.issue_date}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDeleteInvoiceId(invoice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-line"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setNewPayment({ ...newPayment, amount: parseFloat(invoice.amount_due) || 0 });
                            setIsPaymentModalOpen(true);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-line"
                          title="Payments & Receipts"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadInvoicePdf(invoice.id, invoice.invoice_number)}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
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
    </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">New Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            <form onSubmit={handleCreate} id="create-invoice-form" className="p-5 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-ink">Line Items</h3>
                  <button
                    type="button"
                    onClick={() => setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { name: "", quantity: 1, unit_price: 0, tax_rate: 0 }] })}
                    className="text-xs font-medium text-ink bg-bone px-2 py-1 rounded-md border border-line hover:bg-bone-2 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3 p-3 bg-bone-2 rounded-lg border border-line/50">
                      <div className="flex-1 space-y-3">
                        <input
                          required
                          type="text"
                          placeholder="Item description"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...newInvoice.items];
                            newItems[index].name = e.target.value;
                            setNewInvoice({ ...newInvoice, items: newItems });
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
                                const newItems = [...newInvoice.items];
                                newItems[index].quantity = parseInt(e.target.value) || 0;
                                setNewInvoice({ ...newInvoice, items: newItems });
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
                                const newItems = [...newInvoice.items];
                                newItems[index].unit_price = parseFloat(e.target.value) || 0;
                                setNewInvoice({ ...newInvoice, items: newItems });
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
                                const newItems = [...newInvoice.items];
                                newItems[index].tax_rate = parseFloat(e.target.value) || 0;
                                setNewInvoice({ ...newInvoice, items: newItems });
                              }}
                              className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = newInvoice.items.filter((_, i) => i !== index);
                          setNewInvoice({ ...newInvoice, items: newItems });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors mt-1"
                        disabled={newInvoice.items.length === 1}
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
                Total: {formatCurrency(newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price * (1 + item.tax_rate / 100)), 0), company?.currency)}
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
        </div>
      )}

      {deleteInvoiceId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-ink">Delete Invoice</h2>
              <p className="text-muted mt-2 text-sm">
                Are you sure you want to delete this invoice? This action cannot be undone and will remove the invoice from all records.
              </p>
            </div>
            <div className="p-4 border-t border-line bg-bone flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteInvoiceId(null)}
                className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteInvoiceId !== null) {
                    deleteMutation.mutate(deleteInvoiceId, {
                      onSuccess: () => setDeleteInvoiceId(null),
                      onError: (err) => {
                        console.error("Delete failed:", err);
                        alert("Failed to delete invoice. Check console for details.");
                        setDeleteInvoiceId(null);
                      }
                    });
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Receipt className="w-5 h-5 text-muted" />
                Payments for Invoice #{selectedInvoice.invoice_number}
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-bone border border-line rounded-lg text-center">
                  <div className="text-sm text-muted mb-1">Total</div>
                  <div className="font-semibold text-ink">{formatCurrency(parseFloat(selectedInvoice.total), company?.currency)}</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                  <div className="text-sm text-emerald-600 mb-1">Paid</div>
                  <div className="font-semibold text-emerald-700">{formatCurrency(parseFloat(selectedInvoice.amount_paid || "0"), company?.currency)}</div>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
                  <div className="text-sm text-red-600 mb-1">Due</div>
                  <div className="font-semibold text-red-700">{formatCurrency(parseFloat(selectedInvoice.amount_due || "0"), company?.currency)}</div>
                </div>
              </div>

              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-ink mb-3">Payment History</h3>
                  <div className="space-y-3">
                    {selectedInvoice.payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-bone border border-line rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-ink">{payment.payment_method}</div>
                          <div className="text-xs text-muted mt-0.5">{payment.payment_date} • {payment.receipt_number}</div>
                        </div>
                        <div className="font-semibold text-emerald-600">
                          {formatCurrency(parseFloat(payment.amount), company?.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parseFloat(selectedInvoice.amount_due) > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-ink mb-3 border-t border-line pt-6">Record New Payment</h3>
                  <form onSubmit={handleAddPayment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Amount</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          max={selectedInvoice.amount_due}
                          value={newPayment.amount || ""}
                          onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Payment Method</label>
                        <select
                          required
                          value={newPayment.payment_method}
                          onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                          className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Check">Check</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Transaction ID / Reference (Optional)</label>
                      <input
                        type="text"
                        value={newPayment.transaction_id}
                        onChange={(e) => setNewPayment({ ...newPayment, transaction_id: e.target.value })}
                        className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addPaymentMutation.isPending}
                      className="w-full bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      {addPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Payment"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
