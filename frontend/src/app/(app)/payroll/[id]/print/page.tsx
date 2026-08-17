"use client";

import { use, useEffect } from "react";
import { usePayroll, useCurrentCompany, useInvoiceSettings } from "@/lib/queries";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PayrollPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: slip, isLoading, error } = usePayroll(id);
  const { data: company } = useCurrentCompany();
  const { data: invoiceSettings } = useInvoiceSettings();

  useEffect(() => {
    // Only print when everything is loaded
    if (slip && company && !isLoading) {
      document.title = `Salary Slip - ${slip.user_full_name}`;
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [slip, company, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (error || !slip || !company) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-2">Salary Slip Not Found</h1>
          <p className="text-muted">This slip may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }
  
  let earnings = [];
  try {
    earnings = typeof slip.earnings_breakdown === 'string' ? JSON.parse(slip.earnings_breakdown) : slip.earnings_breakdown;
  } catch (e) {}
  
  let deductions = [];
  try {
    deductions = typeof slip.deductions_breakdown === 'string' ? JSON.parse(slip.deductions_breakdown) : slip.deductions_breakdown;
  } catch (e) {}

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        @media print {
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background-color: white !important; 
            font-family: 'Outfit', sans-serif !important;
          }
          .print\:hidden { display: none !important; }
          .print\:break-inside-avoid { break-inside: avoid; }
          .print\:shadow-none { box-shadow: none !important; }
          .print\:p-0 { padding: 0 !important; }
          .print\:max-w-none { max-width: none !important; }
          .print\:border-none { border: none !important; }
          .print\:m-0 { margin: 0 !important; }
        }
      `}} />

      <div className="min-h-screen bg-bone/30 py-12 px-4 sm:px-6 print:py-0 print:px-0 print:bg-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-line p-8 md:p-16 print:shadow-none print:border-none print:p-0 print:m-0">
            
            {/* Header Section */}
            <div className="flex flex-row justify-between items-start mb-12 print:mb-10 pb-8 border-b border-line">
              <div className="flex flex-col">
                {invoiceSettings?.invoice_logo ? (
                  <img src={invoiceSettings.invoice_logo} alt="Company Logo" className="h-10 object-contain mb-4 mix-blend-multiply" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold mb-4 bg-bone text-ink">
                    {(company?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="text-2xl leading-none font-bold tracking-tight mb-2 text-ink uppercase">{company?.name || 'Company Name'}</h2>
                <div className="space-y-1">
                    {company?.company_website && <p className="text-sm text-muted">{company.company_website.replace(/^https?:\/\//, '')}</p>}
                    {company?.company_email && <p className="text-sm text-muted">{company.company_email}</p>}
                </div>
              </div>

              <div className="text-right">
                <h1 className="text-[28px] font-bold tracking-tight text-ink uppercase mb-2">Salary Slip</h1>
                <p className="text-sm font-medium uppercase tracking-wider text-muted mb-4">{new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} {slip.year}</p>
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bone text-ink border border-line">
                  Status: Published
                </div>
              </div>
            </div>

            {/* Employee details & Dates */}
            <div className="flex flex-row justify-between mb-12 print:mb-10">
                <div className="flex-1">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Employee Details</h3>
                    <div className="text-lg font-semibold text-ink capitalize tracking-tight mb-1">{slip.user_full_name}</div>
                    <div className="text-muted text-sm capitalize mb-1">{Array.from(new Set([slip.user_designation, slip.user_department].filter(Boolean).map(s => String(s).trim().toLowerCase()))).join(' - ')}</div>
                    {slip.user_employee_id && <div className="text-muted text-sm mt-1">ID: <span className="font-medium text-ink">{slip.user_employee_id}</span></div>}
                </div>
                
                <div className="text-right">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Issue Date</h3>
                    <div className="text-sm font-medium text-ink">{new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric'})}</div>
                </div>
            </div>

            {/* Salary Breakdown Table */}
            <div className="mb-12 print:mb-8">
              <table className="w-full text-left print:min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-3 px-0 border-b border-line font-bold text-[10px] uppercase tracking-widest text-muted">Description</th>
                    <th className="py-3 px-0 border-b border-line font-bold text-[10px] uppercase tracking-widest text-muted text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  <tr>
                    <td className="py-4 px-0 font-medium text-ink">Basic Salary</td>
                    <td className="py-4 px-0 text-right text-ink font-medium whitespace-nowrap">{formatCurrency(parseFloat(slip.basic_salary), company?.currency || 'INR')}</td>
                  </tr>
                  
                  {(earnings || []).map((item: any, i: number) => (
                    <tr key={`earn-${i}`}>
                      <td className="py-4 px-0 font-medium text-ink">{item.name}</td>
                      <td className="py-4 px-0 text-right text-ink whitespace-nowrap">{formatCurrency(parseFloat(item.amount), company?.currency || 'INR')}</td>
                    </tr>
                  ))}
                  
                  {(deductions || []).map((item: any, i: number) => (
                    <tr key={`deduct-${i}`}>
                      <td className="py-4 px-0 font-medium text-ink">{item.name}</td>
                      <td className="py-4 px-0 text-right text-ink whitespace-nowrap">- {formatCurrency(parseFloat(item.amount), company?.currency || 'INR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="flex flex-row justify-between items-end border-t-2 border-ink pt-8 print:pt-6">
              
              <div className="flex gap-12 print:break-inside-avoid">
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Paid Days</p>
                  <p className="text-lg font-semibold text-ink">{Number(slip.paid_days).toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Loss of Pay</p>
                  <p className="text-lg font-semibold text-ink">{Number(slip.loss_of_pay_days).toFixed(1)}</p>
                </div>
              </div>

              <div className="text-right print:break-inside-avoid">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Net Pay</div>
                <div className="text-3xl font-bold tracking-tight text-ink">
                  {formatCurrency(parseFloat(slip.net_salary), company?.currency || 'INR')}
                </div>
              </div>
              
            </div>

            {/* Signatures */}
            {invoiceSettings?.show_authorised_signatory && (
                <div className="mt-20 pt-8 border-t border-line flex justify-end print:break-inside-avoid">
                    <div className="text-right">
                        {invoiceSettings?.authorised_signatory_signature ? (
                            <img src={invoiceSettings.authorised_signatory_signature} alt="Authorised Signatory" className="h-10 object-contain mb-3 ml-auto" />
                        ) : (
                            <div className="h-10 w-32 mb-3"></div>
                        )}
                        <p className="text-xs font-semibold text-ink uppercase tracking-wider">Authorised Signatory</p>
                    </div>
                </div>
            )}

            <div className="mt-16 text-center text-xs text-muted print:mt-12">
              <p>This is a computer generated document and does not require a physical signature.</p>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
