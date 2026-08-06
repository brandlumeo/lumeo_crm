"use client";

import { useQuery } from "@tanstack/react-query";
import { Drawer } from "@/components/drawer";
import { Globe, Building2, MapPin, Receipt, FileText, Landmark, Edit2 } from "lucide-react";
import { fetchPurchaseOrders, getBills } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useCurrentCompany } from "@/lib/queries";

interface VendorDetailsSlideoverProps {
  vendor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (vendor: any) => void;
}

export function VendorDetailsSlideover({ vendor, open, onOpenChange, onEdit }: VendorDetailsSlideoverProps) {
  // Fetch Purchase Orders for this vendor
  const { data: poData, isLoading: isLoadingPOs } = useQuery({
    queryKey: ["purchase-orders", "vendor", vendor?.id],
    queryFn: () => fetchPurchaseOrders({ vendor: vendor?.id, limit: 50 }),
    enabled: !!vendor?.id && open,
  });

  // Fetch Bills for this vendor
  const { data: billsData, isLoading: isLoadingBills } = useQuery({
    queryKey: ["bills", "vendor", vendor?.id],
    queryFn: () => getBills({ vendor: vendor?.id, limit: 50 }),
    enabled: !!vendor?.id && open,
  });

  const { data: company } = useCurrentCompany();

  if (!vendor) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-ink">{vendor.name}</h2>
            {vendor.contact_name && <p className="text-muted mt-1">Contact: {vendor.contact_name}</p>}
          </div>
          {onEdit && (
            <button 
              className="btn btn-secondary text-sm"
              onClick={() => onEdit(vendor)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Vendor
            </button>
          )}
        </div>

        {/* Vendor Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vendor.website && (
            <div className="flex items-start gap-3">
              <Globe className="w-4 h-4 text-muted mt-0.5" />
              <div>
                <div className="text-xs font-medium text-muted uppercase tracking-wider">Website</div>
                <a href={vendor.website} target="_blank" rel="noreferrer" className="text-sm text-brand underline hover:text-brand-dark">
                  {vendor.website}
                </a>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <Building2 className="w-4 h-4 text-muted mt-0.5" />
            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wider">Tax ID</div>
              <div className="text-sm text-ink">{vendor.tax_id || "Not provided"}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Landmark className="w-4 h-4 text-muted mt-0.5" />
            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wider">Payment Terms</div>
              <div className="text-sm text-ink">{vendor.payment_terms || "Not specified"}</div>
            </div>
          </div>

          {(vendor.address || vendor.bank_details) && (
            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line">
              {vendor.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-muted uppercase tracking-wider">Address</div>
                    <div className="text-sm text-ink whitespace-pre-wrap">{vendor.address}</div>
                  </div>
                </div>
              )}
              {vendor.bank_details && (
                <div className="flex items-start gap-3">
                  <Landmark className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-muted uppercase tracking-wider">Bank Details</div>
                    <div className="text-sm text-ink whitespace-pre-wrap">{vendor.bank_details}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-line pt-6">
          <h3 className="text-lg font-serif font-medium text-ink flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-muted" />
            Purchase Orders
          </h3>
          {isLoadingPOs ? (
            <div className="text-sm text-muted animate-pulse">Loading purchase orders...</div>
          ) : poData?.results?.length ? (
            <div className="space-y-3">
              {poData.results.map((po: any) => (
                <div key={po.id} className="p-3 bg-white border border-line rounded-md flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-medium text-sm">{po.po_number || `PO #${po.id}`}</div>
                    <div className="text-xs text-muted mt-0.5">Issue Date: {po.issue_date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="chip chip-neutral capitalize">{po.status?.replace("_", " ")}</span>
                    <div className="text-sm font-medium">{formatCurrency(parseFloat(po.total_amount), company?.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted bg-bone-2/50 p-4 rounded-md text-center">
              No purchase orders found for this vendor.
            </div>
          )}
        </div>

        <div className="border-t border-line pt-6">
          <h3 className="text-lg font-serif font-medium text-ink flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-muted" />
            Bills
          </h3>
          {isLoadingBills ? (
            <div className="text-sm text-muted animate-pulse">Loading bills...</div>
          ) : billsData?.results?.length ? (
            <div className="space-y-3">
              {billsData.results.map((bill: any) => (
                <div key={bill.id} className="p-3 bg-white border border-line rounded-md flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-medium text-sm">{bill.bill_number || `Bill #${bill.id}`}</div>
                    <div className="text-xs text-muted mt-0.5">Due: {bill.due_date || "Not set"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="chip chip-neutral capitalize">{bill.status?.replace("_", " ")}</span>
                    <div className="text-sm font-medium">{formatCurrency(parseFloat(bill.total_amount), company?.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted bg-bone-2/50 p-4 rounded-md text-center">
              No bills found for this vendor.
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
