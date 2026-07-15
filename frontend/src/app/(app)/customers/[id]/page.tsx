"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, UserCircle2, Mail, Phone, Calendar, 
  MoreVertical, Edit2, Trash2, KeyRound 
} from "lucide-react";
import { toast } from "sonner";

import { useCustomer, useResetCustomerPassword } from "@/lib/queries";
import { patchCustomer, deleteCustomer } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { formatDateTime } from "@/lib/utils";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const customerId = parseInt(id, 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { data: customer, isLoading, error } = useCustomer(customerId);
  const resetPasswordMutation = useResetCustomerPassword();

  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    custom_data: {} as Record<string, any>,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => patchCustomer(customerId, payload),
    onSuccess: () => {
      toast.success("Customer details updated successfully");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["crm", "customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update customer");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(customerId),
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
      router.push("/customers");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete customer");
    }
  });

  if (isLoading) {
    return <PageShell title="Loading..."><div className="p-6 text-muted">Loading customer details...</div></PageShell>;
  }

  if (error || !customer) {
    return <PageShell title="Not Found"><div className="p-6 text-muted">Customer not found.</div></PageShell>;
  }

  const handleEditClick = () => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      custom_data: customer.custom_data || {},
    });
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleResetPassword = () => {
    setIsMenuOpen(false);
    resetPasswordMutation.mutate(customerId, {
      onSuccess: (data: any) => {
        // Typically you would show a modal with the new credentials here.
        // But a toast is fine for simplicity if the API sends an email.
        toast.success(`Password reset! New credentials: ${data.credentials?.password || "Sent via email"}`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to reset password");
      },
    });
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    if (confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  return (
    <PageShell title={customer.name} eyebrow="Customer Details">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/customers" className="inline-flex items-center text-[13px] text-muted hover:text-ink transition-colors font-medium px-3 py-1.5 bg-bone-2 border border-line rounded-md">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to customers
        </Link>
        
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn btn-secondary px-2"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-line rounded-lg shadow-lg overflow-hidden z-10 animate-rise" style={{ animationDuration: '150ms' }}>
              <button 
                onClick={handleEditClick}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-bone-2 flex items-center gap-2 text-ink"
              >
                <Edit2 className="w-4 h-4 text-muted" /> Edit Details
              </button>
              
              {customer.has_portal_access && (
                <button 
                  onClick={handleResetPassword}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-bone-2 flex items-center gap-2 text-ink"
                >
                  <KeyRound className="w-4 h-4 text-muted" /> Reset Portal Password
                </button>
              )}
              
              <a 
                href={`mailto:${customer.email}`}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-bone-2 flex items-center gap-2 text-ink"
              >
                <Mail className="w-4 h-4 text-muted" /> Send Email
              </a>
              
              <div className="h-px bg-line my-1" />
              
              <button 
                onClick={handleDelete}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Customer
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card animate-rise">
            <div className="p-6 border-b border-line flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-bone-2 rounded-full grid place-items-center mb-3 border border-line shadow-sm">
                <UserCircle2 className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <h2 className="text-[22px] font-serif text-ink tracking-tight">{customer.name}</h2>
              {customer.has_portal_access && (
                <span className="mt-2 chip chip-positive text-xs">Portal Active</span>
              )}
            </div>
            
            <div className="p-5 space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Mail className="w-4 h-4 text-muted shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-accent hover:underline truncate">{customer.email}</a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Phone className="w-4 h-4 text-muted shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-ink hover:underline truncate">{customer.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Added: {formatDateTime(customer.created_at)}</span>
              </div>
            </div>
          </div>
          
          <CustomFieldsDisplay modelName="customer" customData={customer.custom_data} />
        </div>

        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={customer.id} entityType="customer" />
          <DocumentLibrary entityId={customer.id} entityType="customer" />
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-rise">
            <div className="px-5 py-4 border-b border-line flex justify-between items-center bg-bone-2">
              <h3 className="font-semibold text-ink">Edit Customer Details</h3>
              <button onClick={() => setIsEditing(false)} className="text-muted hover:text-ink text-xl">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  required
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    required
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-line mt-4">
                <CustomFieldsFormInputs 
                  modelName="customer" 
                  value={formData.custom_data}
                  onChange={(newData) => setFormData({ ...formData, custom_data: newData })}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-line">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
