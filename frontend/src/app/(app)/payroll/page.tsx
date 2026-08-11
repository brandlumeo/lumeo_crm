"use client";

import { useState } from "react";
import {
  FileText,
  Receipt,
  User,
  Plus,
  Trash2,
  CheckCircle,
  Download,
  Edit2,
  ArrowLeft,
} from "lucide-react";
import {
  usePayrolls, useCurrentCompany,
  useCreatePayroll,
  useUpdatePayroll,
  useDeletePayroll,
  useCurrentUser,
  useTeam,
} from "@/lib/queries";
import { cn, formatINR, formatCompactINR } from "@/lib/utils";
import { toast } from "sonner";

export default function PayrollPage() {
  const { data: user } = useCurrentUser();
  const isManager = user?.role === "owner" || user?.role === "admin";
  const { data: rawPayrolls = [], isLoading } = usePayrolls(isManager);
  const { data: rawTeam = [] } = useTeam();
  const { data: company } = useCurrentCompany();

  const payrolls = Array.isArray(rawPayrolls) ? rawPayrolls : ((rawPayrolls as any)?.results || []);
  const team = Array.isArray(rawTeam) ? rawTeam : ((rawTeam as any)?.users || (rawTeam as any)?.results || []);

  const createPayrollMutation = useCreatePayroll();
  const updatePayrollMutation = useUpdatePayroll();
  const deletePayrollMutation = useDeletePayroll();

  // Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form State
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [paidDays, setPaidDays] = useState("22");
  const [lossOfPayDays, setLossOfPayDays] = useState("0");
  const [payDate, setPayDate] = useState("");
  
  const [basic, setBasic] = useState("");
  const [earningsList, setEarningsList] = useState<{name: string, amount: string}[]>([
    { name: "House Rent Allowance", amount: "" }
  ]);
  const [deductionsList, setDeductionsList] = useState<{name: string, amount: string}[]>([
    { name: "Income Tax", amount: "" },
    { name: "Provident Fund", amount: "" }
  ]);
  
  const [editPayrollId, setEditPayrollId] = useState<string | null>(null);

  const resetForm = () => {
    setEmployeeId("");
    setBasic("");
    setPaidDays("22");
    setLossOfPayDays("0");
    setPayDate("");
    setEarningsList([{ name: "House Rent Allowance", amount: "" }]);
    setDeductionsList([{ name: "Income Tax", amount: "" }, { name: "Provident Fund", amount: "" }]);
    setEditPayrollId(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !basic) return;

    const payload = {
      user: employeeId,
      month,
      year,
      basic_salary: parseFloat(basic),
      paid_days: parseFloat(paidDays) || 0,
      loss_of_pay_days: parseFloat(lossOfPayDays) || 0,
      pay_date: payDate || null,
      earnings_breakdown: earningsList.map(e => ({ name: e.name, amount: parseFloat(e.amount) || 0 })).filter(e => e.amount > 0),
      deductions_breakdown: deductionsList.map(d => ({ name: d.name, amount: parseFloat(d.amount) || 0 })).filter(d => d.amount > 0),
      status: "published",
    };

    if (editPayrollId) {
      updatePayrollMutation.mutate(
        { id: editPayrollId, payload },
        {
          onSuccess: () => {
            toast.success("Salary slip updated!");
            resetForm();
            setIsGenerating(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to update salary slip.");
          }
        }
      );
    } else {
      createPayrollMutation.mutate(
        payload,
        {
          onSuccess: () => {
            toast.success("Salary slip generated!");
            resetForm();
            setIsGenerating(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to generate salary slip.");
          }
        }
      );
    }
  };

  const handleEditClick = (slip: any) => {
    setEditPayrollId(slip.id);
    setEmployeeId(slip.user);
    setMonth(slip.month);
    setYear(slip.year);
    setBasic(slip.basic_salary.toString());
    setPaidDays(slip.paid_days?.toString() || "22");
    setLossOfPayDays(slip.loss_of_pay_days?.toString() || "0");
    setPayDate(slip.pay_date || "");
    
    if (slip.earnings_breakdown && slip.earnings_breakdown.length > 0) {
      setEarningsList(slip.earnings_breakdown.map((e: any) => ({ name: e.name, amount: e.amount.toString() })));
    }
    if (slip.deductions_breakdown && slip.deductions_breakdown.length > 0) {
      setDeductionsList(slip.deductions_breakdown.map((d: any) => ({ name: d.name, amount: d.amount.toString() })));
    }
    
    setIsGenerating(true);
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

    let earningsHtml = `
      <tr>
        <td>Basic Salary</td>
        <td>&#8377; ${Number(slip.basic_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
    
    if (slip.earnings_breakdown) {
      slip.earnings_breakdown.forEach((e: any) => {
        earningsHtml += `
          <tr>
            <td>${e.name}</td>
            <td class="allowance">+ &#8377; ${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });
    }
    
    let deductionsHtml = '';
    if (slip.deductions_breakdown) {
      slip.deductions_breakdown.forEach((d: any) => {
        deductionsHtml += `
          <tr>
            <td>${d.name}</td>
            <td class="deduction">&#8722; &#8377; ${Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });
    }

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
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 36px; background: #faf6ee; border-bottom: 1px solid #ddd4c0; }
    
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
    
    <div class="grid-2">
      <div>
         <div class="label">Paid Days</div>
         <div class="value">${slip.paid_days || '0'}</div>
      </div>
      <div style="text-align: right">
         <div class="label">Loss of Pay Days</div>
         <div class="value">${slip.loss_of_pay_days || '0'}</div>
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
          ${earningsHtml}
          ${deductionsHtml}
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
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Calculating Totals dynamically
  const calcGross = () => {
    let t = parseFloat(basic) || 0;
    earningsList.forEach(e => t += parseFloat(e.amount) || 0);
    return t;
  };
  const calcDeductions = () => {
    let t = 0;
    deductionsList.forEach(e => t += parseFloat(e.amount) || 0);
    return t;
  };
  const calcNet = () => calcGross() - calcDeductions();

  if (isLoading) {
    return (
      <div className="p-7 max-w-[1200px] animate-pulse">
        <div className="h-8 bg-bone-2 rounded w-1/4 mb-4" />
        <div className="h-4 bg-bone-2 rounded w-1/2" />
      </div>
    );
  }

  if (isGenerating && isManager) {
    return (
      <div className="p-7 pb-16 max-w-[1000px] mx-auto animate-rise">
        <button onClick={() => { setIsGenerating(false); resetForm(); }} className="flex items-center gap-2 text-muted hover:text-ink transition-colors mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </button>
        
        <h1 className="font-serif text-[32px] tracking-tight mb-2">Payslip Generator</h1>
        <p className="text-[13.5px] text-muted mb-8">Create a comprehensive salary slip with custom earnings and deductions.</p>
        
        <form onSubmit={handleCreate} className="flex flex-col gap-8 bg-white border border-line/50 p-6 md:p-10 rounded-2xl shadow-sm">
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-line/50">
             <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-lg">Employee Pay Summary *</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Select Employee</label>
                  <select
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="input-field bg-paper"
                  >
                    <option value="">Select Employee...</option>
                    {team.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Month</label>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field bg-paper">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Year</label>
                    <input type="number" min="2020" max="2050" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field bg-paper" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Paid Days</label>
                    <input type="number" required value={paidDays} onChange={e => setPaidDays(e.target.value)} className="input-field bg-paper" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Loss of Pay Days</label>
                    <input type="number" required value={lossOfPayDays} onChange={e => setLossOfPayDays(e.target.value)} className="input-field bg-paper" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Pay Date</label>
                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="input-field bg-paper" />
                </div>
             </div>
             
             <div className="flex flex-col gap-4">
               <h3 className="font-semibold text-lg opacity-0">Company</h3>
               <div className="p-6 bg-paper rounded-xl border border-line flex flex-col items-center justify-center text-center h-full gap-2">
                 <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-2">
                    <FileText className="w-8 h-8" />
                 </div>
                 <div className="font-serif text-xl font-bold">{company?.name || "Your Company"}</div>
                 <div className="text-sm text-muted">Payslip For The Month</div>
                 <div className="font-semibold text-lg">{new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}</div>
               </div>
             </div>
           </div>

           <div>
             <h3 className="font-semibold text-lg mb-6">Income Details *</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
               {/* EARNINGS */}
               <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-center mb-2">
                   <span className="font-semibold text-sm text-muted uppercase tracking-wider">Earnings</span>
                   <span className="font-semibold text-sm text-muted uppercase tracking-wider">Amount</span>
                 </div>
                 
                 <div className="flex items-center gap-4">
                   <div className="flex-1 text-sm font-medium pl-1">Basic</div>
                   <input type="number" required value={basic} onChange={e => setBasic(e.target.value)} className="input-field w-32 bg-paper text-right" placeholder="0" />
                 </div>
                 
                 {earningsList.map((e, idx) => (
                   <div key={idx} className="flex items-center gap-2 group">
                     <button type="button" onClick={() => setEarningsList(earningsList.filter((_, i) => i !== idx))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                     <input value={e.name} onChange={(ev) => setEarningsList(earningsList.map((el, i) => i === idx ? {...el, name: ev.target.value} : el))} className="bg-transparent text-sm w-full outline-none py-2" placeholder="Earning Name" />
                     <input type="number" value={e.amount} onChange={(ev) => setEarningsList(earningsList.map((el, i) => i === idx ? {...el, amount: ev.target.value} : el))} className="input-field w-32 bg-paper text-right ml-2" placeholder="0" />
                   </div>
                 ))}
                 
                 <button type="button" onClick={() => setEarningsList([...earningsList, { name: "New Earning", amount: "" }])} className="text-accent text-sm font-semibold flex items-center gap-1.5 w-fit mt-2 ml-1">
                   <Plus className="w-4 h-4" /> Add Earnings
                 </button>

                 <div className="flex justify-between items-center mt-6 pt-6 border-t border-line font-semibold">
                   <span>Gross Earnings</span>
                   <span>&#8377; {formatINR(calcGross())}</span>
                 </div>
               </div>

               {/* DEDUCTIONS */}
               <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-center mb-2">
                   <span className="font-semibold text-sm text-muted uppercase tracking-wider">Deductions</span>
                   <span className="font-semibold text-sm text-muted uppercase tracking-wider">Amount</span>
                 </div>
                 
                 {deductionsList.map((d, idx) => (
                   <div key={idx} className="flex items-center gap-2 group">
                     <button type="button" onClick={() => setDeductionsList(deductionsList.filter((_, i) => i !== idx))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                     <input value={d.name} onChange={(ev) => setDeductionsList(deductionsList.map((el, i) => i === idx ? {...el, name: ev.target.value} : el))} className="bg-transparent text-sm w-full outline-none py-2" placeholder="Deduction Name" />
                     <input type="number" value={d.amount} onChange={(ev) => setDeductionsList(deductionsList.map((el, i) => i === idx ? {...el, amount: ev.target.value} : el))} className="input-field w-32 bg-paper text-right ml-2" placeholder="0" />
                   </div>
                 ))}
                 
                 <button type="button" onClick={() => setDeductionsList([...deductionsList, { name: "New Deduction", amount: "" }])} className="text-accent text-sm font-semibold flex items-center gap-1.5 w-fit mt-2 ml-1">
                   <Plus className="w-4 h-4" /> Add Deductions
                 </button>

                 <div className="flex justify-between items-center mt-6 pt-6 border-t border-line font-semibold">
                   <span>Total Deductions</span>
                   <span>&#8377; {formatINR(calcDeductions())}</span>
                 </div>
               </div>
             </div>
           </div>
           
           <div className="bg-[#faf6ee] p-6 md:p-8 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 mt-4 border border-[#ddd4c0]">
              <div>
                 <div className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">Total Net Payable</div>
                 <div className="text-xs text-muted">Gross Earnings - Total Deductions</div>
              </div>
              <div className="font-serif text-[32px] font-bold tracking-tight text-[#1a1714]">
                 &#8377; {formatINR(calcNet())}
              </div>
           </div>

           <div className="flex justify-end pt-4 border-t border-line gap-3">
              <button type="button" onClick={() => { setIsGenerating(false); resetForm(); }} className="btn bg-paper border border-line">Cancel</button>
              <button 
                type="submit" 
                disabled={createPayrollMutation.isPending || updatePayrollMutation.isPending} 
                className="btn btn-primary"
              >
                {editPayrollId ? "Save Changes" : "Generate Payslip"}
              </button>
           </div>
        </form>
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

      {isManager && (
        <div className="flex justify-start">
           <button onClick={() => setIsGenerating(true)} className="btn btn-primary shadow-sm px-5 py-2.5">
             <Plus className="w-4 h-4 mr-1" /> Generate New Payslip
           </button>
        </div>
      )}

      {/* Existing Payrolls list */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg border-b border-line pb-3">
          {isManager ? "Recent Payrolls" : "My Salary Slips"}
        </h3>
        
        {payrolls.length === 0 ? (
          <div className="text-muted text-sm py-12 text-center bg-paper/50 rounded-xl border border-line/50 border-dashed">
            No salary slips have been generated yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {payrolls.map((slip: any) => (
              <div key={slip.id} className="card p-5 group flex flex-col border border-line/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f4efe6] flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-ink" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} {slip.year}</div>
                      <div className="text-xs text-muted flex items-center gap-1 mt-0.5 capitalize">
                        <User className="w-3 h-3" /> {slip.user_full_name}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded",
                    slip.status === "paid" ? "bg-[#dcebd5] text-[#2f6b3a]" : "bg-[#e5e9f0] text-[#2a4e8c]"
                  )}>
                    {slip.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 border-t border-b border-line/50 py-3 mt-1">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Net Pay</div>
                    <div className="font-semibold text-[15px] mt-0.5">&#8377; {formatINR(slip.net_salary)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Generated</div>
                    <div className="font-semibold text-sm mt-0.5">
                      {new Date(slip.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <button
                    onClick={() => printSlip(slip.id)}
                    className="flex-1 h-8 flex items-center justify-center text-xs bg-paper border border-line hover:bg-bone-1 rounded-lg gap-1.5 transition-colors font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Download / Print
                  </button>
                  
                  {isManager && (
                    <div className="flex items-center gap-1">
                      {slip.status !== "paid" && (
                        <button
                          onClick={() => markAsPaid(slip.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-green-50 text-green-600 transition-colors tooltip-trigger"
                          title="Mark as Paid"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClick(slip)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bone-2 transition-colors text-muted hover:text-ink"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePayrollMutation.mutate(slip.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
