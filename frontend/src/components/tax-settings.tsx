"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Plus, Edit, Trash2, X
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";

type Tax = {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
};

export function TaxSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const taxes: Tax[] = company?.taxes ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Modal Form State
  const [taxName, setTaxName] = useState("");
  const [taxRate, setTaxRate] = useState<number | string>("");

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setIsModalOpen(false);
    },
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setTaxName("");
    setTaxRate("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setTaxName(taxes[index].name);
    setTaxRate(taxes[index].rate);
    setIsModalOpen(true);
  };

  const handleDelete = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to delete this tax?")) {
      const newTaxes = [...taxes];
      newTaxes.splice(index, 1);
      mutation.mutate({ taxes: newTaxes });
    }
  };

  const handleSaveModal = () => {
    if (!taxName || taxRate === "") return;
    
    const newTaxes = [...taxes];
    const parsedRate = parseFloat(taxRate.toString()) || 0;

    if (editingIndex !== null) {
      newTaxes[editingIndex] = { ...newTaxes[editingIndex], name: taxName, rate: parsedRate };
    } else {
      newTaxes.push({ 
        id: Date.now().toString(), 
        name: taxName, 
        rate: parsedRate, 
        is_default: newTaxes.length === 0 
      });
    }

    mutation.mutate({ taxes: newTaxes });
  };

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      
      {/* Top Action Button */}
      {isAdmin && (
        <div className="flex mb-6">
          <button 
            onClick={handleOpenAdd}
            className="btn btn-primary shadow-sm h-9 px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tax
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-paper border border-line rounded-lg shadow-sm overflow-hidden flex flex-col relative">
        <div className="px-6 py-5 border-b border-line">
          <h3 className="text-lg font-medium text-ink tracking-tight">Tax Settings</h3>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-paper border-b border-line text-muted/80 font-medium text-[13px]">
              <tr>
                <th className="py-3 px-6 font-medium w-16">#</th>
                <th className="py-3 px-6 font-medium">Tax Name</th>
                <th className="py-3 px-6 font-medium">Rate %</th>
                <th className="py-3 px-6 font-medium text-right w-48">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {taxes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted">
                    No tax rates configured yet.
                  </td>
                </tr>
              ) : (
                taxes.map((tax, index) => (
                  <tr key={tax.id} className="hover:bg-bone/30 transition-colors">
                    <td className="py-3.5 px-6 text-ink">{index + 1}</td>
                    <td className="py-3.5 px-6 text-ink">{tax.name}</td>
                    <td className="py-3.5 px-6 text-ink">{tax.rate}</td>
                    <td className="py-3.5 px-6 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(index)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-muted hover:text-ink transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(index)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-paper hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {editingIndex !== null ? "Edit Tax" : "Add Tax"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Tax Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  className="input w-full h-10 bg-paper"
                  placeholder="e.g. GST"
                  autoFocus
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Rate % <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="input w-full h-10 bg-paper"
                  placeholder="e.g. 18"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn bg-paper border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded-lg font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={mutation.isPending || !taxName || taxRate === ""}
                className="btn btn-primary shadow-sm h-9 px-5 rounded-lg font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
