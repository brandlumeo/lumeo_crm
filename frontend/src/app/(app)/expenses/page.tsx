"use client";

import { useEffect, useState } from "react";
import {
  Coins,
  FileText,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  useExpenses,
  useSubmitExpense,
  useApproveExpense,
  useCurrentUser,
  useAllDealsBoard,
} from "@/lib/queries";
import { formatINR, formatLongDate, toNumber } from "@/lib/utils";

export default function ExpensesPage() {
  const { data: user } = useCurrentUser();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: companyExpenses = [], isLoading: companyExpensesLoading } = useExpenses(true); // for managers
  const { data: deals = [], isLoading: dealsLoading } = useAllDealsBoard();

  const submitExpenseMutation = useSubmitExpense();
  const approveExpenseMutation = useApproveExpense();

  // Component states
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dealId, setDealId] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Status messages
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Secondary Admin review note states
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || expensesLoading) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="card p-10 animate-pulse">
          <div className="h-8 bg-bone-2 rounded w-1/4 mb-4" />
          <div className="h-4 bg-bone-2 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const isManager = user?.role === "owner" || user?.role === "admin";

  // Calculations
  const myExpenses = expenses;
  const totalReimbursed = myExpenses
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + toNumber(e.amount), 0);
  const totalPending = myExpenses
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + toNumber(e.amount), 0);

  // Form submit
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!title.trim() || !amount) {
      setFormError("Title and Amount are required fields.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Amount must be a positive number.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("amount", numericAmount.toString());
    if (dealId) {
      formData.append("deal", dealId);
    }
    if (description.trim()) {
      formData.append("description", description);
    }
    if (receiptFile) {
      formData.append("receipt", receiptFile);
    }

    submitExpenseMutation.mutate(formData, {
      onSuccess: () => {
        setFormSuccess("Expense claim logged successfully for secondary admin approval.");
        setTitle("");
        setAmount("");
        setDealId("");
        setDescription("");
        setReceiptFile(null);
      },
      onError: (err: any) => {
        setFormError(err.response?.data?.detail ?? "Failed to submit expense claim.");
      },
    });
  };

  // Secondary Admin Approve/Reject
  const handleReviewExpense = (id: string, decision: "approved" | "rejected") => {
    approveExpenseMutation.mutate({
      id,
      payload: {
        status: decision,
        manager_notes: managerNotes[id] || undefined,
      },
    });
  };

  return (
    <div className="p-7 pb-16 max-w-[1400px] flex flex-col gap-8 animate-rise">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] tracking-tight">Financial Expenses & Claims</h1>
        <p className="text-[13.5px] text-muted">
          Log operational costs, submit business receipts, and optionally link expenditures to active CRM pipelines.
        </p>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="card p-5 border border-line bg-paper flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full grid place-items-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Reimbursed Claims</div>
            <div className="text-[20px] font-semibold mt-0.5">{formatINR(totalReimbursed)}</div>
          </div>
        </div>

        <div className="card p-5 border border-line bg-paper flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-800 border border-amber-200 rounded-full grid place-items-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Pending Claims</div>
            <div className="text-[20px] font-semibold mt-0.5">{formatINR(totalPending)}</div>
          </div>
        </div>

        <div className="card p-5 border border-line bg-paper flex items-center gap-4">
          <div className="w-10 h-10 bg-bone border border-line rounded-full grid place-items-center">
            <Coins className="w-5 h-5 text-ink-2" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Total Registered</div>
            <div className="text-[20px] font-semibold mt-0.5">{formatINR(totalReimbursed + totalPending)}</div>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        
        {/* Claims Ledger */}
        <div className="card p-6 flex flex-col gap-4 border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <FileText className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">My Reimbursement Ledger</h2>
          </div>

          <div className="overflow-x-auto">
            {expensesLoading ? (
              <p className="text-xs text-muted">Loading expenses...</p>
            ) : myExpenses.length === 0 ? (
              <p className="text-xs text-muted italic">No expenses submitted yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider">
                    <th className="py-2.5 font-medium">Expense Title</th>
                    <th className="py-2.5 font-medium">CRM Deal Context</th>
                    <th className="py-2.5 font-medium">Amount</th>
                    <th className="py-2.5 font-medium">Status</th>
                    <th className="py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {myExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-line-2 last:border-0 hover:bg-bone/30">
                      <td className="py-3 font-medium leading-snug">
                        <div>{exp.title}</div>
                        {exp.description && (
                          <div className="text-[10px] text-muted font-normal mt-0.5">{exp.description}</div>
                        )}
                      </td>
                      <td className="py-3">
                        {exp.deal ? (
                          <span className="flex items-center gap-1 text-[11px] font-serif text-accent select-none">
                            <FolderOpen className="w-3.5 h-3.5 text-ink-2" />
                            {exp.deal_name || "Linked Deal"}
                          </span>
                        ) : (
                          <span className="text-muted font-mono text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 font-semibold font-mono text-[12px]">{formatINR(toNumber(exp.amount))}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            exp.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : exp.status === "rejected"
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 text-muted">{formatLongDate(new Date(exp.created_at))}</td>
                      <td className="py-3">
                        {exp.receipt ? (
                          <a
                            href={exp.receipt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:underline text-ink font-semibold"
                          >
                            View
                            <ExternalLink className="w-3 h-3 text-muted" />
                          </a>
                        ) : (
                          <span className="text-muted/60">No file</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Claim Submission Form */}
        <div className="card p-6 flex flex-col gap-4 border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <Coins className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">File Expense Claim</h2>
          </div>

          <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Expense Title</label>
              <input
                type="text"
                placeholder="Stationery, Client lunch, Flight..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Amount (INR)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Context Deal</label>
                <select
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
                >
                  <option value="">No deal linkage</option>
                  {dealsLoading ? (
                    <option disabled>Loading open deals...</option>
                  ) : (
                    deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        💼 {d.title} ({formatINR(toNumber(d.amount))})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Description</label>
              <textarea
                placeholder="Optional descriptions..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-bone border border-line rounded px-3 py-2 text-[12.5px] outline-none focus:border-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Receipt File</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                className="bg-bone border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-ink file:bg-paper file:border file:border-line file:rounded file:px-2 file:py-1 file:text-xs file:font-semibold"
              />
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
              disabled={submitExpenseMutation.isPending}
              className="bg-ink hover:opacity-90 text-paper py-2.5 rounded-lg text-xs font-semibold transition-all mt-1"
            >
              {submitExpenseMutation.isPending ? "SUBMITTING CLAIM..." : "SUBMIT REIMBURSEMENT CLAIM"}
            </button>
          </form>
        </div>
      </div>

      {/* Secondary Admin Reimbursements Desk */}
      {isManager && companyExpenses.some((e) => e.status === "pending") && (
        <div className="card p-6 border border-line bg-paper flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <Coins className="w-5 h-5 text-accent animate-spin" style={{ animationDuration: '6s' }} />
            <h2 className="font-serif text-[20px]">Company Expenses Verification Workspace</h2>
          </div>

          <div className="flex flex-col gap-3.5">
            {companyExpenses
              .filter((e) => e.status === "pending")
              .map((exp) => (
                <div key={exp.id} className="border border-line rounded-lg p-4 bg-bone flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-grow flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[13.5px]">{exp.user_full_name}</span>
                      <span className="text-muted text-xs">({exp.user_email})</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                      <span className="font-serif italic font-bold">{exp.title}</span>
                    </div>
                    <p className="text-xs text-ink-2 mt-1">
                      <strong>Amount requested</strong>: <strong className="font-mono">{formatINR(toNumber(exp.amount))}</strong>
                    </p>
                    {exp.description && (
                      <p className="text-xs text-muted leading-tight mt-0.5">"{exp.description}"</p>
                    )}
                    {exp.deal && (
                      <div className="flex items-center gap-1.5 text-[11px] text-accent/95 font-serif mt-1 select-none">
                        <span>Associated Pipeline Deal:</span>
                        <strong className="text-ink-2">{exp.deal_name}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {exp.receipt && (
                      <a
                        href={exp.receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-paper border border-line hover:bg-bone-2 text-ink-2 hover:text-ink px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        Receipt
                        <ExternalLink className="w-3.5 h-3.5 text-muted" />
                      </a>
                    )}

                    <input
                      type="text"
                      placeholder="Approval comment..."
                      value={managerNotes[exp.id] || ""}
                      onChange={(e) =>
                        setManagerNotes({ ...managerNotes, [exp.id]: e.target.value })
                      }
                      className="bg-paper border border-line rounded px-2.5 py-1.5 text-xs outline-none focus:border-ink w-[180px]"
                    />
                    <button
                      onClick={() => handleReviewExpense(exp.id, "approved")}
                      disabled={approveExpenseMutation.isPending}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewExpense(exp.id, "rejected")}
                      disabled={approveExpenseMutation.isPending}
                      className="bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
