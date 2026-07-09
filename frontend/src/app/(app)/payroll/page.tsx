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
    const slip = payrolls.find((s: any) => s.id === id);
    if (!slip) return;

    const monthName = new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' });
    const companyName = company?.name || "Lumeo CRM";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Salary Slip - ${slip.user_full_name} - ${monthName} ${slip.year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1714; background: #fff; padding: 40px; font-size: 14px; }
    .slip { max-width: 720px; margin: 0 auto; border: 1px solid #ddd4c0; border-radius: 12px; overflow: hidden; }
    .header { padding: 32px 36px; border-bottom: 1px solid #ddd4c0; display: flex; justify-content: space-between; align-items: flex-start; background: #faf6ee; }
    .company-name { font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #1a1714; margin-bottom: 4px; }
    .company-sub { font-size: 12px; color: #7a6f5f; }
    .slip-title { text-align: right; }
    .slip-title h2 { font-size: 18px; font-weight: 700; letter-spacing: 0.05em; color: #3d362d; margin-bottom: 4px; }
    .slip-title .period { font-size: 13px; color: #7a6f5f; }
    .employee-section { padding: 24px 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-bottom: 1px solid #ece8d8; background: #fff; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #7a6f5f; margin-bottom: 4px; }
    .value { font-size: 15px; font-weight: 600; color: #1a1714; }
    .sub-value { font-size: 12px; color: #7a6f5f; margin-top: 2px; }
    .status-paid { color: #2f6b3a; }
    .status-published { color: #2a4e8c; }
    table { width: 100%; border-collapse: collapse; }
    .table-wrapper { border: 1px solid #ddd4c0; border-radius: 8px; overflow: hidden; margin: 24px 36px; }
    thead { background: #f4efe6; }
    thead th { padding: 10px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #7a6f5f; font-weight: 600; border-bottom: 1px solid #ddd4c0; }
    thead th:last-child { text-align: right; }
    tbody tr td { padding: 12px 16px; border-bottom: 1px solid #ece8d8; color: #1a1714; }
    tbody tr:last-child td { border-bottom: none; }
    td:last-child { text-align: right; font-weight: 600; }
    .allowance { color: #2f6b3a; }
    .deduction { color: #c0392b; }
    .net-pay-row { background: #f4efe6; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #ddd4c0; }
    .net-pay-label { font-family: Georgia, serif; font-size: 16px; font-weight: bold; }
    .net-pay-amount { font-size: 22px; font-weight: 800; color: #1a1714; }
    .footer { margin: 0 36px 28px; padding-top: 20px; border-top: 1px solid #ece8d8; text-align: center; font-size: 11px; color: #7a6f5f; }
    .generated-on { font-size: 10px; color: #aaa; margin-top: 6px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div>
        <div class="company-name">${companyName}</div>
        <div class="company-sub">Salary Slip Document</div>
      </div>
      <div class="slip-title">
        <h2>SALARY SLIP</h2>
        <div class="period">${monthName} ${slip.year}</div>
      </div>
    </div>

    <div class="employee-section">
      <div>
        <div class="label">Employee Name</div>
        <div class="value">${slip.user_full_name || 'N/A'}</div>
        <div class="sub-value">${slip.user_email || ''}</div>
      </div>
      <div style="text-align: right">
        <div class="label">Payment Status</div>
        <div class="value ${slip.status === 'paid' ? 'status-paid' : 'status-published'}">${(slip.status || '').charAt(0).toUpperCase() + (slip.status || '').slice(1)}</div>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td>&#8377; ${Number(slip.basic_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${Number(slip.allowances) > 0 ? `<tr><td>Allowances</td><td class="allowance">+ &#8377; ${Number(slip.allowances).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
          ${Number(slip.deductions) > 0 ? `<tr><td>Deductions</td><td class="deduction">&#8722; &#8377; ${Number(slip.deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
        </tbody>
      </table>
      <div class="net-pay-row">
        <span class="net-pay-label">Net Pay</span>
        <span class="net-pay-amount">&#8377; ${Number(slip.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>

    <div class="footer">
      This is a computer-generated document and does not require a physical signature.
      <div class="generated-on">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
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
    <div className="p-7 pb-16 max-w-[1200px] flex flex-col gap-8 animate-rise">
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
                  {Array.isArray(payrolls) ? payrolls.map((slip) => (
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
                  )) : null}
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
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="input w-full h-11 bg-bone/30 focus:bg-paper"
                  required
                >
                  <option value="" disabled>Select Employee</option>
                  {Array.isArray(team) ? team.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  )) : null}
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
    </>
  );
}
