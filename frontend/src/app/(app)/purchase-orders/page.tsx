"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { FileText, Plus, Search, Check, ExternalLink, Download, Trash2, Loader2, Edit2, ShoppingBag, Receipt } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { usePurchaseOrderPage, useVendorPage, useConvertPurchaseOrderToBill, useCurrentCompany } from "@/lib/queries";
import { createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, updatePurchaseOrderStatus, downloadPurchaseOrderPdf } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePurchaseOrderPage({});
  const { data: vendorData } = useVendorPage({ limit: 100 });
  const convertMutation = useConvertPurchaseOrderToBill();
  const { data: company } = useCurrentCompany();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPoId, setEditPoId] = useState<number | null>(null);
  const [deletePoId, setDeletePoId] = useState<number | null>(null);
  
  const [newPo, setNewPo] = useState<{ vendor: number | null, issue_date: string, expected_delivery_date: string, status: string, notes: string, terms_conditions: string, items: { description: string, quantity: number, unit_price: number, tax_rate: number }[] }>({ 
    vendor: null, 
    issue_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    status: "draft",
    notes: "",
    terms_conditions: "",
    items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
  });

  const poList = data?.results || [];
  const vendors = vendorData?.results || [];

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["crm", "purchase-orders"] });
      toast.success("Purchase Order created successfully");
    },
    onError: (err: any) => {
        const data = err.response?.data;
        const errorMsg = data?.error || (data && typeof data === 'object' ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ') : "Failed to create PO");
        toast.error(errorMsg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number, payload: any }) => updatePurchaseOrder(id, payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["crm", "purchase-orders"] });
      toast.success("Purchase Order updated successfully");
    },
    onError: (err: any) => {
        const data = err.response?.data;
        const errorMsg = data?.error || (data && typeof data === 'object' ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ') : "Failed to update PO");
        toast.error(errorMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () => {
      setDeletePoId(null);
      queryClient.invalidateQueries({ queryKey: ["crm", "purchase-orders"] });
      toast.success("Purchase Order deleted");
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => updatePurchaseOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "purchase-orders"] });
      toast.success("Status updated");
    }
  });

  const resetForm = () => {
    setEditPoId(null);
    setNewPo({ 
      vendor: null, 
      issue_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: "",
      status: "draft",
      notes: "",
      terms_conditions: "",
      items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
    });
  };

  const handleConvertToBill = (po: any) => {
    convertMutation.mutate(po.id, {
      onSuccess: (data) => {
        toast.success(`Bill created: ${data.bill_number}`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to convert to bill");
      }
    });
  };

  const handleEditClick = (po: any) => {
    setEditPoId(po.id);
    setNewPo({
      vendor: po.vendor,
      issue_date: po.issue_date,
      expected_delivery_date: po.expected_delivery_date || "",
      status: po.status,
      notes: po.notes || "",
      terms_conditions: po.terms_conditions || "",
      items: po.items.map((item: any) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        tax_rate: parseFloat(item.tax_rate)
      }))
    });
    setIsCreateOpen(true);
  };

  const calculateSubtotal = () => {
    return newPo.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return newPo.items.reduce((sum, item) => sum + (item.quantity * item.unit_price * (item.tax_rate / 100)), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPo.vendor) return;
    
    const validItems = newPo.items.filter(item => item.description.trim() !== "");
    
    const payload = {
      ...newPo,
      expected_delivery_date: newPo.expected_delivery_date || null,
      items: validItems,
      subtotal: calculateSubtotal(),
      tax_amount: calculateTax(),
      total_amount: calculateTotal(),
    };
    
    if (editPoId) {
      updateMutation.mutate({ id: editPoId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <PageShell
      eyebrow="Finance"
      title="Purchase Orders"
      description="Manage your purchase orders and send them to vendors."
    >
      <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm animate-rise">
        <div className="p-4 border-b border-line flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between bg-bone-2">
          <div className="font-medium text-ink">All Purchase Orders</div>
          <button 
            className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            New Purchase Order
          </button>
        </div>

        {isLoading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : poList.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchase orders"
            description="Create your first PO to start ordering from vendors."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bone-2 border-b border-line">
                <tr>
                  <th className="px-6 py-4 font-medium text-muted">PO Number</th>
                  <th className="px-6 py-4 font-medium text-muted">Vendor</th>
                  <th className="px-6 py-4 font-medium text-muted">Date</th>
                  <th className="px-6 py-4 font-medium text-muted">Total</th>
                  <th className="px-6 py-4 font-medium text-muted">Status</th>
                  <th className="px-6 py-4 font-medium text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {poList.map((po: any) => (
                  <tr key={po.id} className="hover:bg-bone-2/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink">{po.po_number}</div>
                    </td>
                    <td className="px-6 py-4 text-muted">{po.vendor_details?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-muted">{po.issue_date}</td>
                    <td className="px-6 py-4 font-medium text-ink">{formatCurrency(parseFloat(po.total_amount), company?.currency || "USD")}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={po.status}
                        onChange={(e) => statusMutation.mutate({ id: po.id, status: e.target.value })}
                        disabled={statusMutation.isPending}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize outline-none transition-colors border cursor-pointer ${
                          po.status === 'draft' ? 'bg-slate-100 text-slate-800 border-slate-200 focus:border-slate-400' :
                          po.status === 'pending_approval' ? 'bg-amber-100 text-amber-800 border-amber-200 focus:border-amber-400' :
                          po.status === 'approved' ? 'bg-blue-100 text-blue-800 border-blue-200 focus:border-blue-400' :
                          po.status === 'sent' ? 'bg-indigo-100 text-indigo-800 border-indigo-200 focus:border-indigo-400' :
                          po.status === 'billed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 focus:border-emerald-400' :
                          'bg-rose-100 text-rose-800 border-rose-200 focus:border-rose-400'
                        }`}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="sent">Sent</option>
                        <option value="billed">Billed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(po)}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line bg-paper"
                          title="Edit PO"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => downloadPurchaseOrderPdf(po.id, po.po_number)}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line bg-paper"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {(po.status === 'approved' || po.status === 'sent') && (
                          <button 
                            onClick={() => handleConvertToBill(po)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 bg-paper"
                            title="Convert to Bill"
                            disabled={convertMutation.isPending}
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => setDeletePoId(po.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200 bg-paper"
                          title="Delete PO"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {isCreateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-rise">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">{editPoId ? "Edit Purchase Order" : "New Purchase Order"}</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            
            <form onSubmit={handleCreate} id="create-po-form" className="p-5 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Vendor *</label>
                  <select 
                    required
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newPo.vendor || ""}
                    onChange={(e) => setNewPo({...newPo, vendor: parseInt(e.target.value)})}
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Status</label>
                  <select 
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newPo.status}
                    onChange={(e) => setNewPo({...newPo, status: e.target.value})}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="sent">Sent</option>
                    <option value="billed">Billed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Issue Date *</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newPo.issue_date}
                    onChange={(e) => setNewPo({...newPo, issue_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Expected Delivery Date</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                    value={newPo.expected_delivery_date}
                    onChange={(e) => setNewPo({...newPo, expected_delivery_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-ink">Line Items</h3>
                  <button 
                    type="button"
                    onClick={() => setNewPo({...newPo, items: [...newPo.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]})}
                    className="text-xs font-medium text-ink bg-bone px-2 py-1 rounded-md border border-line hover:bg-bone-2 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newPo.items.map((item, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap items-start gap-2 sm:gap-3 p-3 bg-bone-2 rounded-lg border border-line/50">
                      <div className="flex-1 min-w-[200px]">
                        <input 
                          required
                          placeholder="Description"
                          className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...newPo.items];
                            newItems[index].description = e.target.value;
                            setNewPo({...newPo, items: newItems});
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                        <div className="w-[80px]">
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="Qty"
                            className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...newPo.items];
                              newItems[index].quantity = parseFloat(e.target.value) || 0;
                              setNewPo({...newPo, items: newItems});
                            }}
                          />
                        </div>
                        <div className="w-[100px]">
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="Price"
                            className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono"
                            value={item.unit_price}
                            onChange={(e) => {
                              const newItems = [...newPo.items];
                              newItems[index].unit_price = parseFloat(e.target.value) || 0;
                              setNewPo({...newPo, items: newItems});
                            }}
                          />
                        </div>
                        <div className="w-[80px]">
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="Tax %"
                            className="w-full px-3 py-1.5 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono"
                            value={item.tax_rate}
                            onChange={(e) => {
                              const newItems = [...newPo.items];
                              newItems[index].tax_rate = parseFloat(e.target.value) || 0;
                              setNewPo({...newPo, items: newItems});
                            }}
                          />
                        </div>
                        {newPo.items.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => {
                              const newItems = newPo.items.filter((_, i) => i !== index);
                              setNewPo({...newPo, items: newItems});
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors mt-0.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col items-end gap-1 text-sm bg-bone/30 p-3 rounded-lg border border-line">
                  <div className="w-full max-w-[240px] flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(calculateSubtotal(), company?.currency || "USD")}</span>
                  </div>
                  <div className="w-full max-w-[240px] flex justify-between text-muted">
                    <span>Tax:</span>
                    <span className="font-mono">{formatCurrency(calculateTax(), company?.currency || "USD")}</span>
                  </div>
                  <div className="w-full max-w-[240px] flex justify-between font-medium text-ink pt-2 border-t border-line mt-1">
                    <span>Total:</span>
                    <span className="font-mono">{formatCurrency(calculateTotal(), company?.currency || "USD")}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Notes</label>
                <textarea 
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors min-h-[80px]"
                  value={newPo.notes}
                  onChange={(e) => setNewPo({...newPo, notes: e.target.value})}
                  placeholder="Additional instructions for vendor..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Terms & Conditions</label>
                <textarea 
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors min-h-[80px]"
                  value={newPo.terms_conditions}
                  onChange={(e) => setNewPo({...newPo, terms_conditions: e.target.value})}
                  placeholder="e.g. Net 30, Payment due on receipt..."
                />
                <p className="text-xs text-muted mt-1">Leave blank to use company default terms.</p>
              </div>
            </form>

            <div className="p-5 border-t border-line bg-bone flex justify-end gap-3 mt-auto">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  form="create-po-form"
                  type="submit" 
                  className="flex items-center justify-center min-w-[120px] px-4 py-2 bg-ink text-bone text-sm font-medium rounded-lg hover:bg-ink/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editPoId ? "Save Changes" : "Create PO"}
                </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <Dialog.Root open={deletePoId !== null} onOpenChange={(open) => !open && setDeletePoId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl rounded-xl overflow-hidden z-50 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-ink">Delete Purchase Order</h2>
              <p className="text-muted mt-2 text-sm">
                Are you sure you want to delete this purchase order? This action cannot be undone and will permanently remove this record from your finance history.
              </p>
            </div>
            <div className="p-4 border-t border-line bg-bone flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors">Cancel</button>
              </Dialog.Close>
              <button 
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                onClick={() => {
                  if (deletePoId) deleteMutation.mutate(deletePoId);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete PO"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </PageShell>
  );
}
