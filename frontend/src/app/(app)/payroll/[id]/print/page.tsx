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
    if (slip && company && invoiceSettings && !isLoading) {
      document.title = `Salary Slip - ${slip.user_full_name}`;
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [slip, company, invoiceSettings, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (error || !slip || !company || !invoiceSettings) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-2">Salary Slip Not Found</h1>
          <p className="text-muted">This slip may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const tpl = invoiceSettings?.template_layout || 'template1';
  const accentColor = invoiceSettings?.template_accent_color || '#4F46E5';
  const fontFamily = invoiceSettings?.template_font_family || 'Inter';

  const FONT_STACK: Record<string, string> = {
    Inter:  '"Inter", ui-sans-serif, system-ui, sans-serif',
    Roboto: '"Roboto", ui-sans-serif, system-ui, sans-serif',
    Outfit: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    serif:  'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  };

  const resolvedFontStack = FONT_STACK[fontFamily] ?? FONT_STACK['Inter'];
  
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
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:m-0 { margin: 0 !important; }
        }
      `}} />

      <div className="min-h-screen bg-bone/30 py-12 px-4 sm:px-6 print:py-0 print:px-0 print:bg-white" style={{ fontFamily: resolvedFontStack }}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-line p-8 md:p-12 print:shadow-none print:border-none print:p-0">
            
            <div className={`flex flex-col-reverse md:flex-row print:flex-row justify-between items-start gap-8 mb-12 print:mb-8 ${tpl === 'template2' ? 'md:flex-row-reverse print:flex-row-reverse' : ''} ${tpl === 'template3' ? 'bg-ink text-white p-8 rounded-xl print:rounded-none' : ''}`} style={tpl === 'template3' ? { backgroundColor: accentColor } : {}}>
              <div className="flex-1">
                {invoiceSettings?.invoice_logo ? (
                  <img src={invoiceSettings.invoice_logo} alt="Company Logo" className={`max-h-16 object-contain mb-6 mix-blend-multiply ${tpl === 'template3' ? 'brightness-0 invert mix-blend-normal' : ''}`}  />
                ) : (
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold mb-6 ${tpl === 'template3' ? 'bg-white/20 text-white' : 'bg-bone text-ink'}`}>
                    {(company?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-1 ${tpl === 'template3' ? 'text-white' : 'text-ink'}`}>{company?.name || 'Company Name'}</h2>
                
                {company?.company_website && <p className={`text-sm md:text-base mt-1 ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>{company.company_website.replace(/^https?:\/\//, '')}</p>}
                {company?.company_email && <p className={`text-sm md:text-base ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>{company.company_email}</p>}

                <div className="mt-4 space-y-1">
                  <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Issue Date: <span className="font-medium">{new Date().toLocaleDateString("en-US")}</span></p>
                </div>
                {tpl !== 'template3' && (
                  <div className="h-0.5 w-12 ml-auto mt-6 rounded-full" style={{ backgroundColor: accentColor }}></div>
                )}
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                     style={tpl === 'template3' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'transparent' } : {}}
                >
                  Status: <span className="capitalize">Published</span>
                </div>
              </div>

              <div className={`text-left md:text-right print:text-right ${tpl === 'template2' ? 'md:text-left print:text-left' : ''}`}>
                <h1 className={`text-3xl font-bold mb-2 tracking-tight ${tpl === 'template3' ? 'text-white' : 'text-ink'}`} style={tpl === 'template1' ? { color: accentColor } : {}}>SALARY SLIP</h1>
                <p className={`text-base md:text-lg uppercase tracking-wider font-semibold ${tpl === 'template3' ? 'text-white/80' : 'text-muted'}`}>{`Salary Slip - ${slip.user_full_name}`}</p>
                <div className={`mt-4 ${tpl === 'template3' ? 'text-white/90' : 'text-muted'}`}>
                  <p className="font-medium">Period:</p>
                  <p>{new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} {slip.year}</p>
                </div>
              </div>
            </div>

            <div className="mb-8 print:mb-2">
              <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-2" style={tpl === 'template1' ? { color: accentColor } : {}}>Employee Details</h3>
              <div className="font-medium text-lg text-ink capitalize">{slip.user_full_name}</div>
              <div className="text-muted text-sm capitalize">{Array.from(new Set([slip.user_designation, slip.user_department].filter(Boolean).map(s => String(s).trim().toLowerCase()))).join(' - ')}</div>
              <div className="text-muted text-sm">{slip.user_email}</div>
              {slip.user_employee_id && <div className="text-muted text-sm mt-0.5">Emp ID: <span className="font-medium text-ink">{slip.user_employee_id}</span></div>}
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left mb-8 print:mb-2 print:min-w-full">
                <thead>
                  <tr className="border-b border-line bg-bone/30" style={tpl === 'template1' ? { borderBottom: `2px solid ${accentColor}` } : {}}>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted" style={{ color: accentColor }}>Description</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted text-right whitespace-nowrap" style={{ color: accentColor }}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr className={'bg-white'}>
                    <td className="py-4 px-4"><div className="font-semibold text-ink">Basic Salary</div></td>
                    <td className="py-4 px-4 text-right text-ink whitespace-nowrap">{formatCurrency(parseFloat(slip.basic_salary), company?.currency || 'INR')}</td>
                  </tr>
                  
                  {(earnings || []).map((item: any, i: number) => (
                    <tr key={`earn-${i}`} className={'bg-white'}>
                      <td className="py-4 px-4"><div className="font-semibold text-ink">{item.name}</div></td>
                      <td className="py-4 px-4 text-right text-emerald-600 whitespace-nowrap">+ {formatCurrency(parseFloat(item.amount), company?.currency || 'INR')}</td>
                    </tr>
                  ))}
                  
                  {(deductions || []).map((item: any, i: number) => (
                    <tr key={`deduct-${i}`} className={'bg-white'}>
                      <td className="py-4 px-4"><div className="font-semibold text-ink">{item.name}</div></td>
                      <td className="py-4 px-4 text-right text-rose-600 whitespace-nowrap">- {formatCurrency(parseFloat(item.amount), company?.currency || 'INR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row print:flex print:flex-row justify-between border-t border-line pt-8 gap-8 print:gap-4 print:pt-2">
              
              <div className="flex-1 print:w-[60%] space-y-6 print:space-y-4">
                <div className="print:break-inside-avoid mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider">Paid Days</p>
                      <p className="font-semibold">{Number(slip.paid_days).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider">Loss of Pay Days</p>
                      <p className="font-semibold">{Number(slip.loss_of_pay_days).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {invoiceSettings?.show_authorised_signatory && (
                  <div className="pt-6 print:break-inside-avoid">
                    {invoiceSettings?.authorised_signatory_signature ? (
                      <img src={invoiceSettings.authorised_signatory_signature} alt="Authorised Signatory" className="h-12 object-contain mb-2" />
                    ) : (
                      <div className="h-12 border-b border-line w-32 mb-2"></div>
                    )}
                    <p className="text-sm font-semibold text-ink">Authorised Signatory</p>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm print:max-w-none print:w-[35%] shrink-0 space-y-3 print:break-inside-avoid print:mt-0">
                <div className="flex justify-between text-muted">
                  <span>Basic Salary</span>
                  <span>{formatCurrency(parseFloat(slip.basic_salary), company?.currency || 'INR')}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-ink pt-4 border-t-2 border-line"
                     style={tpl === 'template3' ? { backgroundColor: accentColor, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', border: 'none' } : {}}
                >
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>Net Pay</span>
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>{formatCurrency(parseFloat(slip.net_salary), company?.currency || 'INR')}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 print:mt-2 print:pt-2 border-t-2 border-line text-center flex flex-col items-center clear-both w-full" style={{ pageBreakBefore: 'auto' }}>
              <p className="text-muted text-sm">This is a computer-generated document and does not require a physical signature.</p>
              <p className="text-muted text-xs mt-2">Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
