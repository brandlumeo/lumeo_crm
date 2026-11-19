"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  CircleDollarSign,
  Wallet,
  Building2,
  Users2,
  Receipt,
  ShieldAlert,
  Loader2,
  Printer,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useCurrentUser, useCurrentCompany, useFinanceDashboard } from "@/lib/queries";
import { cn, formatINR, formatCompactINR } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function checkFinanceDashboardAccess(user: any, company: any): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;

  const role = (user.role || "").toLowerCase();
  // Owners, Admins, Managers (Secondary Admins), Accountants
  if (["owner", "admin", "manager", "accountant", "accounts"].includes(role)) {
    return true;
  }

  // Secondary admins or team management flags
  if (user.can_manage_team || user.has_management_access) {
    return true;
  }

  // Designation match for finance personnel
  const designation = (user.designation || "").toLowerCase();
  const financeKeywords = ["account", "finance", "cfo", "controller", "bookkeeper", "auditor"];
  if (financeKeywords.some((kw) => designation.includes(kw))) {
    return true;
  }

  // Company custom role check
  if (company?.roles && Array.isArray(company.roles)) {
    const roleId = role === "staff" ? "employee" : role;
    const roleObj = company.roles.find((r: any) => r.id === roleId || r.name?.toLowerCase() === role);
    if (roleObj) {
      if (roleObj.isAdmin) return true;
      const perms = roleObj.permissions || {};
      const fdView = perms["Finance Dashboard"]?.View;
      if (fdView && fdView !== "None") return true;
      const dashSub = perms["Dashboards"]?.sub?.["View Finance Dashboard"];
      if (dashSub && dashSub !== "None") return true;
    }
  }

  return false;
}

export default function FinanceDashboardPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [txScope, setTxScope] = useState<"month" | "all">("month");
  const [txCategory, setTxCategory] = useState<"all" | "payroll" | "inflow" | "bill" | "claim">("all");
  const [txSearch, setTxSearch] = useState<string>("");
  const [showAllTx, setShowAllTx] = useState<boolean>(false);

  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: company, isLoading: isCompanyLoading } = useCurrentCompany();

  const isAuthorized = useMemo(() => {
    return checkFinanceDashboardAccess(user, company);
  }, [user, company]);

  const {
    data: financeData,
    isLoading: isFinanceLoading,
  } = useFinanceDashboard(selectedYear, selectedMonth, txScope);

  const yearsList = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  const kpis = useMemo(() => {
    return financeData?.kpis || {
      gross_inflow: 0,
      total_outflow: 0,
      net_profit: 0,
      margin_pct: 0,
      pending_receivables: 0,
      pending_payables: 0,
      payroll_expense: 0,
      bills_expense: 0,
      claims_expense: 0,
    };
  }, [financeData?.kpis]);

  const expenseBreakdown = useMemo(() => {
    return financeData?.expense_breakdown || {
      payroll: { amount: 0, percentage: 0 },
      bills: { amount: 0, percentage: 0 },
      claims: { amount: 0, percentage: 0 },
    };
  }, [financeData?.expense_breakdown]);

  const annualSummary = useMemo(() => {
    return financeData?.annual_summary || {
      inflow: 0,
      outflow: 0,
      net_profit: 0,
      margin_pct: 0,
    };
  }, [financeData?.annual_summary]);

  const monthlyTrends = useMemo(() => {
    return financeData?.monthly_trends || [];
  }, [financeData?.monthly_trends]);

  const recentTransactions = useMemo(() => {
    return financeData?.recent_transactions || [];
  }, [financeData?.recent_transactions]);

  // Chart scaling calculations
  const maxMonthlyVal = useMemo(() => {
    return Math.max(
      1000,
      ...monthlyTrends.map((m) => Math.max(m.inflow, m.outflow))
    );
  }, [monthlyTrends]);

  const txCounts = useMemo(() => {
    return {
      all: recentTransactions.length,
      payroll: recentTransactions.filter((t) => t.type === "payroll").length,
      inflow: recentTransactions.filter((t) => t.type === "inflow").length,
      bill: recentTransactions.filter((t) => t.type === "bill").length,
      claim: recentTransactions.filter((t) => t.type === "claim").length,
    };
  }, [recentTransactions]);

  const filteredTransactions = useMemo(() => {
    let list = recentTransactions;
    if (txCategory !== "all") {
      list = list.filter((t) => t.type === txCategory);
    }
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.reference && t.reference.toLowerCase().includes(q))
      );
    }
    return list;
  }, [recentTransactions, txCategory, txSearch]);

  const displayedTransactions = showAllTx ? filteredTransactions : filteredTransactions.slice(0, 15);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportCSV = () => {
    if (!financeData?.monthly_trends) return;
    const headers = ["Month", "Cash Inflow", "Payroll Expense", "Vendor Bills", "Expense Claims", "Total Outflow", "Net Profit", "Margin %"];
    const rows = financeData.monthly_trends.map((m) => [
      m.full_name,
      m.inflow.toFixed(2),
      m.payroll.toFixed(2),
      m.bills.toFixed(2),
      m.claims.toFixed(2),
      m.outflow.toFixed(2),
      m.net_profit.toFixed(2),
      `${m.margin_pct}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Finance_Ledger_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state
  if (isUserLoading || isCompanyLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-ink-2" />
        <span className="text-[13.5px] text-muted font-serif">Loading financial intelligence...</span>
      </div>
    );
  }

  // Access Denied Screen
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-paper border border-line rounded-xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-serif font-medium text-ink">Executive Access Required</h2>
        <p className="text-[14px] text-muted mt-2 leading-relaxed">
          The monthly income and operational expense dashboard contains sensitive financial metrics.
          Access is limited to Company Owners, Administrators, Managers, and authorized Finance personnel.
        </p>
        <div className="mt-6 p-4 rounded-lg bg-bone-1 border border-line text-left text-[13px] text-ink-2">
          <p className="font-semibold text-ink mb-1">Need access to this dashboard?</p>
          <p>
            Ask your workspace administrator to assign you to a managerial or accountant role, or grant you
            <code className="mx-1 px-1.5 py-0.5 bg-paper rounded border border-line font-mono text-[12px]">Finance Dashboard</code>
            access inside <span className="font-medium text-ink">Settings &gt; Roles &amp; Permissions</span>.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-ink text-paper text-[13.5px] font-medium rounded-lg hover:bg-ink/90 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 w-full min-w-0 max-w-[1400px] mx-auto pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 text-muted text-[12.5px] uppercase tracking-wider font-semibold mb-1">
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            <span>Executive Financial Intelligence</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight font-medium">
            Income &amp; Expense Dashboard
          </h1>
          <p className="text-[13.5px] text-muted mt-1 max-w-xl">
            Real-time operating income, staff payroll commitments, vendor payables, and net monthly cash flow.
          </p>
        </div>

        {/* Year & Month Selector + Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year selector */}
          <div className="flex items-center bg-paper border border-line rounded-lg shadow-2xs p-1">
            <span className="text-[12px] text-muted px-2 font-mono">Year:</span>
            {yearsList.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={cn(
                  "px-3 py-1 text-[13px] rounded-md font-mono transition-all",
                  selectedYear === y
                    ? "bg-ink text-paper font-semibold shadow-xs"
                    : "text-muted hover:text-ink hover:bg-bone-1"
                )}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Month selector dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-paper border border-line text-ink text-[13px] rounded-lg px-3 py-2 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name} {selectedYear}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 print:hidden">
            <button
              onClick={handlePrint}
              title="Print Financial Statement"
              className="p-2 border border-line bg-paper text-ink rounded-lg hover:bg-bone-1 transition-colors"
            >
              <Printer className="w-4 h-4 text-muted" />
            </button>
            <button
              onClick={handleExportCSV}
              title="Export P&L Ledger (CSV)"
              className="flex items-center gap-1.5 px-3 py-2 border border-line bg-paper text-ink text-[13px] rounded-lg hover:bg-bone-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-muted" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {isFinanceLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-ink-2" />
          <p className="text-[14px] text-muted font-serif">Computing monthly ledger &amp; operational metrics...</p>
        </div>
      ) : (
        <>
          {/* Month Navigator Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {MONTH_NAMES.map((name, idx) => {
              const mNum = idx + 1;
              const isSelected = selectedMonth === mNum;
              const monthData = monthlyTrends[idx];
              const isProfitable = monthData && monthData.net_profit >= 0;

              return (
                <button
                  key={name}
                  onClick={() => setSelectedMonth(mNum)}
                  className={cn(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left min-w-[96px] transition-all shrink-0",
                    isSelected
                      ? "bg-ink text-paper border-ink shadow-sm"
                      : "bg-paper text-ink-2 border-line hover:border-ink/50 hover:bg-bone-1"
                  )}
                >
                  <span className={cn("text-[11.5px] font-medium uppercase tracking-wider", isSelected ? "text-paper/70" : "text-muted")}>
                    {name.slice(0, 3)}
                  </span>
                  <span className={cn("text-[13px] font-mono font-semibold mt-0.5", isSelected ? "text-paper" : isProfitable ? "text-emerald-600" : "text-rose-600")}>
                    {monthData ? formatCompactINR(monthData.net_profit) : "₹0"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4 Core Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Cash Inflow */}
            <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-muted font-medium">Gross Cash Inflow</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl lg:text-3xl font-serif text-ink font-medium tracking-tight">
                    {formatINR(kpis.gross_inflow)}
                  </div>
                  <div className="text-[12.5px] text-muted mt-1 flex items-center gap-1.5">
                    <span className="text-emerald-700 font-medium">Client receipts</span>
                    <span>• {MONTH_NAMES[selectedMonth - 1]}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line/60 text-[11.5px] text-muted flex items-center justify-between font-mono">
                <span>Annual Inflow:</span>
                <span className="font-semibold text-ink">{formatCompactINR(annualSummary.inflow)}</span>
              </div>
            </div>

            {/* 2. Total Operational Outflow */}
            <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-muted font-medium">Operational Outflow</span>
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl lg:text-3xl font-serif text-ink font-medium tracking-tight">
                    {formatINR(kpis.total_outflow)}
                  </div>
                  <div className="text-[12px] text-muted mt-1 flex items-center gap-2">
                    <span>Payroll + Bills + Claims</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11.5px] text-muted font-mono">
                <span>Annual Outflow:</span>
                <span className="font-semibold text-rose-600">{formatCompactINR(annualSummary.outflow)}</span>
              </div>
            </div>

            {/* 3. Net Margin & Net Profit */}
            <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-muted font-medium">Net Operating Profit</span>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    kpis.net_profit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {kpis.net_profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-3">
                  <div className={cn(
                    "text-2xl lg:text-3xl font-serif font-medium tracking-tight",
                    kpis.net_profit >= 0 ? "text-emerald-700" : "text-rose-600"
                  )}>
                    {formatINR(kpis.net_profit)}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11.5px] font-mono font-medium",
                      kpis.margin_pct >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    )}>
                      {kpis.margin_pct >= 0 ? `+${kpis.margin_pct}%` : `${kpis.margin_pct}%`} Margin
                    </span>
                    <span className="text-[12px] text-muted">
                      {kpis.net_profit >= 0 ? "Surplus" : "Operating Deficit"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11.5px] text-muted font-mono">
                <span>Annual Net:</span>
                <span className={cn("font-semibold", annualSummary.net_profit >= 0 ? "text-emerald-700" : "text-rose-600")}>
                  {formatCompactINR(annualSummary.net_profit)} ({annualSummary.margin_pct}%)
                </span>
              </div>
            </div>

            {/* 4. Working Capital Position */}
            <div className="bg-paper border border-line rounded-xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-muted font-medium">Working Capital Gap</span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl lg:text-3xl font-serif text-ink font-medium tracking-tight">
                    {formatINR(kpis.pending_receivables - kpis.pending_payables)}
                  </div>
                  <div className="text-[12px] text-muted mt-1">
                    Outstanding client &amp; vendor balances
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] font-mono text-muted">
                <span>Receivables: <strong className="text-ink">{formatCompactINR(kpis.pending_receivables)}</strong></span>
                <span>Payables: <strong className="text-rose-600">{formatCompactINR(kpis.pending_payables)}</strong></span>
              </div>
            </div>
          </div>

          {/* Charts & Analytical Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 12-Month Inflow vs Outflow Clustered Chart */}
            <div className="lg:col-span-2 bg-paper border border-line rounded-xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="font-serif text-[18px] text-ink font-medium">12-Month Inflow vs Outflow</h3>
                    <p className="text-[12.5px] text-muted">Comparison of revenue intake vs operating expenses across {selectedYear}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[12px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-xs bg-emerald-600" />
                      <span className="text-muted">Inflow</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-xs bg-rose-500" />
                      <span className="text-muted">Outflow</span>
                    </div>
                  </div>
                </div>

                {/* SVG / Bar Chart Representation */}
                <div className="h-64 flex items-end justify-between gap-2 sm:gap-3 pt-6 border-b border-line/70">
                  {monthlyTrends.map((m) => {
                    const inflowHeight = Math.min(100, Math.max(6, Math.round((m.inflow / maxMonthlyVal) * 100)));
                    const outflowHeight = Math.min(100, Math.max(6, Math.round((m.outflow / maxMonthlyVal) * 100)));
                    const isSelected = m.month === selectedMonth;

                    return (
                      <div
                        key={m.month}
                        onClick={() => setSelectedMonth(m.month)}
                        className={cn(
                          "flex-1 flex flex-col items-center h-full justify-end group cursor-pointer p-1 rounded-t-lg transition-all",
                          isSelected ? "bg-bone-2/80 ring-1 ring-ink/20" : "hover:bg-bone-1"
                        )}
                      >
                        {/* Bars cluster */}
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-[82%] relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-ink text-paper text-[10.5px] font-mono py-1 px-2 rounded shadow-md whitespace-nowrap pointer-events-none">
                            <span>{m.name}: In {formatCompactINR(m.inflow)} | Out {formatCompactINR(m.outflow)}</span>
                            <span className={m.net_profit >= 0 ? "text-emerald-300" : "text-rose-300"}>
                              Net: {formatCompactINR(m.net_profit)} ({m.margin_pct}%)
                            </span>
                          </div>

                          {/* Inflow bar */}
                          <div
                            style={{ height: `${m.inflow > 0 ? inflowHeight : 3}%` }}
                            className={cn(
                              "w-1/2 rounded-t-sm transition-all",
                              m.inflow > 0 ? "bg-emerald-600 group-hover:bg-emerald-500" : "bg-emerald-100"
                            )}
                          />

                          {/* Outflow bar */}
                          <div
                            style={{ height: `${m.outflow > 0 ? outflowHeight : 3}%` }}
                            className={cn(
                              "w-1/2 rounded-t-sm transition-all",
                              m.outflow > 0 ? "bg-rose-500 group-hover:bg-rose-400" : "bg-rose-100"
                            )}
                          />
                        </div>

                        {/* Month label */}
                        <div className="mt-2 text-center">
                          <span className={cn(
                            "text-[11px] font-mono block",
                            isSelected ? "font-bold text-ink underline" : "text-muted"
                          )}>
                            {m.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

                <div className="mt-4 pt-3 flex flex-wrap items-center justify-between text-[12px] text-muted font-mono">
                <span>Selected: <strong className="text-ink">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong></span>
                <span>Click any bar to inspect that month&apos;s financial telemetry</span>
              </div>
            </div>

            {/* Expense Allocation Breakdown */}
            <div className="bg-paper border border-line rounded-xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-[18px] text-ink font-medium">Expense Breakdown</h3>
                <p className="text-[12.5px] text-muted mb-6">Allocation of operating costs for {MONTH_NAMES[selectedMonth - 1]}</p>

                {/* Progress bar split */}
                <div className="h-4 w-full bg-bone-2 rounded-full overflow-hidden flex mb-6">
                  <div
                    style={{ width: `${expenseBreakdown.payroll.percentage}%` }}
                    className="bg-indigo-600 transition-all"
                    title={`Payroll: ${expenseBreakdown.payroll.percentage}%`}
                  />
                  <div
                    style={{ width: `${expenseBreakdown.bills.percentage}%` }}
                    className="bg-amber-500 transition-all"
                    title={`Vendor Bills: ${expenseBreakdown.bills.percentage}%`}
                  />
                  <div
                    style={{ width: `${expenseBreakdown.claims.percentage}%` }}
                    className="bg-sky-500 transition-all"
                    title={`Expense Claims: ${expenseBreakdown.claims.percentage}%`}
                  />
                </div>

                {/* Categories Breakdown List */}
                <div className="space-y-4">
                  {/* 1. Payroll */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-bone-1/60 border border-line/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-ink">Staff Payroll</div>
                        <div className="text-[11.5px] text-muted">{expenseBreakdown.payroll.percentage}% of total expenses</div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-medium text-[13.5px] text-ink">
                      {formatINR(expenseBreakdown.payroll.amount)}
                    </div>
                  </div>

                  {/* 2. Vendor Bills */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-bone-1/60 border border-line/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-ink">Vendor Bills</div>
                        <div className="text-[11.5px] text-muted">{expenseBreakdown.bills.percentage}% of total expenses</div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-medium text-[13.5px] text-ink">
                      {formatINR(expenseBreakdown.bills.amount)}
                    </div>
                  </div>

                  {/* 3. Claims */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-bone-1/60 border border-line/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-ink">Employee Claims</div>
                        <div className="text-[11.5px] text-muted">{expenseBreakdown.claims.percentage}% of total expenses</div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-medium text-[13.5px] text-ink">
                      {formatINR(expenseBreakdown.claims.amount)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between text-[12px] text-muted font-mono">
                <span>Month Total Expenses:</span>
                <span className="font-semibold text-rose-600 text-[13px]">{formatINR(kpis.total_outflow)}</span>
              </div>
            </div>
          </div>

          {/* Monthly P&L Ledger Breakdown Table */}
          <div className="bg-paper border border-line rounded-xl shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-[19px] text-ink font-medium">Monthly P&amp;L Ledger ({selectedYear})</h3>
                <p className="text-[12.5px] text-muted mt-0.5">Comprehensive audit trail of revenues, payroll disbursements, purchase bills, and operational margins.</p>
              </div>
              <div className="text-[12px] font-mono text-muted">
                12 Months • Full Financial Year
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-bone-1/70 border-b border-line text-muted font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5 font-semibold">Month</th>
                    <th className="py-3 px-5 font-semibold text-right">Inflow (₹)</th>
                    <th className="py-3 px-5 font-semibold text-right">Payroll (₹)</th>
                    <th className="py-3 px-5 font-semibold text-right">Bills (₹)</th>
                    <th className="py-3 px-5 font-semibold text-right">Claims (₹)</th>
                    <th className="py-3 px-5 font-semibold text-right">Total Outflow (₹)</th>
                    <th className="py-3 px-5 font-semibold text-right">Net Profit (₹)</th>
                    <th className="py-3 px-5 font-semibold text-right">Margin %</th>
                    <th className="py-3 px-5 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {monthlyTrends.map((m) => {
                    const isSelected = m.month === selectedMonth;
                    const isProfitable = m.net_profit >= 0;

                    return (
                      <tr
                        key={m.month}
                        onClick={() => setSelectedMonth(m.month)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-bone-1/80",
                          isSelected ? "bg-bone-2/70 font-medium" : ""
                        )}
                      >
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-ink" />}
                            <span className={cn("text-ink", isSelected ? "font-bold" : "")}>
                              {m.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-emerald-700">
                          {formatINR(m.inflow)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-ink-2">
                          {formatINR(m.payroll)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-ink-2">
                          {formatINR(m.bills)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-ink-2">
                          {formatINR(m.claims)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-rose-600">
                          {formatINR(m.outflow)}
                        </td>
                        <td className={cn("py-3 px-5 text-right font-mono font-semibold", isProfitable ? "text-emerald-700" : "text-rose-600")}>
                          {formatINR(m.net_profit)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[11px]",
                            m.margin_pct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}>
                            {m.margin_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center whitespace-nowrap">
                          <span className={cn(
                            "text-[11px] font-mono px-2.5 py-0.5 rounded-full border",
                            m.net_profit > 0
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : m.net_profit < 0
                              ? "bg-rose-50 border-rose-200 text-rose-800"
                              : "bg-bone-2 border-line text-muted"
                          )}>
                            {m.net_profit > 0 ? "Profitable" : m.net_profit < 0 ? "Deficit" : "Break-even"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Annual Totals Footer */}
                <tfoot className="bg-bone-2/80 border-t-2 border-line font-semibold text-[13px]">
                  <tr>
                    <td className="py-3.5 px-5 font-serif text-ink">Annual FY {selectedYear} Totals</td>
                    <td className="py-3.5 px-5 text-right font-mono text-emerald-700">
                      {formatINR(annualSummary.inflow)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-ink-2">
                      {formatINR(monthlyTrends.reduce((acc, m) => acc + m.payroll, 0))}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-ink-2">
                      {formatINR(monthlyTrends.reduce((acc, m) => acc + m.bills, 0))}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-ink-2">
                      {formatINR(monthlyTrends.reduce((acc, m) => acc + m.claims, 0))}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-rose-600">
                      {formatINR(annualSummary.outflow)}
                    </td>
                    <td className={cn("py-3.5 px-5 text-right font-mono text-[14px]", annualSummary.net_profit >= 0 ? "text-emerald-700" : "text-rose-600")}>
                      {formatINR(annualSummary.net_profit)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[11px]",
                        annualSummary.margin_pct >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {annualSummary.margin_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono text-[11.5px] text-muted">
                      Full Year
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Recent Financial Transactions Stream */}
          <div className="bg-paper border border-line rounded-xl p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-[18px] text-ink font-medium">
                    {txScope === "month"
                      ? `Financial Ledger — ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                      : "All-Time Financial Ledger"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {txScope === "month" ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : "All History"}
                  </span>
                </div>
                <p className="text-[12.5px] text-muted mt-0.5">
                  {txScope === "month"
                    ? `Live ledger activity strictly scoped to ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`
                    : "Complete live ledger activity across all recorded transactions."}
                </p>
              </div>

              {/* Scope toggle button & items count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-bone-1 border border-line rounded-lg p-0.5 text-[12px]">
                  <button
                    onClick={() => setTxScope("month")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-all",
                      txScope === "month"
                        ? "bg-paper text-ink shadow-2xs border border-line font-semibold"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    {MONTH_NAMES[selectedMonth - 1].slice(0, 3)} Only
                  </button>
                  <button
                    onClick={() => setTxScope("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium transition-all",
                      txScope === "all"
                        ? "bg-paper text-ink shadow-2xs border border-line font-semibold"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    All History
                  </button>
                </div>
                <div className="text-[12px] font-mono text-muted shrink-0">
                  Showing {displayedTransactions.length} of {filteredTransactions.length} items
                </div>
              </div>
            </div>

            {/* Filter Pills & Live Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b border-line/60">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setTxCategory("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 shrink-0",
                    txCategory === "all"
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-bone-1 text-muted hover:text-ink hover:bg-bone-2"
                  )}
                >
                  <span>All</span>
                  <span className={cn("px-1.5 py-0.2 rounded-full text-[11px] font-mono", txCategory === "all" ? "bg-paper/20 text-paper" : "bg-line text-ink-2")}>
                    {txCounts.all}
                  </span>
                </button>

                <button
                  onClick={() => setTxCategory("payroll")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 shrink-0",
                    txCategory === "payroll"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-bone-1 text-muted hover:text-ink hover:bg-bone-2"
                  )}
                >
                  <Users2 className="w-3.5 h-3.5" />
                  <span>Payroll</span>
                  <span className={cn("px-1.5 py-0.2 rounded-full text-[11px] font-mono", txCategory === "payroll" ? "bg-white/20 text-white" : "bg-line text-ink-2")}>
                    {txCounts.payroll}
                  </span>
                </button>

                <button
                  onClick={() => setTxCategory("inflow")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 shrink-0",
                    txCategory === "inflow"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-bone-1 text-muted hover:text-ink hover:bg-bone-2"
                  )}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Client Inflows</span>
                  <span className={cn("px-1.5 py-0.2 rounded-full text-[11px] font-mono", txCategory === "inflow" ? "bg-white/20 text-white" : "bg-line text-ink-2")}>
                    {txCounts.inflow}
                  </span>
                </button>

                <button
                  onClick={() => setTxCategory("bill")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 shrink-0",
                    txCategory === "bill"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-bone-1 text-muted hover:text-ink hover:bg-bone-2"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Vendor Bills</span>
                  <span className={cn("px-1.5 py-0.2 rounded-full text-[11px] font-mono", txCategory === "bill" ? "bg-white/20 text-white" : "bg-line text-ink-2")}>
                    {txCounts.bill}
                  </span>
                </button>

                <button
                  onClick={() => setTxCategory("claim")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 shrink-0",
                    txCategory === "claim"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-bone-1 text-muted hover:text-ink hover:bg-bone-2"
                  )}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Claims</span>
                  <span className={cn("px-1.5 py-0.2 rounded-full text-[11px] font-mono", txCategory === "claim" ? "bg-white/20 text-white" : "bg-line text-ink-2")}>
                    {txCounts.claim}
                  </span>
                </button>
              </div>

              {/* Live search input */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search by name, bill, ref..."
                  className="w-full bg-paper border border-line rounded-lg pl-9 pr-3 py-1.5 text-[13px] text-ink placeholder:text-muted/70 focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px] font-serif border border-dashed border-line rounded-lg">
                {txSearch
                  ? `No matching transactions found for "${txSearch}".`
                  : txScope === "month"
                  ? `No financial transactions recorded for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`
                  : "No financial transactions found."}
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {displayedTransactions.map((tx) => {
                  const isInflow = tx.type === "inflow";
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-4 hover:bg-bone-1/50 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          isInflow
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : tx.type === "payroll"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                            : tx.type === "bill"
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-sky-50 text-sky-600 border border-sky-200"
                        )}>
                          {isInflow ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : tx.type === "payroll" ? (
                            <Users2 className="w-4 h-4" />
                          ) : tx.type === "bill" ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <Receipt className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-ink truncate">
                            {tx.title}
                          </div>
                          <div className="text-[12px] text-muted flex items-center gap-2">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{tx.date}</span>
                            {tx.reference && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[11px] text-ink-2 bg-bone-2 px-1.5 py-0.2 rounded">
                                  {tx.reference}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={cn(
                          "font-mono font-semibold text-[14px]",
                          isInflow ? "text-emerald-700" : "text-rose-600"
                        )}>
                          {isInflow ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                        </div>
                        <div className="text-[11px] text-muted capitalize font-mono">
                          {tx.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show All / Show Less Toggle Button */}
            {filteredTransactions.length > 15 && (
              <div className="mt-4 pt-3 border-t border-line/60 flex justify-center">
                <button
                  onClick={() => setShowAllTx(!showAllTx)}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink hover:text-ink/80 py-1.5 px-3 rounded-lg border border-line bg-paper hover:bg-bone-1 transition-all"
                >
                  <span>{showAllTx ? "Show Less" : `Show All (${filteredTransactions.length} Transactions)`}</span>
                  {showAllTx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

