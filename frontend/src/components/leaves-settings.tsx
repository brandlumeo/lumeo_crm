"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CalendarDays, Loader2, CheckCircle, XCircle, Shield, 
  Plus, Edit, Archive, ArchiveRestore, Info, X, HelpCircle, ChevronDown
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

type LeaveType = {
  id: string;
  name: string;
  color: string;
  allotmentType: string;
  noOfLeaves: number;
  monthlyLimit: number;
  paidStatus: string;
  departments: string[];
  designations: string[];
  genders: string[];
  maritalStatuses: string[];
  userRoles: string[];
  isArchived: boolean;
  
  effectiveAfterValue: string;
  effectiveAfterUnit: string;
  allowedInProbation: boolean;
  unusedLeaves: string;
  overUtilization: string;
  allowedInNoticePeriod: boolean;
};

export function LeavesSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("types");

  // General Settings
  const [leaveCountFrom, setLeaveCountFrom] = useState("joining_date");
  const [reportingManagerRole, setReportingManagerRole] = useState("Pre-Approve");

  // Leave Types State
  const leaveTypes: LeaveType[] = company?.leave_types ?? [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Modal State
  const [modalTab, setModalTab] = useState("general"); // general, entitlement, applicability
  const [typeName, setTypeName] = useState("");
  const [typeColor, setTypeColor] = useState("#16813D");
  const [typeAllotment, setTypeAllotment] = useState("Yearly Leave Type");
  const [typeLeaves, setTypeLeaves] = useState("12");
  const [typeMonthlyLimit, setTypeMonthlyLimit] = useState("1");
  const [typePaidStatus, setTypePaidStatus] = useState("Paid");
  
  // Applicability State
  const [typeDepartments, setTypeDepartments] = useState("");
  const [typeDesignations, setTypeDesignations] = useState("");
  const [typeGenders, setTypeGenders] = useState("Male, Female, Others");
  const [typeMaritalStatuses, setTypeMaritalStatuses] = useState("Single, Married, Widower, Widow, Separate, Divorced");
  const [typeUserRoles, setTypeUserRoles] = useState("App Administrator, Employee, Team Leader");

  // Entitlement State
  const [effectiveAfterValue, setEffectiveAfterValue] = useState("");
  const [effectiveAfterUnit, setEffectiveAfterUnit] = useState("Day(s)");
  const [allowedInProbation, setAllowedInProbation] = useState(true);
  const [unusedLeaves, setUnusedLeaves] = useState("Carry Forward");
  const [overUtilization, setOverUtilization] = useState("Do not allow");
  const [allowedInNoticePeriod, setAllowedInNoticePeriod] = useState(true);

  useEffect(() => {
    if (company) {
      setLeaveCountFrom(company.leave_count_from || "joining_date");
      setReportingManagerRole(company.reporting_manager_leave_approval_role || "Pre-Approve");
    }
  }, [company]);

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Settings updated successfully." });
      setTimeout(() => setMsg(null), 4000);
      setIsModalOpen(false);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update settings. Please try again." });
    },
  });

  const handleSaveGeneral = () => {
    mutation.mutate({
      leave_count_from: leaveCountFrom,
      reporting_manager_leave_approval_role: reportingManagerRole
    });
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setModalTab("general");
    setTypeName("");
    setTypeColor("#16813D");
    setTypeAllotment("Yearly Leave Type");
    setTypeLeaves("12");
    setTypeMonthlyLimit("1");
    setTypePaidStatus("Paid");
    
    setTypeDepartments("");
    setTypeDesignations("");
    setTypeGenders("Male, Female, Others");
    setTypeMaritalStatuses("Single, Married, Widower, Widow, Separate, Divorced");
    setTypeUserRoles("App Administrator, Employee, Team Leader");
    
    setEffectiveAfterValue("");
    setEffectiveAfterUnit("Day(s)");
    setAllowedInProbation(true);
    setUnusedLeaves("Carry Forward");
    setOverUtilization("Do not allow");
    setAllowedInNoticePeriod(true);
    
    setIsModalOpen(true);
  };

  const handleOpenEdit = (id: string) => {
    const idx = leaveTypes.findIndex(l => l.id === id);
    if (idx === -1) return;
    const lt = leaveTypes[idx];
    setEditingIndex(idx);
    setModalTab("general");
    setTypeName(lt.name);
    setTypeColor(lt.color || "#16813D");
    setTypeAllotment(lt.allotmentType);
    setTypeLeaves(lt.noOfLeaves.toString());
    setTypeMonthlyLimit(lt.monthlyLimit?.toString() || "0");
    setTypePaidStatus(lt.paidStatus);
    
    setTypeDepartments(lt.departments?.join(", ") || "");
    setTypeDesignations(lt.designations?.join(", ") || "");
    setTypeGenders(lt.genders?.join(", ") || "Male, Female, Others");
    setTypeMaritalStatuses(lt.maritalStatuses?.join(", ") || "Single, Married, Widower, Widow, Separate, Divorced");
    setTypeUserRoles(lt.userRoles?.join(", ") || "App Administrator, Employee, Team Leader");
    
    setEffectiveAfterValue(lt.effectiveAfterValue || "");
    setEffectiveAfterUnit(lt.effectiveAfterUnit || "Day(s)");
    setAllowedInProbation(lt.allowedInProbation ?? true);
    setUnusedLeaves(lt.unusedLeaves || "Carry Forward");
    setOverUtilization(lt.overUtilization || "Do not allow");
    setAllowedInNoticePeriod(lt.allowedInNoticePeriod ?? true);
    
    setIsModalOpen(true);
  };

  const handleArchiveToggle = (id: string) => {
    if (!isAdmin) return;
    const newTypes = [...leaveTypes];
    const idx = newTypes.findIndex(l => l.id === id);
    if (idx !== -1) {
      newTypes[idx].isArchived = !newTypes[idx].isArchived;
      mutation.mutate({ leave_types: newTypes });
    }
  };

  const handleSaveModal = () => {
    if (!typeName) return;
    const newTypes = [...leaveTypes];
    
    const parseList = (str: string) => str.split(",").map(s => s.trim()).filter(Boolean);

    const ltData: LeaveType = {
      id: editingIndex !== null ? newTypes[editingIndex].id : Date.now().toString(),
      name: typeName,
      color: typeColor,
      allotmentType: typeAllotment,
      noOfLeaves: parseInt(typeLeaves) || 0,
      monthlyLimit: parseInt(typeMonthlyLimit) || 0,
      paidStatus: typePaidStatus,
      departments: parseList(typeDepartments),
      designations: parseList(typeDesignations),
      genders: parseList(typeGenders),
      maritalStatuses: parseList(typeMaritalStatuses),
      userRoles: parseList(typeUserRoles),
      isArchived: editingIndex !== null ? newTypes[editingIndex].isArchived : false,
      
      effectiveAfterValue,
      effectiveAfterUnit,
      allowedInProbation,
      unusedLeaves,
      overUtilization,
      allowedInNoticePeriod
    };

    if (editingIndex !== null) {
      newTypes[editingIndex] = ltData;
    } else {
      newTypes.push(ltData);
    }
    mutation.mutate({ leave_types: newTypes });
  };

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const tabs = [
    { id: "types", label: "Leaves Type Settings" },
    { id: "general", label: "Leaves General Settings" },
    { id: "archived", label: "Archived Leaves Type" }
  ];

  const modalTabsList = [
    { id: "general", label: "General" },
    { id: "entitlement", label: "Entitlement" },
    { id: "applicability", label: "Applicability" }
  ];

  const activeTypes = leaveTypes.filter(l => !l.isArchived);
  const archivedTypes = leaveTypes.filter(l => l.isArchived);

  const renderTable = (data: LeaveType[], isArchivedTab: boolean) => (
    <div className="overflow-x-auto min-h-[300px]">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-white border-b border-line text-muted/80 font-medium">
          <tr>
            <th className="py-4 px-6">Leave Type</th>
            <th className="py-4 px-6">Leave Allotment Type</th>
            <th className="py-4 px-6">No of Leaves</th>
            <th className="py-4 px-6">Monthly Limit</th>
            <th className="py-4 px-6">Leave Paid Status</th>
            <th className="py-4 px-6">Department</th>
            <th className="py-4 px-6">Designation</th>
            <th className="py-4 px-6 text-right w-32">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <CalendarDays className="w-8 h-8 text-line mb-3" />
                  <span className="text-muted/70">- No data available in table -</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((lt) => (
              <tr key={lt.id} className="hover:bg-bone/30 transition-colors group">
                <td className="py-4 px-6 align-top whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color || "#16813D" }} />
                    <span className="text-ink font-medium">{lt.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 align-top text-ink">{lt.allotmentType}</td>
                <td className="py-4 px-6 align-top text-ink">{lt.noOfLeaves}</td>
                <td className="py-4 px-6 align-top text-ink">{lt.monthlyLimit}</td>
                <td className="py-4 px-6 align-top text-ink">{lt.paidStatus}</td>
                <td className="py-4 px-6 align-top text-muted">
                  <ul className="space-y-1">
                    {lt.departments?.map((d, i) => (
                      <li key={i}>{i + 1}. {d}</li>
                    ))}
                    {(!lt.departments || lt.departments.length === 0) && <span>-</span>}
                  </ul>
                </td>
                <td className="py-4 px-6 align-top text-muted">
                  <ul className="space-y-1">
                    {lt.designations?.map((d, i) => (
                      <li key={i}>{i + 1}. {d}</li>
                    ))}
                    {(!lt.designations || lt.designations.length === 0) && <span>-</span>}
                  </ul>
                </td>
                <td className="py-4 px-6 align-top">
                  {isAdmin && (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lt.id)}
                        className="flex items-center justify-center gap-1.5 w-full max-w-[80px] h-8 border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors text-[12px]"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveToggle(lt.id)}
                        className="flex items-center justify-center gap-1.5 w-full max-w-[80px] h-8 border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors text-[12px]"
                      >
                        {lt.isArchived ? (
                          <><ArchiveRestore className="w-3.5 h-3.5" /> Restore</>
                        ) : (
                          <><Archive className="w-3.5 h-3.5" /> Archive</>
                        )}
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
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Info */}
      <div className="flex items-start gap-5 pb-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400/20 to-amber-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner shrink-0">
          <CalendarDays className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Leaves Settings</h3>
          <p className="text-[14px] text-muted max-w-lg leading-relaxed">
            Configure default quotas, half-day allowances, and approval processes.
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify leaves settings.</span>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {/* Top Action Button Container */}
      <div className="flex gap-2 mb-2 min-h-9">
        {isAdmin && activeTab === "types" && (
          <button onClick={handleOpenAdd} className="btn bg-ink hover:bg-ink-2 text-white shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add New Leave Type
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-line shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400"></div>
        
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-line px-2 mt-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-4 text-[13.5px] font-medium transition-colors whitespace-nowrap border-b-2",
                activeTab === tab.id 
                  ? "border-rose-500 text-rose-600" 
                  : "border-transparent text-muted hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-0 min-h-[400px] flex flex-col bg-white">
          
          {activeTab === "types" && renderTable(activeTypes, false)}
          
          {activeTab === "archived" && renderTable(archivedTypes, true)}
          
          {activeTab === "general" && (
            <div className="p-6 sm:p-8 space-y-8 flex-1 animate-fade-in">
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-[13.5px] text-ink font-medium">
                  <input
                    type="radio"
                    name="leave_count_from"
                    value="joining_date"
                    checked={leaveCountFrom === "joining_date"}
                    onChange={(e) => setLeaveCountFrom(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  Count leaves from the date of joining
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer text-[13.5px] text-ink font-medium">
                  <input
                    type="radio"
                    name="leave_count_from"
                    value="year_start"
                    checked={leaveCountFrom === "year_start"}
                    onChange={(e) => setLeaveCountFrom(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  Count leaves from the start of the year
                </label>
              </div>

              <div className="bg-[#e8f4f8] text-[#3b82f6] border border-[#d1eafa] p-4 rounded-sm text-[13px]">
                Note: Approve means direct approval, Pre-Approval means another approval by admin/hr is required.
              </div>

              <div className="flex items-center gap-4 text-[13.5px] text-ink font-medium">
                <span>Reporting Manager can</span>
                <select
                  value={reportingManagerRole}
                  onChange={(e) => setReportingManagerRole(e.target.value)}
                  className="input w-48 h-10 bg-white text-[13px] border border-line rounded px-3 focus:outline-none focus:border-red-500"
                >
                  <option value="Pre-Approve">Pre-Approve</option>
                  <option value="Approve">Approve</option>
                </select>
                <span>the Leave</span>
              </div>

              {/* Action Button */}
              {isAdmin && (
                <div className="pt-8">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={mutation.isPending}
                    className="btn bg-ink hover:bg-ink-2 text-white shadow-sm transition-all h-10 px-6 rounded font-medium flex items-center gap-2 text-[13px]"
                  >
                    {mutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <>Save</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leave Type Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 overflow-hidden animate-scale-in flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
              <h3 className="text-[15px] font-semibold text-ink">
                {editingIndex !== null ? "Edit Leave Type" : "Add New Leave Type"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center overflow-x-auto border-b border-line px-2 bg-bone/10">
              {modalTabsList.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  className={cn(
                    "px-5 py-3 text-[13px] font-medium transition-colors whitespace-nowrap border-b-2",
                    modalTab === tab.id 
                      ? "border-rose-500 text-rose-600" 
                      : "border-transparent text-muted hover:text-ink"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="p-8 space-y-8 min-h-[350px]">
              
              {modalTab === "general" && (
                <div className="animate-fade-in space-y-6">
                  <h4 className="text-[15px] font-semibold text-ink">General</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Leave Type <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={typeName}
                        onChange={(e) => setTypeName(e.target.value)}
                        className="input w-full h-11 bg-white text-[13px]"
                        placeholder="E.g. Sick, Casual"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Leave Allotment Type</label>
                      <select
                        value={typeAllotment}
                        onChange={(e) => setTypeAllotment(e.target.value)}
                        className="input w-full h-11 bg-white text-[13px]"
                      >
                        <option value="Yearly Leave Type">Yearly Leave Type</option>
                        <option value="Monthly Leave Type">Monthly Leave Type</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">No of {typeAllotment.includes('Monthly') ? 'Monthly' : 'Yearly'} Leaves <HelpCircle className="w-3.5 h-3.5" /></label>
                      <input
                        type="number" min="0" value={typeLeaves} onChange={(e) => setTypeLeaves(e.target.value)}
                        className="input w-full h-11 bg-white text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Leave Paid Status <HelpCircle className="w-3.5 h-3.5" /></label>
                      <select
                        value={typePaidStatus}
                        onChange={(e) => setTypePaidStatus(e.target.value)}
                        className="input w-full h-11 bg-white text-[13px]"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Color Code <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={typeColor}
                          onChange={(e) => setTypeColor(e.target.value)}
                          className="input w-full h-11 bg-white font-mono text-[13px] pr-12"
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                          <div className="w-6 h-6 rounded-sm shadow-sm border border-line" style={{ backgroundColor: typeColor || "#16813D" }} />
                        </div>
                        <input 
                          type="color" 
                          value={typeColor} 
                          onChange={(e) => setTypeColor(e.target.value)} 
                          className="absolute inset-y-0 right-2 w-6 h-6 opacity-0 cursor-pointer" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "entitlement" && (
                <div className="animate-fade-in space-y-6">
                  <h4 className="text-[15px] font-semibold text-ink">Entitlement</h4>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-start md:items-center w-full justify-between pb-6 border-b border-line">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="space-y-1.5 w-40">
                        <label className="text-[13px] text-muted flex items-center gap-1">Effective After <HelpCircle className="w-3.5 h-3.5" /></label>
                        <input
                          type="number" min="0" value={effectiveAfterValue} onChange={(e) => setEffectiveAfterValue(e.target.value)}
                          className="input w-full h-10 bg-white text-[13px]"
                        />
                      </div>
                      <div className="space-y-1.5 w-32 mt-6">
                        <select
                          value={effectiveAfterUnit}
                          onChange={(e) => setEffectiveAfterUnit(e.target.value)}
                          className="input w-full h-10 bg-white text-[13px]"
                        >
                          <option value="Day(s)">Day(s)</option>
                          <option value="Month(s)">Month(s)</option>
                        </select>
                      </div>
                      <div className="mt-8 text-[13px] text-muted">
                        of Joining
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 md:mt-0 pt-6">
                      <input
                        type="checkbox"
                        checked={allowedInProbation}
                        onChange={(e) => setAllowedInProbation(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="text-[13px] text-muted flex items-center gap-1 cursor-pointer" onClick={() => setAllowedInProbation(!allowedInProbation)}>
                        Allowed in probation <HelpCircle className="w-3.5 h-3.5" />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Unused Leaves <HelpCircle className="w-3.5 h-3.5" /></label>
                      <select
                        value={unusedLeaves}
                        onChange={(e) => setUnusedLeaves(e.target.value)}
                        className="input w-full h-10 bg-white text-[13px]"
                      >
                        <option value="Carry Forward">Carry Forward</option>
                        <option value="Lapsed">Lapsed</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Over Utilization <HelpCircle className="w-3.5 h-3.5" /></label>
                      <select
                        value={overUtilization}
                        onChange={(e) => setOverUtilization(e.target.value)}
                        className="input w-full h-10 bg-white text-[13px]"
                      >
                        <option value="Do not allow">Do not allow</option>
                        <option value="Allow">Allow</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        checked={allowedInNoticePeriod}
                        onChange={(e) => setAllowedInNoticePeriod(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="text-[13px] text-muted flex items-center gap-1 cursor-pointer" onClick={() => setAllowedInNoticePeriod(!allowedInNoticePeriod)}>
                        Allowed in notice period <HelpCircle className="w-3.5 h-3.5" />
                      </label>
                    </div>
                  </div>

                </div>
              )}

              {modalTab === "applicability" && (
                <div className="animate-fade-in space-y-6">
                  <h4 className="text-[15px] font-semibold text-ink">Applicability</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Gender <span className="text-rose-500">*</span> <HelpCircle className="w-3 h-3" /></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={typeGenders}
                          onChange={(e) => setTypeGenders(e.target.value)}
                          className="input w-full h-11 bg-white text-[13px] pr-10 text-ellipsis overflow-hidden"
                          placeholder="e.g. Male, Female, Others"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Marital Status <span className="text-rose-500">*</span> <HelpCircle className="w-3 h-3" /></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={typeMaritalStatuses}
                          onChange={(e) => setTypeMaritalStatuses(e.target.value)}
                          className="input w-full h-11 bg-white text-[13px] pr-10 text-ellipsis overflow-hidden"
                          placeholder="e.g. Single, Married, Widower..."
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Department <span className="text-rose-500">*</span> <HelpCircle className="w-3 h-3" /></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={typeDepartments}
                          onChange={(e) => setTypeDepartments(e.target.value)}
                          className="input w-full h-11 bg-white text-[13px] pr-10 text-ellipsis overflow-hidden"
                          placeholder="e.g. HR, Management, IT..."
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">Designation <span className="text-rose-500">*</span> <HelpCircle className="w-3 h-3" /></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={typeDesignations}
                          onChange={(e) => setTypeDesignations(e.target.value)}
                          className="input w-full h-11 bg-white text-[13px] pr-10 text-ellipsis overflow-hidden"
                          placeholder="e.g. Team Lead, Branch Manager..."
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-muted flex items-center gap-1">User Role <span className="text-rose-500">*</span> <HelpCircle className="w-3 h-3" /></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={typeUserRoles}
                          onChange={(e) => setTypeUserRoles(e.target.value)}
                          className="input w-full h-11 bg-white text-[13px] pr-10 text-ellipsis overflow-hidden"
                          placeholder="e.g. App Administrator, Employee..."
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn bg-white border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={mutation.isPending || !typeName}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-sm h-9 px-5 rounded font-medium flex items-center gap-2 text-[13px] transition-colors"
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
