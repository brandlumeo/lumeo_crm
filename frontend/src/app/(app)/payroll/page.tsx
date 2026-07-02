"use client";

import { useState } from "react";
import {
  FileText,
  DollarSign,
  User,
  Plus,
  Trash2,
  CheckCircle,
  Download,
} from "lucide-react";
import {
  usePayrolls, useCurrentCompany,
  useCreatePayroll,
  useUpdatePayroll,
  useDeletePayroll,
  useCurrentUser,
  useTeam,
} from "@/lib/queries";
import { cn, formatINR } from "@/lib/utils";
import { toast } from "sonner";

export default function PayrollPage() {
  const { data: user } = useCurrentUser();
  const isManager = user?.role === "owner" || user?.role === "admin";
  const { data: payrolls = [], isLoading } = usePayrolls(isManager);
  const { data: team = [] } = useTeam();

  const createPayrollMutation = useCreatePayroll();
  const updatePayrollMutation = useUpdatePayroll();
  const deletePayrollMutation = useDeletePayroll();

  // Create Form State (for Secondary Admins)
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [basic, setBasic] = useState("");
  const [allowances, setAllowances] = useState("");
  const [deductions, setDeductions] = useState("");
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);

  const { data: company } = useCurrentCompany();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !basic) return;

    createPayrollMutation.mutate(
      {
        user: employeeId,
        month,
        year,
        basic_salary: parseFloat(basic),
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0,
        status: "published", // direct publish for now
      },
      {
        onSuccess: () => {
          toast.success("Salary slip generated!");
          setEmployeeId("");
          setBasic("");
          setAllowances("");
          setDeductions("");
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail || "Failed to generate salary slip. Please check inputs.");
        }
      }
    );
  };

  const markAsPaid = (id: string) => {
    updatePayrollMutation.mutate({
      id,
      payload: { status: "paid" },
    });
  };

  const printSlip = (id: string) => {
    setSelectedSlipId(id);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="p-7 max-w-[1200px] animate-pulse">
        <div className="h-8 bg-bone-2 rounded w-1/4 mb-4" />
        <div className="h-4 bg-bone-2 rounded w-1/2" />
      </div>
    );
  }

  return (
    <>
    <div className="p-7 pb-16 max-w-[1200px] flex flex-col gap-8 animate-rise print:hidden">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] tracking-tight">Payroll & Salary Slips</h1>
        <p className="text-[13.5px] text-muted">
          {isManager
            ? "Manage employee salaries, generate pay slips, and track payouts."
            : "View and download your monthly salary slips."}
        </p>
      </div>

      <div className={cn("grid gap-6", isManager ? "grid-cols-1 lg:grid-cols-[3fr_1fr]" : "grid-cols-1")}>
        
        {/* Salary Slips List */}
        <div className="card p-6 border border-line bg-paper flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <FileText className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">Salary Slips</h2>
          </div>

          <div className="overflow-x-auto">
            {payrolls.length === 0 ? (
              <p className="text-sm text-muted italic">No salary slips found.</p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider text-[11px]">
                    {isManager && <th className="py-2 font-medium">Employee</th>}
                    <th className="py-2 font-medium">Period</th>
                    <th className="py-2 font-medium">Basic</th>
                    <th className="py-2 font-medium">Allowances</th>
                    <th className="py-2 font-medium">Deductions</th>
                    <th className="py-2 font-medium">Net Salary</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((slip) => (
                    <tr key={slip.id} className="border-b border-line-2 last:border-0 hover:bg-bone/30">
                      {isManager && (
                        <td className="py-3 font-medium">
                          {slip.user_full_name}
                          <div className="text-[10px] text-muted font-normal font-mono">{slip.user_email}</div>
                        </td>
                      )}
                      <td className="py-3 font-semibold text-ink-2">
                        {new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'short' })} {slip.year}
                      </td>
                      <td className="py-3 text-muted">{formatINR(Number(slip.basic_salary))}</td>
                      <td className="py-3 text-emerald-600">+{formatINR(Number(slip.allowances))}</td>
                      <td className="py-3 text-red-500">-{formatINR(Number(slip.deductions))}</td>
                      <td className="py-3 font-bold text-[14px]">{formatINR(Number(slip.net_salary))}</td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            slip.status === "paid"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          )}
                        >
                          {slip.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => printSlip(slip.id)}
                            className="bg-bone hover:bg-bone-2 text-ink p-1.5 rounded transition-all"
                            title="Download Slip"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          
                          {isManager && slip.status !== "paid" && (
                            <button
                              onClick={() => markAsPaid(slip.id)}
                              disabled={updatePayrollMutation.isPending}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white p-1.5 rounded transition-all"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {isManager && (
                            <button
                              onClick={() => deletePayrollMutation.mutate(slip.id)}
                              disabled={deletePayrollMutation.isPending}
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded transition-all"
                              title="Delete Slip"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Secondary Admin Controls: Generate Slip */}
        {isManager && (
          <div className="card p-6 border border-line bg-bone flex flex-col gap-4 h-fit">
            <h2 className="font-serif text-[18px]">Generate Salary Slip</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Select Employee</label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {team.map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Month (1-12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Year</label>
                  <input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Basic Salary (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basic}
                  onChange={(e) => setBasic(e.target.value)}
                  className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Allowances (+)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value)}
                    className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none text-emerald-600 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Deductions (-)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none text-red-500 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createPayrollMutation.isPending}
                className="bg-ink hover:opacity-90 text-paper py-2.5 rounded-lg text-xs font-semibold transition-all mt-2 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {createPayrollMutation.isPending ? "GENERATING..." : "GENERATE SLIP"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
    
    {/* PRINT VIEW */}
    <div className="hidden print:block absolute inset-0 bg-white z-[999] p-10 font-sans text-ink">
      {payrolls.filter((s: any) => s.id === selectedSlipId).map((slip: any) => (
        <div key={`print-${slip.id}`} className="max-w-3xl mx-auto border border-line-2 p-10 rounded-lg bg-white">
          <div className="flex justify-between items-start border-b border-line pb-6 mb-8">
            <div className="flex flex-col gap-1">
              <div className="font-serif text-[28px] leading-none font-bold text-ink">
                {company?.name || "Lumeo CRM"}
              </div>
              <div className="text-sm text-muted">
                Company Address
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold tracking-tight mb-1 text-ink-2">SALARY SLIP</div>
              <div className="text-sm font-medium">
                {new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} {slip.year}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
            <div>
              <div className="text-muted text-[11px] uppercase tracking-wider mb-1">Employee Details</div>
              <div className="font-medium text-lg mb-1">{slip.user_full_name}</div>
              <div className="text-muted">{slip.user_email}</div>
            </div>
            <div className="text-right">
              <div className="text-muted text-[11px] uppercase tracking-wider mb-1">Payment Status</div>
              <div className="font-medium capitalize text-lg text-emerald-600">{slip.status}</div>
            </div>
          </div>

          <div className="border border-line rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm text-left">
              <thead className="bg-bone text-muted uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-medium border-b border-line">Description</th>
                  <th className="py-3 px-4 font-medium border-b border-line text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                <tr>
                  <td className="py-3 px-4">Basic Salary</td>
                  <td className="py-3 px-4 text-right font-medium">{formatINR(Number(slip.basic_salary))}</td>
                </tr>
                {slip.allowances > 0 && (
                  <tr>
                    <td className="py-3 px-4">Allowances</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">+{formatINR(Number(slip.allowances))}</td>
                  </tr>
                )}
                {slip.deductions > 0 && (
                  <tr>
                    <td className="py-3 px-4">Deductions</td>
                    <td className="py-3 px-4 text-right font-medium text-red-500">-{formatINR(Number(slip.deductions))}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="bg-bone/50 border-t border-line px-4 py-4 flex justify-between items-center">
              <div className="font-serif font-bold text-lg">Net Pay</div>
              <div className="font-bold text-2xl tracking-tight">{formatINR(Number(slip.net_salary))}</div>
            </div>
          </div>

          <div className="text-center text-xs text-muted mt-16 pt-8 border-t border-line-2">
            This is a computer generated document and does not require a signature.
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
