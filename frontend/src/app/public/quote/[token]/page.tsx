"use client";
import { toast } from "sonner";


import { useState, useRef, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePublicQuote, useSignPublicQuote } from "@/lib/queries";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, CheckCircle2, FileText, Download } from "lucide-react";
import { QuoteLineItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get('print') === 'true';

  const { data: quote, isLoading, error } = usePublicQuote(token);
  const signMutation = useSignPublicQuote();

  useEffect(() => {
    if (quote) {
      document.title = `Quote_${quote.quote_number}`;
    }
    if (shouldPrint && quote && !isLoading) {
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [shouldPrint, quote, isLoading]);

  // ── Font & Scale ────────────────────────────────────────────────
  // Defined before any early return (Rules of Hooks).
  // quote?.settings may be undefined while loading — defaults handle that.
  const quoteSettings = (quote as any)?.settings || (quote?.company as any)?.invoice_settings || {};
  const fontFamily = quoteSettings.template_font_family || 'Inter';

  const FONT_GOOGLE_URL: Record<string, string> = {
    Inter:  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    Outfit: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap',
  };

  const FONT_STACK: Record<string, string> = {
    Inter:  '"Inter", ui-sans-serif, system-ui, sans-serif',
    Roboto: '"Roboto", ui-sans-serif, system-ui, sans-serif',
    Outfit: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    serif:  'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  };

  const resolvedFontStack = FONT_STACK[fontFamily] ?? FONT_STACK['Inter'];

  // Inject the Google Fonts <link> unconditionally — must be before any early return.
  useEffect(() => {
    const url = FONT_GOOGLE_URL[fontFamily];
    if (!url) return;
    const id = `gfont-${fontFamily}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamily]);

  const quoteScale = quoteSettings.template_scale || 'Standard';

  // Font Scaling: must change document.documentElement.style.fontSize because
  // Tailwind uses rem units (resolved from <html>), not from any ancestor div.
  const SCALE_ROOT_PX: Record<string, string> = {
    Small:    '13px',
    Standard: '15px',
    Large:    '17px',
  };

  const fontSizePx = SCALE_ROOT_PX[quoteScale] ?? '15px';

  const [signedByName, setSignedByName] = useState("");
  const sigCanvas = useRef<SignatureCanvas>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-2">Quote Not Found</h1>
          <p className="text-muted">This quote may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSign = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error("Please provide a signature.");
      return;
    }
    if (!signedByName.trim()) {
      toast.error("Please print your name.");
      return;
    }

    const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
    
    signMutation.mutate({
      token,
      payload: {
        signature_data: signatureData,
        signed_by_name: signedByName,
      }
    });
  };

  const isSigned = !!quote.signature_data;

  // Quotes might only have basic company data without full settings nested, 
  // so we safely fallback or use standard UI if settings aren't fully populated.
  const settings = (quote as any).settings || (quote.company as any)?.invoice_settings || {};
  const tpl = settings.template_id || (quote.company as any)?.invoice_template || 'template1';
  const accentColor = settings.template_accent_color || '#4F46E5';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          font-size: ${fontSizePx} !important;
        }
        .quote-container, .quote-container * {
          font-family: ${resolvedFontStack} !important;
        }
      `}} />
      <div
        className="quote-container min-h-screen print:min-h-0 print:bg-white bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50 py-16 print:py-0 px-4 sm:px-6 lg:px-8 print:px-0"
      >
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-8 transition-all duration-300 print:space-y-0">
        
        {/* QUOTE DOCUMENT */}
        <div 
          className={`rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border p-10 md:p-14 print:shadow-none print:border-none print:p-0 print:m-0 bg-white print:overflow-visible relative overflow-hidden ${
            tpl === 'template3' ? 'border-none' : 
            tpl === 'template4' ? 'border-slate-100 flex flex-col md:flex-row p-0' : 
            'border-slate-100/60'
          }`}
          style={tpl === 'template3' ? { borderTop: `8px solid ${accentColor}` } : {}}
        >
          
          {tpl === 'template4' && (
            <div className="md:w-1/3 p-8 md:p-12 text-white flex flex-col justify-between" style={{ backgroundColor: '#1e293b' }}>
              <div>
                {settings.invoice_logo ? (
                  <img src={settings.invoice_logo} alt="Company Logo" className="h-16 object-contain mb-8 bg-white p-2 rounded" />
                ) : (
                  <h1 className="text-3xl font-bold mb-8">{quote.company?.name || "Company"}</h1>
                )}
                
                <h2 className="text-xl font-semibold mb-2">{quote.company?.name || "Company"}</h2>
                {quote.company?.company_website && <p className="text-sm opacity-80 mt-1">{quote.company.company_website.replace(/^https?:\/\//, '')}</p>}
                {quote.company?.company_email && <p className="text-sm opacity-80">{quote.company.company_email}</p>}
                
                {settings.company_tax_id && settings.show_sender_tax_number !== false && (
                  <div className="mt-8 pt-8 border-t border-white/20">
                    <p className="text-xs opacity-70 uppercase tracking-wider mb-1">Tax ID / VAT</p>
                    <p className="text-sm font-medium">{settings.company_tax_id}</p>
                  </div>
                )}
                {settings.company_registration_number && (
                  <div className="mt-4">
                    <p className="text-xs opacity-70 uppercase tracking-wider mb-1">Company Reg. No</p>
                    <p className="text-sm font-medium">{settings.company_registration_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={tpl === 'template4' ? "md:w-2/3 p-8 md:p-12 bg-white" : ""}>
            {/* Header Area */}
            {tpl !== 'template4' && (
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-10 mb-10"
                   style={tpl === 'template3' ? { backgroundColor: accentColor, margin: '-3.5rem -3.5rem 2.5rem -3.5rem', padding: '3.5rem', color: 'white' } : {}}
              >
                <div>
                  {settings.invoice_logo ? (
                    <img src={settings.invoice_logo} alt="Company Logo" className="h-16 md:h-20 object-contain mb-6" style={tpl === 'template3' ? { filter: 'brightness(0) invert(1)' } : {}} />
                  ) : (
                    <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight text-slate-800" style={tpl === 'template3' ? { color: 'white' } : {}}>QUOTE</h1>
                  )}
                  <div className="flex items-center gap-3">
                    <p className={`text-base md:text-lg tracking-wider font-semibold ${tpl === 'template3' ? 'opacity-90 text-white' : 'text-slate-500'}`}>{quote.quote_number}</p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm"
                         style={tpl === 'template3' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : { backgroundColor: `${accentColor}15`, color: accentColor }}
                    >
                      {quote.status.replace("_", " ")}
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800" style={tpl === 'template3' ? { color: 'white' } : {}}>{quote.company?.name || "Company"}</h2>
                  <p className={`text-base mt-2 font-medium ${tpl === 'template3' ? 'opacity-90' : 'text-slate-500'}`}>{quote.title}</p>
                  
                  {quote.company?.company_website && <p className={`text-sm mt-3 ${tpl === 'template3' ? 'opacity-80' : 'text-slate-400'}`}>{quote.company.company_website.replace(/^https?:\/\//, '')}</p>}
                  {quote.company?.company_email && <p className={`text-sm ${tpl === 'template3' ? 'opacity-80' : 'text-slate-400'}`}>{quote.company.company_email}</p>}
                </div>
              </div>
            )}

            {/* If template4, show quote number, dates here */}
            {tpl === 'template4' && (
              <div className="flex justify-between items-start border-b border-line/50 pb-8 mb-8">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight text-ink">QUOTE</h1>
                  <p className="text-sm md:text-base uppercase tracking-wider font-semibold text-muted">{quote.quote_number}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-bone-2 text-ink">
                    Status: <span className="capitalize">{quote.status.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-ink">{quote.company?.name || "Company"}</h2>
                    <p className="text-sm text-muted">{quote.title}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left mb-8 print:min-w-full border-collapse">
                <thead>
                  <tr className="border-b-2" style={tpl === 'template1' ? { borderBottomColor: accentColor } : { borderBottomColor: '#e2e8f0' }}>
                    <th className="py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Item</th>
                    <th className="py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs text-right whitespace-nowrap">Qty</th>
                    <th className="py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs text-right whitespace-nowrap">Price</th>
                    <th className="py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs text-right whitespace-nowrap pr-4 sm:pr-6">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-5 px-2">
                        <div className="font-semibold text-slate-800 text-base">{item.name}</div>
                        {item.description && <div className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xl">{item.description}</div>}
                      </td>
                      <td className="py-5 px-2 text-right text-slate-700 whitespace-nowrap font-medium">
                        {item.quantity} {item.unit || ""}
                      </td>
                      <td className="py-5 px-2 text-right text-slate-700 whitespace-nowrap">{formatCurrency(parseFloat(item.unit_price), quote.currency || quote.company?.currency)}</td>
                      <td className="py-5 px-2 pr-4 sm:pr-6 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.quantity * parseFloat(item.unit_price), quote.currency || quote.company?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-8">
              <div className="w-full max-w-sm space-y-4 bg-slate-50 p-6 rounded-2xl print:bg-transparent print:p-0 print:rounded-none">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span className="text-slate-800">{formatCurrency(parseFloat(quote.subtotal), quote.currency || quote.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Tax</span>
                  <span className="text-slate-800">{formatCurrency(parseFloat(quote.tax_amount), quote.currency || quote.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-slate-900 pt-4 border-t border-slate-200 mt-2"
                     style={tpl === 'template3' ? { backgroundColor: accentColor, color: 'white', padding: '1rem', borderRadius: '0.75rem', marginTop: '1rem', border: 'none' } : {}}
                >
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>Total</span>
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>{formatCurrency(parseFloat(quote.total), quote.currency || quote.company?.currency)}</span>
                </div>
              </div>
            </div>
            
            {settings.footer_text && (
              <div className="mt-16 pt-8 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">{settings.footer_text}</p>
              </div>
            )}
            
          </div>
        </div>

        {/* E-Signature Section */}
        <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 p-10 md:p-14 ${!isSigned ? 'print:hidden' : 'print:shadow-none print:border-none print:bg-transparent print:p-0 print:mt-12'}`}>
          {isSigned ? (
            <div className="text-center py-8">
              <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Quote Accepted</h3>
              <p className="text-slate-500 font-medium text-lg mb-10">This quote was signed and accepted on {new Date(quote.signed_at!).toLocaleString()}.</p>
              
              <div className="mt-8 flex flex-col items-center justify-center space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl inline-block border border-slate-100 min-w-[300px]">
                  <img src={quote.signature_data!} alt="Signature" className="max-h-32 mx-auto mix-blend-multiply" />
                  <div className="border-t border-slate-200 mt-4 pt-3">
                    <p className="font-semibold text-slate-800 uppercase tracking-wider text-sm">{quote.signed_by_name}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Acknowledge & Sign</h3>
                  <p className="text-slate-500 mt-1">Please review the quote details above and sign below to accept.</p>
                </div>
              </div>
              
              <div className="space-y-8 max-w-2xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider">Print Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all font-medium"
                    placeholder="Enter your full name"
                    value={signedByName}
                    onChange={(e) => setSignedByName(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Signature</label>
                    <button 
                      type="button" 
                      onClick={handleClearSignature}
                      className="text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      Clear Signature
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <SignatureCanvas 
                      ref={sigCanvas}
                      canvasProps={{ className: "w-full h-48 cursor-crosshair" }}
                      backgroundColor="transparent"
                      penColor="#0f172a"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button
                    onClick={handleSign}
                    disabled={signMutation.isPending}
                    className="flex-1 bg-slate-900 text-white font-medium py-4 px-6 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-900/20"
                  >
                    {signMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                    Accept & Sign Quote
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="hidden md:flex p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all bg-white shadow-sm items-center gap-2 font-medium"
                    title="Print Quote"
                  >
                    <Download className="w-5 h-5" />
                    Save PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Action Panel for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden flex gap-3 z-50">
          <button 
            onClick={() => window.print()}
            className="flex-1 btn btn-secondary h-12"
          >
            <Download className="w-4 h-4 mr-2" /> Download
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
