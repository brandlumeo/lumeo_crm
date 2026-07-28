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
  
  const fontFamily = settings.template_font_family || 'Inter';
  const fontClass = fontFamily === 'Roboto' ? 'font-sans' : 
                    fontFamily === 'Outfit' ? 'font-sans' : 
                    fontFamily === 'serif' ? 'font-serif' : 'font-sans';
                    
  const scale = settings.template_scale || 'Standard';
  const scaleClass = scale === 'Large' ? 'text-lg' : scale === 'Small' ? 'text-sm' : 'text-base';

  return (
    <div className={`min-h-screen print:min-h-0 print:bg-white bg-bone py-12 print:py-0 px-4 sm:px-6 lg:px-8 print:px-0 ${fontClass} ${scaleClass}`}>
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-8 transition-all duration-300 print:space-y-0">
        
        {/* QUOTE DOCUMENT */}
        <div 
          className={`rounded-2xl shadow-sm border p-8 md:p-12 print:shadow-none print:border-none print:p-0 print:m-0 bg-white print:overflow-visible ${
            tpl === 'template3' ? 'border-none overflow-hidden' : 
            tpl === 'template4' ? 'border-line flex flex-col md:flex-row p-0 overflow-hidden' : 
            'border-line'
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
                
                {settings.company_tax_id && (
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
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-line/50 pb-8 mb-8"
                   style={tpl === 'template3' ? { backgroundColor: accentColor, margin: '-3rem -3rem 2rem -3rem', padding: '3rem', color: 'white' } : {}}
              >
                <div>
                  {settings.invoice_logo ? (
                    <img src={settings.invoice_logo} alt="Company Logo" className="h-16 object-contain mb-4" style={tpl === 'template3' ? { filter: 'brightness(0) invert(1)' } : {}} />
                  ) : (
                    <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">QUOTE</h1>
                  )}
                  <p className={`text-sm md:text-base uppercase tracking-wider font-semibold ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>{quote.quote_number}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl md:text-2xl font-semibold">{quote.company?.name || "Company"}</h2>
                  <p className={`text-sm mt-1 ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>{quote.title}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                       style={tpl === 'template3' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : { backgroundColor: 'var(--bone-2)', color: 'var(--ink)' }}
                  >
                    Status: <span className="capitalize">{quote.status.replace("_", " ")}</span>
                  </div>
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
              <table className="w-full text-left mb-8 min-w-[600px] print:min-w-full">
                <thead>
                  <tr className="border-b border-line" style={tpl === 'template1' ? { borderBottom: `2px solid ${accentColor}` } : {}}>
                    <th className="py-3 font-medium text-muted">Item</th>
                    <th className="py-3 font-medium text-muted text-right whitespace-nowrap">Qty</th>
                    <th className="py-3 font-medium text-muted text-right whitespace-nowrap">Price</th>
                    <th className="py-3 font-medium text-muted text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {quote.items.map((item: any, i: number) => (
                    <tr key={i} className={tpl === 'template1' && i % 2 !== 0 ? 'bg-bone/30' : ''}>
                      <td className="py-4 px-2">
                        <div className="font-medium text-ink">{item.name}</div>
                        {item.description && <div className="text-sm text-muted mt-1">{item.description}</div>}
                      </td>
                      <td className="py-4 px-2 text-right text-ink whitespace-nowrap">{item.quantity}</td>
                      <td className="py-4 px-2 text-right text-ink whitespace-nowrap">{formatCurrency(parseFloat(item.unit_price), quote.company?.currency)}</td>
                      <td className="py-4 px-2 text-right font-medium text-ink whitespace-nowrap">
                        {formatCurrency(item.quantity * parseFloat(item.unit_price), quote.company?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-line pt-8">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>{formatCurrency(parseFloat(quote.subtotal), quote.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span>{formatCurrency(parseFloat(quote.tax_amount), quote.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-ink pt-3 border-t border-line"
                     style={tpl === 'template3' ? { backgroundColor: accentColor, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', border: 'none' } : {}}
                >
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>Total</span>
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>{formatCurrency(parseFloat(quote.total), quote.company?.currency)}</span>
                </div>
              </div>
            </div>
            
            {settings.footer_text && (
              <div className="mt-12 pt-8 border-t border-line/50 text-center">
                <p className="text-sm text-muted">{settings.footer_text}</p>
              </div>
            )}
            
          </div>
        </div>

        {/* E-Signature Section */}
        <div className={`bg-paper rounded-2xl shadow-sm border border-line p-8 md:p-12 ${!isSigned ? 'print:hidden' : 'print:shadow-none print:border-none print:bg-transparent print:p-0 print:mt-12'}`}>
          {isSigned ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-2">Quote Accepted</h3>
              <p className="text-muted mb-8">This quote was signed and accepted on {new Date(quote.signed_at!).toLocaleString()}.</p>
              
              <div className="max-w-md mx-auto bg-bone-2 rounded-xl p-6 text-left border border-line">
                <div className="mb-4">
                  <span className="text-sm text-muted block mb-2">Signature:</span>
                  <div className="bg-white border border-line rounded-lg p-4">
                    <img src={quote.signature_data!} alt="Signature" className="max-h-24" />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted block">Signed by:</span>
                  <span className="font-medium text-ink">{quote.signed_by_name}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-semibold text-ink mb-6">Acknowledge & Sign Quote</h3>
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Print Name</label>
                  <input
                    type="text"
                    value={signedByName}
                    onChange={(e) => setSignedByName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-bone border border-line rounded-lg text-ink outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-ink">Signature</label>
                    <button onClick={handleClearSignature} className="text-sm text-muted hover:text-ink">Clear</button>
                  </div>
                  <div className="border-2 border-dashed border-line bg-bone rounded-lg overflow-hidden cursor-crosshair">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: "w-full h-48",
                      }}
                      backgroundColor="transparent"
                    />
                  </div>
                </div>
                
                <div className="pt-4 flex items-center gap-4">
                  <button
                    onClick={handleSign}
                    disabled={signMutation.isPending}
                    className="bg-ink text-paper px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center min-w-[160px]"
                  >
                    {signMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign & Accept"}
                  </button>
                  <p className="text-xs text-muted max-w-sm">
                    By signing, you acknowledge and accept this quote.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
