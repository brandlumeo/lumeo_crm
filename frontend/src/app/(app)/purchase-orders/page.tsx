"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { FileText, Plus, Search, Check, ExternalLink, Download, Trash2, Loader2, Edit2, ShoppingBag } from "lucide-react";

import { usePurchaseOrderPage, useVendorPage } from "@/lib/queries";
import { createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, updatePurchaseOrderStatus, downloadPurchaseOrderPdf } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePurchaseOrderPage({});
  const { data: vendorData } = useVendorPage({ page_size: 100 });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPoId, setEditPoId] = useState<number | null>(null);
  
  const [newPo, setNewPo] = useState<{ vendor: number | null, issue_date: string, expected_delivery_date: string, status: string, notes: string, items: { description: string, quantity: number, unit_price: number, tax_rate: number }[] }>({ 
    vendor: null, 
    issue_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    status: "draft",
    notes: "",
    items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
  });

  const poList = data?.results || [];
  const vendors = vendorData?.results || [];

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["crm", "purchase-orders"] });
      toast.success("Purchase Order created successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create PO");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number, payload: any }) => updatePurchaseOrder(id, payload),
    onSuccess: () => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["crm", "purchase-orders"] });
      toast.success("Purchase Order updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update PO");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () => {
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
      items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
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
      items: po.items.map((item: any) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        tax_rate: parseFloat(item.tax_rate)
      }))
    });
    setIsModalOpen(true);
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
      <div className="card animate-rise">
        <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="card-title">All Purchase Orders</div>
          <button 
            className="btn btn-primary"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
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
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {poList.map((po: any) => (
                  <tr key={po.id}>
                    <td className="font-medium text-ink">{po.po_number}</td>
                    <td>{po.vendor_details?.name || "Unknown"}</td>
                    <td>{po.issue_date}</td>
                    <td className="font-mono text-sm">{formatCurrency(parseFloat(po.total_amount), "USD")}</td>
                    <td>
                      <select 
                        value={po.status}
                        onChange={(e) => statusMutation.mutate({ id: po.id, status: e.target.value })}
                        disabled={statusMutation.isPending}
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${
                          po.status === 'draft' ? 'bg-bone text-muted' :
                          po.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                          po.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          po.status === 'sent' ? 'bg-indigo-100 text-indigo-800' :
                          po.status === 'billed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-rose-100 text-rose-800'
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
                    <td className="text-right space-x-2">
                      <button 
                        onClick={() => handleEditClick(po)}
                        className="btn btn-secondary px-2 py-1"
                        title="Edit PO"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => downloadPurchaseOrderPdf(po.id, po.po_number)}
                        className="btn btn-secondary px-2 py-1"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if(confirm("Are you sure?")) deleteMutation.mutate(po.id);
                        }}
                        className="btn btn-secondary px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete PO"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-rise">
            <div className="sticky top-0 bg-paper/90 backdrop-blur-md border-b border-line px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">{editPoId ? "Edit Purchase Order" : "New Purchase Order"}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-1.5">
                  <span className="label">Vendor *</span>
                  <select 
                    required
                    className="input"
                    value={newPo.vendor || ""}
                    onChange={(e) => setNewPo({...newPo, vendor: parseInt(e.target.value)})}
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </label>
                
                <label className="space-y-1.5">
                  <span className="label">Status</span>
                  <select 
                    className="input"
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
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-1.5">
                  <span className="label">Issue Date *</span>
                  <input 
                    type="date"
                    required
                    className="input"
                    value={newPo.issue_date}
                    onChange={(e) => setNewPo({...newPo, issue_date: e.target.value})}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="label">Expected Delivery Date</span>
                  <input 
                    type="date"
                    className="input"
                    value={newPo.expected_delivery_date}
                    onChange={(e) => setNewPo({...newPo, expected_delivery_date: e.target.value})}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-ink">Line Items</h3>
                  <button 
                    type="button"
                    onClick={() => setNewPo({...newPo, items: [...newPo.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]})}
                    className="btn btn-secondary text-xs py-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newPo.items.map((item, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-start p-3 bg-bone/30 rounded-lg border border-line">
                      <div className="flex-1 min-w-[200px]">
                        <input 
                          required
                          placeholder="Description"
                          className="input"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...newPo.items];
                            newItems[index].description = e.target.value;
                            setNewPo({...newPo, items: newItems});
                          }}
                        />
                      </div>
                      <div className="w-[100px]">
                        <input 
                          type="number"
                          step="0.01"
                          required
                          placeholder="Qty"
                          className="input font-mono"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...newPo.items];
                            newItems[index].quantity = parseFloat(e.target.value) || 0;
                            setNewPo({...newPo, items: newItems});
                          }}
                        />
                      </div>
                      <div className="w-[120px]">
                        <input 
                          type="number"
                          step="0.01"
                          required
                          placeholder="Price"
                          className="input font-mono"
                          value={item.unit_price}
                          onChange={(e) => {
                            const newItems = [...newPo.items];
                            newItems[index].unit_price = parseFloat(e.target.value) || 0;
                            setNewPo({...newPo, items: newItems});
                          }}
                        />
                      </div>
                      <div className="w-[100px]">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="Tax %"
                          className="input font-mono"
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
                          className="p-2 text-muted hover:text-rose-600 transition-colors mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                  <div className="w-full max-w-[240px] flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(calculateSubtotal(), "USD")}</span>
                  </div>
                  <div className="w-full max-w-[240px] flex justify-between text-muted">
                    <span>Tax:</span>
                    <span className="font-mono">{formatCurrency(calculateTax(), "USD")}</span>
                  </div>
                  <div className="w-full max-w-[240px] flex justify-between font-medium text-ink pt-2 border-t border-line mt-1">
                    <span>Total:</span>
                    <span className="font-mono">{formatCurrency(calculateTotal(), "USD")}</span>
                  </div>
                </div>
              </div>
              
              <label className="space-y-1.5 block">
                <span className="label">Notes</span>
                <textarea 
                  className="input min-h-[80px]"
                  value={newPo.notes}
                  onChange={(e) => setNewPo({...newPo, notes: e.target.value})}
                  placeholder="Additional instructions for vendor..."
                />
              </label>

              <div className="pt-4 border-t border-line flex justify-end gap-3 sticky bottom-0 bg-paper py-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {editPoId ? "Save Changes" : "Create PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
