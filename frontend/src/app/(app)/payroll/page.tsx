"use client";

import { useState, useEffect, useMemo } from "react";
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
  Mail,
  Send,
  Check,
  X,
  Users,
  Building2,
  AlertCircle,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  usePayrolls, useCurrentCompany,
  useCreatePayroll,
  useUpdatePayroll,
  useDeletePayroll,
  useCurrentUser,
  useTeam,
  usePayrollBoardRecipients,
  useNotifyBoardPayroll,
  BoardRecipient,
} from "@/lib/queries";
import { cn, formatINR, formatCompactINR } from "@/lib/utils";
import { toast } from "sonner";

export default function PayrollPage() {
  const { data: user } = useCurrentUser();
  const { data: company } = useCurrentCompany();

  const userRoleData = company?.roles?.find((r: any) => r.id === user?.role);
  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin" || user?.role === "manager" || user?.can_manage_team;
  const isManager = isOwnerOrAdmin || userRoleData?.permissions?.["Payroll"]?.View === "All";
  
  const { data: rawPayrolls = [], isLoading } = usePayrolls(isManager);
  const { data: rawTeam = [] } = useTeam();

  const payrolls = Array.isArray(rawPayrolls) ? rawPayrolls : ((rawPayrolls as any)?.results || []);
  const team = Array.isArray(rawTeam) ? rawTeam : ((rawTeam as any)?.users || (rawTeam as any)?.results || []);

  const createPayrollMutation = useCreatePayroll();
  const updatePayrollMutation = useUpdatePayroll();
  const deletePayrollMutation = useDeletePayroll();

  // Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNotifyBoardOpen, setIsNotifyBoardOpen] = useState(false);
  
  // Form State
  const [employeeId, setEmployeeId] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [paidDays, setPaidDays] = useState("22");
  const [lossOfPayDays, setLossOfPayDays] = useState("0");
  const [payDate, setPayDate] = useState("");
  
  const [basic, setBasic] = useState("");
  const [earningsList, setEarningsList] = useState<{name: string, amount: string}[]>([
    { name: "House Rent Allowance", amount: "" },
    { name: "Incentive", amount: "" },
    { name: "Overtime", amount: "" }
  ]);
  const [deductionsList, setDeductionsList] = useState<{name: string, amount: string}[]>([
    { name: "Income Tax", amount: "" },
    { name: "Provident Fund", amount: "" }
  ]);
  
  const [editPayrollId, setEditPayrollId] = useState<string | null>(null);

  const resetForm = () => {
    setEmployeeId("");
    setEmpCode("");
    setBasic("");
    setPaidDays("22");
    setLossOfPayDays("0");
    setPayDate("");
    setEarningsList([
      { name: "House Rent Allowance", amount: "" },
      { name: "Incentive", amount: "" },
      { name: "Overtime", amount: "" }
    ]);
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
      employee_id: empCode || undefined,
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
    setEmpCode(slip.user_employee_id || "");
    setMonth(slip.month);
    setYear(slip.year);
    setBasic(slip.basic_salary.toString());
    setPaidDays(slip.paid_days?.toString() || "22");
    setLossOfPayDays(slip.loss_of_pay_days?.toString() || "0");
    setPayDate(slip.pay_date || "");
    
    let parsedEarnings = slip.earnings_breakdown || [];
    if (typeof parsedEarnings === "string") {
      try { parsedEarnings = JSON.parse(parsedEarnings); } catch (e) { parsedEarnings = []; }
    }
    if (parsedEarnings.length > 0) {
      setEarningsList(parsedEarnings.map((e: any) => ({ name: e.name, amount: e.amount.toString() })));
    } else {
      setEarningsList([
        { name: "House Rent Allowance", amount: "" },
        { name: "Incentive", amount: "" },
        { name: "Overtime", amount: "" }
      ]);
    }
    
    let parsedDeductions = slip.deductions_breakdown || [];
    if (typeof parsedDeductions === "string") {
      try { parsedDeductions = JSON.parse(parsedDeductions); } catch (e) { parsedDeductions = []; }
    }
    if (parsedDeductions.length > 0) {
      setDeductionsList(parsedDeductions.map((d: any) => ({ name: d.name, amount: d.amount.toString() })));
    } else {
      setDeductionsList([{ name: "Income Tax", amount: "" }, { name: "Provident Fund", amount: "" }]);
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
    window.open(`/payroll/${id}/print?print=true`, '_blank');
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
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      const emp = team.find((m: any) => m.id === e.target.value);
                      if (emp) {
                        setEmpCode(emp.employee_id || "");
                      } else {
                        setEmpCode("");
                      }
                    }}
                    className="input-field bg-paper capitalize"
                  >
                    <option value="">Select Employee...</option>
                    {team.map((m: any) => (
                      <option key={m.id} value={m.id} className="capitalize">{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Employee ID (Optional)</label>
                  <input type="text" value={empCode} onChange={e => setEmpCode(e.target.value)} placeholder="EMP-001" className="input-field bg-paper" />
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
                 {employeeId && (
                   <div className="text-sm font-medium capitalize mt-1 border-t border-line/50 pt-2 w-full">
                     Employee: {team.find((m: any) => m.id === employeeId)?.first_name} {team.find((m: any) => m.id === employeeId)?.last_name}
                   </div>
                 )}
                 <div className="text-sm text-muted mt-2">Payslip For The Month</div>
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
                     <button type="button" onClick={() => setEarningsList(earningsList.filter((_, i) => i !== idx))} className="text-muted opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                     <input value={e.name} onChange={(ev) => setEarningsList(earningsList.map((el, i) => i === idx ? {...el, name: ev.target.value} : el))} className="bg-transparent text-sm w-full outline-none py-2" placeholder="Earning Name" />
                     <input type="number" value={e.amount} onChange={(ev) => setEarningsList(earningsList.map((el, i) => i === idx ? {...el, amount: ev.target.value} : el))} className="input-field w-32 bg-paper text-right ml-2" placeholder="0" />
                   </div>
                 ))}
                 
                 <button type="button" onClick={() => setEarningsList([...earningsList, { name: "New Earning", amount: "" }])} className="text-accent text-sm font-semibold flex items-center gap-1.5 w-fit mt-2 ml-1">
                   <Plus className="w-4 h-4" /> Add Earnings
                 </button>

                 <div className="flex justify-between items-center mt-6 pt-6 border-t border-line font-semibold">
                   <span>Gross Earnings</span>
                   <span>{formatINR(calcGross())}</span>
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
                     <button type="button" onClick={() => setDeductionsList(deductionsList.filter((_, i) => i !== idx))} className="text-muted opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                     <input value={d.name} onChange={(ev) => setDeductionsList(deductionsList.map((el, i) => i === idx ? {...el, name: ev.target.value} : el))} className="bg-transparent text-sm w-full outline-none py-2" placeholder="Deduction Name" />
                     <input type="number" value={d.amount} onChange={(ev) => setDeductionsList(deductionsList.map((el, i) => i === idx ? {...el, amount: ev.target.value} : el))} className="input-field w-32 bg-paper text-right ml-2" placeholder="0" />
                   </div>
                 ))}
                 
                 <button type="button" onClick={() => setDeductionsList([...deductionsList, { name: "New Deduction", amount: "" }])} className="text-accent text-sm font-semibold flex items-center gap-1.5 w-fit mt-2 ml-1">
                   <Plus className="w-4 h-4" /> Add Deductions
                 </button>

                 <div className="flex justify-between items-center mt-6 pt-6 border-t border-line font-semibold">
                   <span>Total Deductions</span>
                   <span>{formatINR(calcDeductions())}</span>
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
                 {formatINR(calcNet())}
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
        <div className="flex flex-wrap items-center gap-3">
           <button onClick={() => setIsGenerating(true)} className="btn btn-primary shadow-sm px-5 py-2.5">
             <Plus className="w-4 h-4 mr-1" /> Generate New Payslip
           </button>
           <button
             type="button"
             onClick={() => setIsNotifyBoardOpen(true)}
             className="btn bg-white hover:bg-bone-1 border border-line text-ink font-medium shadow-sm px-5 py-2.5 flex items-center gap-2 transition-all hover:border-ink/30"
           >
             <Mail className="w-4 h-4 text-accent" />
             Notify Board Members
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
                    <div className="font-semibold text-[15px] mt-0.5">{formatINR(slip.net_salary)}</div>
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

    {/* Executive Board Notification Modal */}
    <NotifyBoardModal
      isOpen={isNotifyBoardOpen}
      onClose={() => setIsNotifyBoardOpen(false)}
      payrolls={payrolls}
    />
    </>
  );
}

function NotifyBoardModal({
  isOpen,
  onClose,
  payrolls,
}: {
  isOpen: boolean;
  onClose: () => void;
  payrolls: any[];
}) {
  const { data: boardRecipients = [], isLoading: isLoadingRecipients } = usePayrollBoardRecipients();
  const notifyMutation = useNotifyBoardPayroll();

  // Find latest payroll month/year if available, else current date
  const latestPayroll = payrolls && payrolls.length > 0 ? payrolls[0] : null;
  const initialMonth = latestPayroll?.month || (new Date().getMonth() + 1);
  const initialYear = latestPayroll?.year || new Date().getFullYear();

  const [month, setMonth] = useState<number>(initialMonth);
  const [year, setYear] = useState<number>(initialYear);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [note, setNote] = useState("");

  // Sync defaults when recipients load or modal opens
  useEffect(() => {
    if (isOpen && boardRecipients.length > 0) {
      const defaults = boardRecipients
        .filter((r) => r.default_selected)
        .map((r) => r.email.toLowerCase());
      setSelectedEmails(defaults);
    }
  }, [isOpen, boardRecipients]);

  const monthName = useMemo(() => {
    return new Date(year, month - 1).toLocaleString("default", { month: "long" });
  }, [month, year]);

  // Set default note when month/year changes
  useEffect(() => {
    setNote(
      `${monthName} ${year} payroll has been compiled and published. Please review the financial breakdown and authorize bank transfer disbursement.`
    );
  }, [monthName, year]);

  const matchingPayrolls = useMemo(() => {
    return payrolls.filter((p: any) => Number(p.month) === Number(month) && Number(p.year) === Number(year));
  }, [payrolls, month, year]);

  const totalNet = useMemo(() => {
    return matchingPayrolls.reduce((sum: number, p: any) => sum + (parseFloat(p.net_salary) || 0), 0);
  }, [matchingPayrolls]);

  const staffCount = matchingPayrolls.length;

  if (!isOpen) return null;

  const toggleRecipient = (email: string) => {
    const norm = email.toLowerCase();
    setSelectedEmails((prev) =>
      prev.includes(norm) ? prev.filter((e) => e !== norm) : [...prev, norm]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === boardRecipients.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(boardRecipients.map((r) => r.email.toLowerCase()));
    }
  };

  const handleAddCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim().toLowerCase();
    if (!clean) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (selectedEmails.includes(clean) || customEmails.includes(clean)) {
      toast.info("This email is already added to recipients.");
      setCustomInput("");
      return;
    }
    setCustomEmails((prev) => [...prev, clean]);
    setCustomInput("");
  };

  const removeCustomEmail = (email: string) => {
    setCustomEmails((prev) => prev.filter((e) => e !== email));
  };

  const allRecipients = Array.from(new Set([...selectedEmails, ...customEmails]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allRecipients.length === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }
    if (matchingPayrolls.length === 0) {
      toast.error(`No payroll records found for ${monthName} ${year}.`);
      return;
    }

    try {
      const res = await notifyMutation.mutateAsync({
        month,
        year,
        recipient_emails: allRecipients,
        custom_message: note.trim(),
      });
      toast.success(
        `Executive payroll summary dispatched to ${res.sent_count} board member${res.sent_count === 1 ? "" : "s"}!`
      );
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to send notification email.";
      toast.error(msg);
    }
  };

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-line flex items-start justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-ink font-semibold">Notify Board Members</h2>
              <p className="text-xs text-muted mt-0.5">
                Send an executive salary summary and approval reminder directly to leadership.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-bone-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Pay Period & Payout Summary Card */}
          <div className="bg-[#FAF7F2] border border-[#EAE3D2] rounded-xl p-4.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE3D2]/70">
              <div>
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                  Select Pay Period
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="input-field bg-white py-1.5 px-3 text-sm font-medium border border-line rounded-lg"
                  >
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="input-field bg-white py-1.5 px-3 text-sm font-medium border border-line rounded-lg"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
                  Disbursement Status
                </span>
                {staffCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Ready for Payout
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    No payslips in this period
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-3.5">
              <div>
                <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Total Net Payout</div>
                <div className="font-serif text-2xl font-bold text-ink mt-0.5">
                  {formatINR(totalNet)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Staff Count</div>
                <div className="font-serif text-2xl font-bold text-ink mt-0.5">
                  {staffCount} {staffCount === 1 ? "Employee" : "Employees"}
                </div>
              </div>
            </div>
          </div>

          {/* Recipients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-accent" />
                Select Recipients ({allRecipients.length} selected)
              </label>
              {boardRecipients.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  {selectedEmails.length === boardRecipients.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {/* Interactive Recipient Checklist */}
            <div className="max-h-52 overflow-y-auto space-y-2 border border-line/70 rounded-xl p-2 bg-[#FCFAF7]">
              {isLoadingRecipients ? (
                <div className="py-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading leadership directory...
                </div>
              ) : boardRecipients.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  No board members or administrators found.
                </div>
              ) : (
                boardRecipients.map((rec) => {
                  const isChecked = selectedEmails.includes(rec.email.toLowerCase());
                  return (
                    <div
                      key={rec.id}
                      onClick={() => toggleRecipient(rec.email)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none",
                        isChecked
                          ? "bg-white border-accent/40 shadow-xs"
                          : "bg-white/50 border-transparent hover:bg-white hover:border-line/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                            isChecked
                              ? "bg-accent border-accent text-white"
                              : "border-line bg-white"
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-bone-2 flex items-center justify-center font-bold text-xs text-ink shrink-0">
                          {rec.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink leading-tight flex items-center gap-2 truncate">
                            <span>{rec.name}</span>
                            {rec.role === "owner" && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted truncate">{rec.email}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-[11px] font-medium text-muted bg-bone-1 border border-line/40 px-2 py-0.5 rounded-full">
                          {rec.role_display}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom Recipient Adder */}
            <div className="pt-1">
              <form onSubmit={handleAddCustomEmail} className="flex gap-2">
                <input
                  type="email"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Add custom email (e.g. board@brandlumeo.com)..."
                  className="input-field bg-paper text-xs flex-1 py-1.5 px-3 rounded-lg border border-line"
                />
                <button
                  type="submit"
                  className="btn bg-white hover:bg-bone-1 border border-line text-ink text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                >
                  + Add
                </button>
              </form>

              {customEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-line px-2.5 py-1 rounded-full text-ink shadow-2xs"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomEmail(email)}
                        className="text-muted hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Executive Note Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
              Executive Message Note
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add personal notes or instructions for the board..."
              className="w-full input-field bg-paper text-sm p-3 rounded-xl border border-line focus:ring-1 focus:ring-accent resize-none"
            />
            <p className="text-[11px] text-muted">
              This note will be prominently highlighted in the executive email sent to the board.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line flex items-center justify-between bg-[#FAF7F2]">
          <button
            type="button"
            onClick={onClose}
            className="btn bg-white hover:bg-bone-1 border border-line text-sm font-medium px-4 py-2 rounded-lg"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={notifyMutation.isPending || allRecipients.length === 0 || matchingPayrolls.length === 0}
            className="btn btn-primary text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notifyMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dispatching Emails...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {allRecipients.length} Recipient{allRecipients.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
