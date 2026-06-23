"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Laptop,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  User,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useCurrentUser,
} from "@/lib/queries";
import { fetchTeam } from "@/lib/api";
import { formatLongDate } from "@/lib/utils";

export default function AssetsPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();

  // Queries for team users
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    enabled: !!currentUser,
  });

  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();

  // Component states
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [condition, setCondition] = useState<"new" | "good" | "fair" | "damaged">("good");
  const [purchaseDate, setPurchaseDate] = useState("");

  // Status messages
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || assetsLoading || teamLoading) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="card p-10 animate-pulse">
          <div className="h-8 bg-bone-2 rounded w-1/4 mb-4" />
          <div className="h-4 bg-bone-2 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const isManager = currentUser?.role === "owner" || currentUser?.role === "admin";
  const users = teamData?.users ?? [];

  // Personal hardware list
  const myHardware = assets.filter((a) => a.assigned_to === currentUser?.id);

  // Stats
  const totalAssets = assets.length;
  const assignedCount = assets.filter((a) => a.assigned_to !== null).length;
  const unassignedCount = totalAssets - assignedCount;

  // Add asset
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim()) {
      setFormError("Asset name is required.");
      return;
    }

    createAssetMutation.mutate(
      {
        name,
        serial_number: serialNumber.trim() || undefined,
        condition,
        purchase_date: purchaseDate || null,
      },
      {
        onSuccess: () => {
          setFormSuccess("Asset registered in inventory catalog successfully.");
          setName("");
          setSerialNumber("");
          setCondition("good");
          setPurchaseDate("");
        },
        onError: (err: any) => {
          setFormError(err.response?.data?.detail ?? "Failed to create asset.");
        },
      }
    );
  };

  // Assign asset or change condition
  const handleAssignChange = (assetId: string, value: string) => {
    const assigned_to = value === "" ? null : parseInt(value);
    updateAssetMutation.mutate({
      id: assetId,
      payload: { assigned_to },
    });
  };

  const handleConditionChange = (assetId: string, value: any) => {
    updateAssetMutation.mutate({
      id: assetId,
      payload: { condition: value },
    });
  };

  // Delete asset
  const handleDeleteAsset = (id: string) => {
    if (confirm("Are you sure you want to remove this asset from company inventory?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  return (
    <div className="p-7 pb-16 max-w-[1400px] flex flex-col gap-8 animate-rise">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] tracking-tight">Company Hardware & Assets</h1>
        <p className="text-[13.5px] text-muted">
          Track organization hardware inventories, assign active devices to developers, and log device conditions.
        </p>
      </div>

      {/* Stats row */}
      {isManager && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="card p-5 border border-line bg-paper">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Total Registered Assets</div>
            <div className="text-[20px] font-semibold mt-0.5">{totalAssets} items</div>
          </div>
          <div className="card p-5 border border-line bg-paper">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Assigned Hardware</div>
            <div className="text-[20px] font-semibold mt-0.5">{assignedCount} allocated</div>
          </div>
          <div className="card p-5 border border-line bg-paper">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Available Inventory</div>
            <div className="text-[20px] font-semibold mt-0.5">{unassignedCount} items free</div>
          </div>
        </div>
      )}

      {/* Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        
        {/* Company Inventory Catalog (Secondary Admins) or Personal Hardware List (All staff) */}
        <div className="card p-6 flex flex-col gap-4 border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <Laptop className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">
              {isManager ? "Company Assets Registry" : "My Assigned Company Assets"}
            </h2>
          </div>

          {isManager ? (
            /* SECONDARY ADMIN INVENTORY DESK */
            <div className="overflow-x-auto">
              {assets.length === 0 ? (
                <p className="text-xs text-muted italic">No items registered in company inventory yet.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-muted uppercase tracking-wider">
                      <th className="py-2.5 font-medium">Asset Name</th>
                      <th className="py-2.5 font-medium">Serial Number</th>
                      <th className="py-2.5 font-medium">Condition</th>
                      <th className="py-2.5 font-medium">Purchase Date</th>
                      <th className="py-2.5 font-medium">Allocated Assignee</th>
                      <th className="py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.id} className="border-b border-line-2 last:border-0 hover:bg-bone/30">
                        <td className="py-3 font-semibold text-ink leading-snug">{asset.name}</td>
                        <td className="py-3 font-mono text-[10px] text-ink-2">{asset.serial_number || "—"}</td>
                        <td className="py-3">
                          <select
                            value={asset.condition}
                            onChange={(e) => handleConditionChange(asset.id, e.target.value as any)}
                            disabled={updateAssetMutation.isPending}
                            className="bg-bone border border-line rounded px-1.5 py-0.5 text-[11px] capitalize text-ink outline-none"
                          >
                            <option value="new">New</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="damaged">Damaged</option>
                          </select>
                        </td>
                        <td className="py-3 text-muted">
                          {asset.purchase_date ? formatLongDate(new Date(asset.purchase_date)) : "—"}
                        </td>
                        <td className="py-3">
                          <select
                            value={asset.assigned_to ?? ""}
                            onChange={(e) => handleAssignChange(asset.id, e.target.value)}
                            disabled={updateAssetMutation.isPending}
                            className="bg-bone border border-line rounded px-1.5 py-1 text-[11.5px] text-ink outline-none w-[150px]"
                          >
                            <option value="">Unassigned</option>
                            {users.map((u: any) => (
                              <option key={u.id} value={u.id}>
                                👤 {u.first_name} {u.last_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            disabled={deleteAssetMutation.isPending}
                            className="text-muted hover:text-accent p-1 transition-all"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* STANDARD EMPLOYEE VIEW */
            <div className="flex flex-col gap-4">
              {myHardware.length === 0 ? (
                <div className="bg-bone border border-line rounded-lg p-8 text-center">
                  <Sliders className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted">No company-owned devices currently issued to your profile.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myHardware.map((asset) => (
                    <div key={asset.id} className="border border-line rounded-lg p-4 bg-bone flex flex-col gap-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-ink text-paper text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl">
                        {asset.condition}
                      </div>
                      <div className="font-semibold text-[14px] leading-snug pr-12">{asset.name}</div>
                      <div className="text-xs text-muted flex flex-col gap-1 mt-1">
                        <span className="font-mono text-[10px]">S/N: {asset.serial_number || "Unavailable"}</span>
                        <span>Issued Purchase: {asset.purchase_date ? formatLongDate(new Date(asset.purchase_date)) : "Unknown"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Register Asset panel (Secondary Admins only) */}
        {isManager ? (
          <div className="card p-6 flex flex-col gap-4 border border-line bg-paper">
            <div className="flex items-center gap-2 border-b border-line-2 pb-3">
              <Plus className="w-5 h-5 text-ink-2" />
              <h2 className="font-serif text-[20px]">Register Device</h2>
            </div>

            <form onSubmit={handleAddAsset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Device Name</label>
                <input
                  type="text"
                  placeholder="MacBook Pro M3 Max, Dell Monitor 27..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. S/N C02H18..."
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
                  >
                    <option value="new">New / Mint</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="bg-bone border border-line rounded px-3 py-1.5 text-[12.5px] outline-none focus:border-ink"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-md">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={createAssetMutation.isPending}
                className="bg-ink hover:opacity-90 text-paper py-2.5 rounded-lg text-xs font-semibold transition-all mt-1"
              >
                {createAssetMutation.isPending ? "CATALOGING..." : "REGISTER COMPANY HARDWARE"}
              </button>
            </form>
          </div>
        ) : (
          /* STANDARD USER DECEIVE CARD WITH DETAILS */
          <div className="card p-6 border border-line bg-paper flex flex-col gap-4 select-none">
            <div className="flex items-center gap-2 border-b border-line-2 pb-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="font-serif text-[20px]">Asset Usage Protocol</h2>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              All company-owned computer hardware, mobile interfaces, and digital resources issued to team members are to be handled with extreme care. 
            </p>
            <div className="flex flex-col gap-2.5 text-xs text-muted italic mt-2 border-l-2 border-line pl-3">
              <div>1. All hardware remains company property under full inventory registers.</div>
              <div>2. If hardware is damaged or displays technical issues, contact organization administrators instantly to update condition logging.</div>
              <div>3. Discharging hardware to other staff members must be registered here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
