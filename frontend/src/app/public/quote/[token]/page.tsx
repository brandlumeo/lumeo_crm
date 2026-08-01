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
        @media print {
          @page {
            margin: 0;
          }
          body, html {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .quote-container {
            padding: 10mm !important;
          }
        }
      `}} />
      <div
        className="quote-container min-h-screen print:!min-h-0 print:!bg-white bg-bone py-12 print:py-0 px-4 sm:px-6 lg:px-8 print:px-0"
      >
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-8 transition-all duration-300 print:space-y-0 print:max-w-none print:w-full">
        
        {/* QUOTE DOCUMENT */}
        <div 
          className={`rounded-2xl shadow-sm border p-8 md:p-12 print:shadow-none print:border-none print:p-0 print:m-0 bg-white print:overflow-visible ${
            tpl === 'template3' ? 'border-none overflow-hidden' : 
            tpl === 'template4' ? 'border-line flex flex-col md:flex-row print:flex-row p-0 overflow-hidden' : 
            'border-line'
          }`}
          style={tpl === 'template3' ? { borderTop: `8px solid ${accentColor}` } : {}}
        >
          
          {tpl === 'template4' && (
            <div className="md:w-1/3 print:w-1/3 p-8 md:p-12 text-white flex flex-col justify-between" style={{ backgroundColor: '#1e293b' }}>
              <div>
                {settings?.invoice_logo ? (
                  <img src={settings.invoice_logo} alt="Company Logo" className="h-16 object-contain mb-8 bg-white p-2 rounded" />
                ) : (
                  <h1 className="text-3xl font-bold mb-8">{quote.company?.name || "Company"}</h1>
                )}
                
                <h2 className="text-xl font-semibold mb-2">{quote.company?.name || "Company"}</h2>
                {quote.company?.company_website && <p className="text-sm opacity-80 mt-1">{quote.company.company_website.replace(/^https?:\/\//, '')}</p>}
                {quote.company?.company_email && <p className="text-sm opacity-80">{quote.company.company_email}</p>}
                
                {settings?.company_tax_id && settings?.show_sender_tax_number === true && (
                  <div className="mt-8 pt-8 border-t border-white/20">
                    <p className="text-xs opacity-70 uppercase tracking-wider mb-1">Tax ID / VAT</p>
                    <p className="text-sm font-medium">{settings.company_tax_id}</p>
                  </div>
                )}
                {settings?.company_registration_number && (
                  <div className="mt-4">
                    <p className="text-xs opacity-70 uppercase tracking-wider mb-1">Company Reg. No</p>
                    <p className="text-sm font-medium">{settings.company_registration_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={tpl === 'template4' ? "md:w-2/3 print:w-2/3 p-8 md:p-12 bg-white" : ""}>
            {/* Header Area */}
            {tpl !== 'template4' && (
              <div className="flex flex-col md:flex-row print:flex-row justify-between items-start gap-8 border-b border-line/50 pb-8 mb-8 print:pb-4 print:mb-4"
                   style={tpl === 'template3' ? { backgroundColor: accentColor, margin: '-3rem -3rem 2rem -3rem', padding: '3rem', color: 'white' } : {}}
              >
                <div>
                  {settings?.invoice_logo ? (
                    <img src={settings.invoice_logo} alt="Company Logo" className="h-16 sm:h-20 print:h-24 object-contain mb-4 print:max-w-[250px]" style={tpl === 'template3' ? { filter: 'brightness(0) invert(1)' } : {}} />
                  ) : (
                    <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">QUOTE</h1>
                  )}
                  <p className={`text-sm md:text-base uppercase tracking-wider font-semibold ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>{quote.quote_number}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl md:text-2xl font-semibold">{quote.company?.name || "Company"}</h2>
                  {quote.company?.company_website && <p className={`text-sm md:text-base mt-1 ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}><a href={quote.company.company_website.startsWith('http') ? quote.company.company_website : `https://${quote.company.company_website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{quote.company.company_website.replace(/^https?:\/\//, '')}</a></p>}
                  {quote.company?.company_email && <p className={`text-sm md:text-base ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}><a href={`mailto:${quote.company.company_email}`} className="hover:underline">{quote.company.company_email}</a></p>}
                  
                  {settings?.company_tax_id && settings?.show_sender_tax_number === true && (
                     <p className={`text-sm mt-2 ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Tax ID: <span className="font-medium">{settings.company_tax_id}</span></p>
                  )}
                  {settings?.company_registration_number && (
                     <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Reg No: <span className="font-medium">{settings.company_registration_number}</span></p>
                  )}

                  <div className="mt-4 space-y-1">
                    <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Issue Date: <span className="font-medium">{quote.created_at.split("T")[0]}</span></p>
                    {quote.valid_until && <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Due Date: <span className="font-medium">{quote.valid_until}</span></p>}
                  </div>
                  {tpl !== 'template3' && (
                    <div className="h-0.5 w-12 ml-auto mt-6 rounded-full" style={{ backgroundColor: accentColor }}></div>
                  )}
                  {settings?.show_status_on_invoice && quote.status !== 'draft' && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                         style={tpl === 'template3' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'transparent' } : {}}
                    >
                      Status: <span className="capitalize">{quote.status.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If template4, show invoice number, dates here */}
            {tpl === 'template4' && (
              <div className="flex justify-between items-start border-b border-line/50 pb-8 mb-8 print:pb-4 print:mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight text-ink">QUOTE</h1>
                  <p className="text-sm md:text-base uppercase tracking-wider font-semibold text-muted">{quote.quote_number}</p>
                  {settings?.show_status_on_invoice && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Status: <span className="capitalize">{quote.status.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <p className="text-sm text-muted">Issue Date: <span className="font-medium text-ink">{quote.created_at.split("T")[0]}</span></p>
                    {quote.valid_until && <p className="text-sm text-muted">Due Date: <span className="font-medium text-ink">{quote.valid_until}</span></p>}
                    {settings?.show_project_on_invoice && quote.deal_details && (
                      <p className="text-sm text-muted">Project/Deal: <span className="font-medium text-ink">{quote.deal_details.title}</span></p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8 print:mb-4">
              <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-2" style={tpl === 'template1' ? { color: accentColor } : {}}>Billed To</h3>
              {settings?.show_client_name !== false && (
                <div className="font-medium text-lg text-ink">{quote.customer_details?.name}</div>
              )}
              {settings?.show_client_company_name && typeof (quote.customer_details as any)?.company_name === 'string' && (
                <div className="text-muted">{(quote.customer_details as any).company_name}</div>
              )}
              {settings?.show_client_email && quote.customer_details?.email && (
                <div className="text-muted">{quote.customer_details.email}</div>
              )}
              {settings?.show_client_phone && quote.customer_details?.phone && (
                <div className="text-muted">{quote.customer_details.phone}</div>
              )}
              {settings?.show_client_address && quote.customer_details?.custom_data?.address && (
                <div className="text-muted mt-1 whitespace-pre-wrap">{quote.customer_details.custom_data.address}</div>
              )}
            </div>

            {quote.content && (
              <div 
                className="mb-8 print:mb-4 prose prose-sm max-w-none text-ink prose-p:leading-relaxed prose-a:text-blue-600 hover:prose-a:text-blue-500"
                dangerouslySetInnerHTML={{ __html: quote.content }} 
              />
            )}

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left mb-8 print:mb-4 print:min-w-full">
                <thead>
                  <tr className="border-b border-line bg-bone/30" style={tpl === 'template1' ? { borderBottom: `2px solid ${accentColor}` } : {}}>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted" style={{ color: accentColor }}>Item</th>
                    {settings?.show_hsn_sac_code && (
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted text-right whitespace-nowrap" style={{ color: accentColor }}>HSN/SAC</th>
                    )}
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted text-right whitespace-nowrap" style={{ color: accentColor }}>Qty</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted text-right whitespace-nowrap" style={{ color: accentColor }}>Price</th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted text-right whitespace-nowrap pr-4 sm:pr-6" style={{ color: accentColor }}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {quote.items.map((item: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-bone/20'}>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-ink">{item.name}</div>
                        {item.description && <div className="text-sm text-muted mt-1">{item.description}</div>}
                      </td>
                      {settings?.show_hsn_sac_code && (
                        <td className="py-4 px-4 text-right text-ink whitespace-nowrap">{item.hsn_sac_code || '-'}</td>
                      )}
                      <td className="py-4 px-4 text-right text-ink whitespace-nowrap">
                        {item.quantity} {item.unit && <span className="text-muted text-xs ml-1">{item.unit}</span>}
                      </td>
                      <td className="py-4 px-4 text-right text-ink whitespace-nowrap">{formatCurrency(parseFloat(item.unit_price), quote.currency || quote.company?.currency)}</td>
                      <td className="py-4 px-4 pr-4 sm:pr-6 text-right font-semibold text-ink whitespace-nowrap">
                        {formatCurrency(item.quantity * parseFloat(item.unit_price), quote.currency || quote.company?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row print:block justify-between border-t border-line pt-8 gap-8 print:gap-0 print:pt-4 after:content-[''] after:table after:clear-both">
              
              {/* Terms and Info Section */}
              <div className="flex-1 print:float-left print:w-[60%] space-y-6 print:space-y-4">
                {settings?.invoice_terms && (
                  <div className="print:break-inside-avoid mb-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 border-b-2 pb-1" style={{ borderColor: accentColor }}>Terms & Conditions</h4>
                    <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{settings.invoice_terms}</p>
                  </div>
                )}
                
                {/* Bank Details & QR Codes */}
                {(settings?.bank_name || settings?.invoice_other_information) && (
                  <div className="print:break-inside-avoid">
                    <h4 className="text-sm font-bold text-ink mb-3 border-b-2 pb-1" style={{ color: accentColor, borderColor: accentColor }}>Payment & Bank Details</h4>
                    
                    {settings?.invoice_other_information && (
                      <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed mb-3">{settings.invoice_other_information}</p>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {settings?.bank_name && (
                        <div className="text-xs text-muted bg-bone/30 p-4 rounded-lg border border-line space-y-1.5 flex-1 w-full sm:w-auto">
                          <div className="flex gap-2 sm:gap-4"><span className="font-medium w-28 shrink-0">Bank Name:</span> <span className="break-words flex-1">{settings.bank_name}</span></div>
                          <div className="flex gap-2 sm:gap-4"><span className="font-medium w-28 shrink-0">Account Name:</span> <span className="break-words flex-1">{settings.bank_account_name}</span></div>
                          <div className="flex gap-2 sm:gap-4"><span className="font-medium w-28 shrink-0">Account No:</span> <span className="break-all flex-1">{settings.bank_account_number}</span></div>
                          {settings.bank_routing_number && (
                            <div className="flex gap-2 sm:gap-4"><span className="font-medium w-28 shrink-0">Routing/SWIFT:</span> <span className="break-all flex-1">{settings.bank_routing_number}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {settings?.show_authorised_signatory && (
                  <div className="pt-6 print:break-inside-avoid">
                    {settings?.authorised_signatory_signature ? (
                      <img src={settings.authorised_signatory_signature} alt="Authorised Signatory" className="h-12 object-contain mb-2" />
                    ) : (
                      <div className="h-12 border-b border-line w-32 mb-2"></div>
                    )}
                    <p className="text-sm font-semibold text-ink">Authorised Signatory</p>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm print:float-right print:max-w-none print:w-[35%] shrink-0 space-y-3 print:break-inside-avoid print:mt-0">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>{formatCurrency(parseFloat(quote.subtotal), quote.currency || quote.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span>{formatCurrency(parseFloat(quote.tax_amount), quote.currency || quote.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-ink pt-4 border-t-2 border-line"
                     style={tpl === 'template3' ? { backgroundColor: accentColor, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', border: 'none' } : {}}
                >
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>Total</span>
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>{formatCurrency(parseFloat(quote.total), quote.currency || quote.company?.currency)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 print:mt-4 print:pt-4 border-t-2 border-line text-center flex flex-col items-center clear-both w-full" style={{ pageBreakBefore: 'auto' }}>
              {settings?.footer_text && (
                <p className="text-sm font-medium text-muted italic mb-4">{settings.footer_text}</p>
              )}
              <div className="h-1 w-12 mt-4 rounded-full" style={{ backgroundColor: accentColor }}></div>
            </div>
            
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
              <p className="text-muted mb-8">This invoice was signed and acknowledged on {new Date(quote.signed_at!).toLocaleString()}.</p>
              
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
                    {signMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign & Acknowledge"}
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
    </>
  );
}