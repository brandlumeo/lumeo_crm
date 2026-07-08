"use client";
import { toast } from "sonner";


import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Type, Hash, ToggleLeft, Calendar, Layers } from "lucide-react";
import { fetchCustomFields, createCustomField, deleteCustomField } from "@/lib/api";
import type { CustomFieldDefinition } from "@/lib/types";

export function CustomFieldsSettings() {
  const queryClient = useQueryClient();
  const [modelFilter, setModelFilter] = useState<"all" | "lead" | "customer" | "deal">("all");
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [modelName, setModelName] = useState<"lead" | "customer" | "deal">("lead");
  const [fieldType, setFieldType] = useState<"text" | "number" | "boolean" | "date">("text");
  const [required, setRequired] = useState(false);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "_")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  };

  const handleLabelChange = (val: string) => {
    setLabel(val);
    setName(slugify(val));
  };

  // Fetch Definitions
  const { data: customFieldsData, isLoading } = useQuery({
    queryKey: ["crm", "custom-fields"],
    queryFn: () => fetchCustomFields(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createCustomField,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "custom-fields"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.custom_data || "Failed to create custom field. Make sure the name is unique.");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "custom-fields"] });
    },
  });

  const customFields = customFieldsData?.results ?? [];
  const filteredFields = customFields.filter((cf) => {
    if (modelFilter === "all") return true;
    return cf.model_name === modelFilter;
  });

  const closeModal = () => {
    setIsOpen(false);
    setLabel("");
    setName("");
    setModelName("lead");
    setFieldType("text");
    setRequired(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !name.trim()) return;

    createMutation.mutate({
      model_name: modelName,
      name,
      label,
      field_type: fieldType,
      required,
    });
  };

  const renderFieldIcon = (type: string) => {
    switch (type) {
      case "number":
        return <Hash className="w-4 h-4 text-muted" />;
      case "boolean":
        return <ToggleLeft className="w-4 h-4 text-muted" />;
      case "date":
        return <Calendar className="w-4 h-4 text-muted" />;
      default:
        return <Type className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">CRM Custom Fields</h3>
        <p className="text-[14px] text-muted">
          Define dynamic attributes for your CRM entities to capture unique business data.
        </p>
      </div>

      <div className="bg-paper border border-line rounded-xl shadow-sm overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>
        
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              {(["all", "lead", "customer", "deal"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModelFilter(tab)}
                  className={`py-2 px-3 text-[13px] font-medium transition-colors border-b-2 -mb-[18px] capitalize ${
                    modelFilter === tab
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {tab === "all" ? "All Entities" : `${tab}s`}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="btn bg-ink hover:bg-ink-dark text-white text-[13px] shadow-sm transition-all flex items-center gap-1.5 px-4"
            >
              <Plus className="w-4 h-4" /> Add Custom Field
            </button>
          </div>

      {/* Table List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[13px] text-muted bg-bone-2/30 rounded-xl border border-dashed border-line">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading fields...
        </div>
      ) : filteredFields.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-bone-2/30 border border-dashed border-line rounded-xl">
          <Layers className="w-10 h-10 text-muted/50 mb-3" strokeWidth={1} />
          <h4 className="text-[14px] font-medium text-ink mb-1">No custom fields found</h4>
          <p className="text-[13px] text-muted max-w-sm">No custom fields defined for {modelFilter === "all" ? "any entity" : `the ${modelFilter} entity`} yet. Click "Add Custom Field" to create one.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-line rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] text-ink">
              <thead>
                <tr className="border-b border-line font-medium text-muted bg-bone-2 text-xs uppercase tracking-wider">
                  <th className="py-3 px-5">Field Label</th>
                  <th className="py-3 px-5">Database Key</th>
                  <th className="py-3 px-5">CRM Entity</th>
                  <th className="py-3 px-5">Field Type</th>
                  <th className="py-3 px-5">Required</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredFields.map((cf) => (
                  <tr key={cf.id} className="hover:bg-bone-3 transition-colors bg-paper">
                    <td className="py-3 px-5 font-medium">{cf.label}</td>
                    <td className="py-3 px-5 font-mono text-xs text-muted">{cf.name}</td>
                    <td className="py-3 px-5 capitalize font-medium text-ink-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${
                        cf.model_name === 'lead' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        cf.model_name === 'customer' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        cf.model_name === 'deal' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>{cf.model_name}</span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1.5 capitalize text-ink-2 bg-bone-2 px-2 py-0.5 rounded border border-line text-[12px]">
                        {renderFieldIcon(cf.field_type)}
                        {cf.field_type}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${cf.required ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {cf.required ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete custom field "${cf.label}"? All saved values in leads, customers, or deals will be permanently hidden.`)) {
                            deleteMutation.mutate(cf.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 hover:bg-red-50 rounded-md text-red-500 hover:text-red-700 border border-transparent hover:border-red-100 transition-colors inline-flex justify-center"
                        title="Delete Field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bone w-full max-w-md rounded-xl shadow-2xl border border-line flex flex-col animate-rise">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <h3 className="font-serif text-[18px] text-ink">New Custom Field</h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-bone-2 rounded-md border border-transparent hover:border-line text-muted hover:text-ink"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <label className="block">
                <span className="label">Field Label</span>
                <input
                  required
                  placeholder="e.g. Passport ID"
                  className="input"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="label">Database Key (Slug)</span>
                <input
                  required
                  placeholder="e.g. passport_id"
                  className="input font-mono text-xs bg-bone-2 text-muted"
                  value={name}
                  onChange={(e) => setName(slugify(e.target.value))}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">CRM Entity</span>
                  <select
                    className="input capitalize"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value as any)}
                  >
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                    <option value="deal">Deal</option>
                  </select>
                </label>

                <label className="block">
                  <span className="label">Field Type</span>
                  <select
                    className="input capitalize"
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as any)}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent"
                />
                <span className="text-[13px] font-medium text-ink">Mark field as mandatory/required</span>
              </label>

              <div className="border-t border-line pt-5 mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn bg-ink hover:bg-ink-2 text-white flex items-center gap-1"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
