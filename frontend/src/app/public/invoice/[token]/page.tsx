"use client";
import { toast } from "sonner";


import { useState, useRef, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePublicInvoice, useSignPublicInvoice, usePayPublicInvoice, useVerifyPublicInvoicePayment, usePaypalPayPublicInvoice, useVerifyPaypalPublicInvoicePayment } from "@/lib/queries";
import dynamic from "next/dynamic";
import type ReactSignatureCanvas from "react-signature-canvas";
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false });
import { Loader2, CheckCircle2, FileText, Download, CreditCard } from "lucide-react";
import { InvoiceLineItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get('print') === 'true';

  const { data: invoice, isLoading, error } = usePublicInvoice(token);
  const signMutation = useSignPublicInvoice();
  const payMutation = usePayPublicInvoice();
  const verifyMutation = useVerifyPublicInvoicePayment();
  const paypalPayMutation = usePaypalPayPublicInvoice();
  const verifyPaypalMutation = useVerifyPaypalPublicInvoicePayment();

  // Verify PayPal if returning from checkout
  useEffect(() => {
    const paypalOrderId = searchParams.get('token');
    const payerId = searchParams.get('PayerID');
    
    // Only verify if invoice is not fully paid and we haven't already verified
    if (paypalOrderId && payerId && invoice && parseFloat(invoice.amount_due || invoice.total) > 0) {
      verifyPaypalMutation.mutate(
        { token, payload: { paypal_order_id: paypalOrderId } },
        {
          onSuccess: () => {
            toast.success("PayPal payment verified and successful!");
            window.history.replaceState({}, document.title, window.location.pathname);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to verify PayPal payment.");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token, invoice?.amount_due, invoice?.total]);

  useEffect(() => {
    if (invoice) {
      document.title = `Invoice_${invoice.invoice_number}`;
    }
    if (shouldPrint && invoice && !isLoading) {
      setTimeout(() => {
        window.print();
      }, 800); // Give images and fonts a moment to load before printing
    }
  }, [shouldPrint, invoice, isLoading]);

  // ── Font & Scale ────────────────────────────────────────────────
  // These must be defined before any early return (Rules of Hooks).
  // Reading from optional invoice?.settings is safe — undefined values fall back to defaults.
  const fontFamily = invoice?.settings?.template_font_family || 'Inter';

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

  // Inject the Google Fonts <link> so the font is actually downloaded.
  // Runs unconditionally — React requires hooks before any early return.
  useEffect(() => {
    const url = FONT_GOOGLE_URL[fontFamily];
    if (!url) return; // 'serif' uses system font — no external load needed
    const id = `gfont-${fontFamily}`;
    if (document.getElementById(id)) return; // already injected
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamily]);

  const scale = invoice?.settings?.template_scale || 'Standard';

  // Font Scaling: Tailwind classes (text-xl, text-2xl, text-sm …) use **rem** units,
  // which resolve against the <html> element's font-size — not any ancestor div.
  const SCALE_ROOT_PX: Record<string, string> = {
    Small:    '13px',
    Standard: '15px',
    Large:    '17px',
  };

  const fontSizePx = SCALE_ROOT_PX[scale] ?? '15px';

  const [signedByName, setSignedByName] = useState("");
  const sigCanvas = useRef<ReactSignatureCanvas>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-2">Invoice Not Found</h1>
          <p className="text-muted">This invoice may have been deleted or the link is invalid.</p>
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

    const signatureData = sigCanvas.current.getCanvas().toDataURL("image/png");
    
    signMutation.mutate({
      token,
      payload: {
        signature_data: signatureData,
        signed_by_name: signedByName,
      }
    });
  };

  const handlePay = async () => {
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay Checkout SDK. Check your internet connection.");
        return;
      }
      
      payMutation.mutate(
        { token },
        {
          onSuccess: (data) => {
            const options = {
              key: data.key,
              amount: data.amount,
              currency: data.currency,
              name: invoice?.company?.name || "Payment",
              description: `Invoice ${invoice?.invoice_number}`,
              order_id: data.order_id,
              handler: function (response: any) {
                verifyMutation.mutate({
                  token,
                  payload: {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                  }
                }, {
                  onSuccess: () => {
                    toast.success("Payment verified and successful!");
                  },
                  onError: (err: any) => {
                    toast.error(err.response?.data?.error || "Failed to verify payment.");
                  }
                });
              },
              prefill: {
                name: "",
                email: "",
              },
              theme: {
                color: "#18181b",
              },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to initialize payment.");
          }
        }
      );
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handlePaypalPay = () => {
    const returnUrl = window.location.origin + window.location.pathname;
    
    paypalPayMutation.mutate(
      { token, payload: { return_url: returnUrl, cancel_url: returnUrl } },
      {
        onSuccess: (data) => {
          if (data.approve_link) {
            window.location.href = data.approve_link;
          } else {
            toast.error("PayPal checkout link not found.");
          }
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || "Failed to initialize PayPal.");
        }
      }
    );
  };

  const isSigned = !!invoice.signature_data;

  const tpl = invoice.settings?.template_id || 'template1';
  const accentColor = invoice.settings?.template_accent_color || '#4F46E5';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          font-size: ${fontSizePx} !important;
        }
        .invoice-container, .invoice-container * {
          font-family: ${resolvedFontStack} !important;
        }
        .force-light-mode {
          --color-bone: 244 239 230 !important;
          --color-bone-2: 236 230 216 !important;
          --color-paper: 250 246 238 !important;
          --color-ink: 26 23 20 !important;
          --color-ink-2: 61 54 45 !important;
          --color-muted: 122 111 95 !important;
          --color-line: 221 212 192 !important;
          --color-line-2: 232 224 206 !important;
          color: rgb(var(--color-ink)) !important;
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
          .invoice-container {
            padding: 10mm !important;
          }
        }
      `}} />
      <div
        className="invoice-container min-h-screen print:!min-h-0 print:!bg-white bg-bone py-12 print:py-0 px-4 sm:px-6 lg:px-8 print:px-0"
      >
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-8 transition-all duration-300 print:space-y-0 print:max-w-none print:w-full">
        
        {/* INVOICE DOCUMENT */}
        <div 
          className={`force-light-mode rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border p-8 md:p-14 print:shadow-none print:border-none print:p-0 print:m-0 bg-white print:overflow-visible relative overflow-hidden ${
            tpl === 'template3' ? 'border-none' : 
            tpl === 'template4' ? 'border-line flex flex-col md:flex-row print:flex-row p-0' : 
            'border-line'
          }`}
          style={tpl === 'template3' ? { borderTop: `8px solid ${accentColor}` } : {}}
        >
          
          {tpl === 'template4' && (
            <div className="md:w-1/3 print:w-1/3 p-8 md:p-12 text-white flex flex-col justify-between" style={{ backgroundColor: '#1e293b' }}>
              <div className="flex flex-col items-start">
                {invoice.settings?.invoice_logo ? (
                  <img src={invoice.settings.invoice_logo} alt="Company Logo" className="max-h-24 max-w-[250px] w-auto object-contain object-left mb-8 bg-white p-2 rounded self-start" />
                ) : (
                  <h1 className="text-3xl font-bold mb-8">{invoice.company?.name || "Company"}</h1>
                )}
                
                <h2 className="text-xl font-semibold mb-2">{invoice.company?.name || "Company"}</h2>
                {invoice.company?.company_website && <p className="text-sm opacity-80 mt-1">{invoice.company.company_website.replace(/^https?:\/\//, '')}</p>}
                {invoice.company?.company_email && <p className="text-sm opacity-80">{invoice.company.company_email}</p>}
                
                {invoice.settings?.company_tax_id && invoice.settings?.show_sender_tax_number === true && (
                  <div className="mt-8 pt-8 border-t border-white/20">
                    <p className="text-xs opacity-70 uppercase tracking-wider mb-1">Tax ID / VAT</p>
                    <p className="text-sm font-medium">{invoice.settings.company_tax_id}</p>
                  </div>
                )}
                {invoice.settings?.company_registration_number && (
                  <div className="mt-4">
                    <p className="text-xs opacity-70 uppercase tracking-wider mb-1">Company Reg. No</p>
                    <p className="text-sm font-medium">{invoice.settings.company_registration_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={tpl === 'template4' ? "md:w-2/3 print:w-2/3 p-8 md:p-12 bg-white relative" : "relative"}>
            {/* PAID Stamp overlay */}
            {parseFloat(invoice.amount_due || invoice.total) <= 0 && (
              <div className="absolute top-1/4 right-8 opacity-[0.04] transform rotate-12 pointer-events-none print:opacity-10 z-0">
                <span className="text-8xl md:text-9xl font-black text-emerald-600 border-[12px] border-emerald-600 p-6 rounded-2xl uppercase tracking-widest">PAID</span>
              </div>
            )}
            
            {/* Header Area */}
            {tpl !== 'template4' && (
              <div className="flex flex-col md:flex-row print:flex-row justify-between items-start gap-8 border-b border-line/50 pb-8 mb-8 print:pb-2 print:mb-2"
                   style={tpl === 'template3' ? { backgroundColor: accentColor, margin: '-3rem -3rem 2rem -3rem', padding: '3rem', color: 'white' } : {}}
              >
                <div className="flex flex-col items-start">
                  {invoice.settings?.invoice_logo ? (
                    <img src={invoice.settings.invoice_logo} alt="Company Logo" className="max-h-24 max-w-[250px] w-auto object-contain object-left mb-4 self-start" style={tpl === 'template3' ? { filter: 'brightness(0) invert(1)' } : {}} />
                  ) : (
                    <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">INVOICE</h1>
                  )}
                  <p className={`text-sm md:text-base uppercase tracking-wider font-semibold ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl md:text-2xl font-semibold">{invoice.company?.name || "Company"}</h2>
                  {invoice.company?.company_website && <p className={`text-sm md:text-base mt-1 ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}><a href={invoice.company.company_website.startsWith('http') ? invoice.company.company_website : `https://${invoice.company.company_website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{invoice.company.company_website.replace(/^https?:\/\//, '')}</a></p>}
                  {invoice.company?.company_email && <p className={`text-sm md:text-base ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}><a href={`mailto:${invoice.company.company_email}`} className="hover:underline">{invoice.company.company_email}</a></p>}
                  
                  {invoice.settings?.company_tax_id && invoice.settings?.show_sender_tax_number === true && (
                     <p className={`text-sm mt-2 ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Tax ID: <span className="font-medium">{invoice.settings.company_tax_id}</span></p>
                  )}
                  {invoice.settings?.company_registration_number && (
                     <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Reg No: <span className="font-medium">{invoice.settings.company_registration_number}</span></p>
                  )}

                  <div className="mt-4 space-y-1">
                    <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Issue Date: <span className="font-medium">{invoice.issue_date}</span></p>
                    {invoice.due_date && <p className={`text-sm ${tpl === 'template3' ? 'opacity-90' : 'text-muted'}`}>Due Date: <span className="font-medium">{invoice.due_date}</span></p>}
                  </div>
                  {tpl !== 'template3' && (
                    <div className="h-0.5 w-12 ml-auto mt-6 rounded-full" style={{ backgroundColor: accentColor }}></div>
                  )}
                  {invoice.settings?.show_status_on_invoice && invoice.status !== 'draft' && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                         style={tpl === 'template3' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'transparent' } : {}}
                    >
                      Status: <span className="capitalize">{invoice.status.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If template4, show invoice number, dates here */}
            {tpl === 'template4' && (
              <div className="flex justify-between items-start border-b border-line/50 pb-8 mb-8 print:pb-4 print:mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight text-ink">INVOICE</h1>
                  <p className="text-sm md:text-base uppercase tracking-wider font-semibold text-muted">{invoice.invoice_number}</p>
                  {invoice.settings?.show_status_on_invoice && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Status: <span className="capitalize">{invoice.status.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <p className="text-sm text-muted">Issue Date: <span className="font-medium text-ink">{invoice.issue_date}</span></p>
                    {invoice.due_date && <p className="text-sm text-muted">Due Date: <span className="font-medium text-ink">{invoice.due_date}</span></p>}
                    {invoice.settings?.show_project_on_invoice && invoice.deal_details && (
                      <p className="text-sm text-muted">Project/Deal: <span className="font-medium text-ink">{invoice.deal_details.title}</span></p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-12 print:mb-6 relative z-10">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3" style={tpl === 'template1' ? { color: accentColor } : {}}>Billed To</h3>
              {invoice.settings?.show_client_name !== false && (
                <div className="font-bold text-2xl text-ink tracking-tight mb-1">{invoice.customer_details?.name}</div>
              )}
              {invoice.settings?.show_client_company_name && typeof (invoice.customer_details as any)?.company_name === 'string' && (
                <div className="text-ink font-medium mb-1">{(invoice.customer_details as any).company_name}</div>
              )}
              <div className="flex flex-col gap-0.5 mt-2">
                {invoice.settings?.show_client_email && invoice.customer_details?.email && (
                  <div className="text-muted text-sm">{invoice.customer_details.email}</div>
                )}
                {invoice.settings?.show_client_phone && invoice.customer_details?.phone && (
                  <div className="text-muted text-sm">{invoice.customer_details.phone}</div>
                )}
                {invoice.settings?.show_client_address && invoice.customer_details?.custom_data?.address && (
                  <div className="text-muted text-sm mt-1 whitespace-pre-wrap leading-relaxed">{invoice.customer_details.custom_data.address}</div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left mb-10 print:mb-6 print:min-w-full relative z-10">
                <thead>
                  <tr className="border-b-2 border-line bg-bone/40">
                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-muted">Item</th>
                    {invoice.settings?.show_hsn_sac_code && (
                      <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-muted text-right whitespace-nowrap">HSN/SAC</th>
                    )}
                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-muted text-right whitespace-nowrap">Qty</th>
                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-muted text-right whitespace-nowrap">Price</th>
                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-muted text-right whitespace-nowrap pr-4 sm:pr-6">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invoice.items.map((item: InvoiceLineItem, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-bone/20'}>
                      <td className="py-5 px-4">
                        <div className="font-bold text-ink text-base tracking-tight">{item.name}</div>
                        {item.description && <div className="text-sm text-muted mt-1.5 leading-relaxed">{item.description}</div>}
                      </td>
                      {invoice.settings?.show_hsn_sac_code && (
                        <td className="py-4 px-4 text-right text-ink whitespace-nowrap">{item.hsn_sac_code || '-'}</td>
                      )}
                      <td className="py-4 px-4 text-right text-ink whitespace-nowrap">
                        {item.quantity} {item.unit && <span className="text-muted text-xs ml-1">{item.unit}</span>}
                      </td>
                      <td className="py-4 px-4 text-right text-ink whitespace-nowrap">{formatCurrency(parseFloat(item.unit_price), invoice.currency || invoice.company?.currency)}</td>
                      <td className="py-4 px-4 pr-4 sm:pr-6 text-right font-semibold text-ink whitespace-nowrap">
                        {formatCurrency(item.quantity * parseFloat(item.unit_price), invoice.currency || invoice.company?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              <div className="flex flex-col md:flex-row print:flex print:flex-row justify-between border-t border-line/60 pt-10 gap-8 print:gap-6 print:pt-6 relative z-10">
              
              {/* Terms and Info Section */}
              <div className="flex-1 print:w-[60%] space-y-8 print:space-y-6">
                {invoice.settings?.invoice_terms && (
                  <div className="print:break-inside-avoid">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted mb-3 border-b border-line/60 pb-2">Terms & Conditions</h4>
                    <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{invoice.settings.invoice_terms}</p>
                  </div>
                )}
                
                {/* Bank Details & QR Codes */}
                {(invoice.settings?.bank_name || invoice.settings?.invoice_other_information || (invoice.payment_methods && invoice.payment_methods.length > 0)) && (
                  <div className="print:break-inside-avoid">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted mb-3 border-b border-line/60 pb-2">Payment Details</h4>
                    
                    {invoice.settings?.invoice_other_information && (
                      <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed mb-4">{invoice.settings.invoice_other_information}</p>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {invoice.settings?.bank_name && (
                        <div className="text-sm text-ink bg-bone/40 p-5 rounded-xl border border-line/60 space-y-2 flex-1 w-full sm:w-auto shadow-sm">
                          <div className="flex gap-2 sm:gap-4"><span className="text-muted w-28 shrink-0">Bank Name:</span> <span className="font-semibold break-words flex-1">{invoice.settings.bank_name}</span></div>
                          <div className="flex gap-2 sm:gap-4"><span className="text-muted w-28 shrink-0">Account Name:</span> <span className="font-semibold break-words flex-1">{invoice.settings.bank_account_name}</span></div>
                          <div className="flex gap-2 sm:gap-4"><span className="text-muted w-28 shrink-0">Account No:</span> <span className="font-semibold break-all flex-1">{invoice.settings.bank_account_number}</span></div>
                          {invoice.settings.bank_routing_number && (
                            <div className="flex gap-2 sm:gap-4"><span className="text-muted w-28 shrink-0">Routing/SWIFT:</span> <span className="font-semibold break-all flex-1">{invoice.settings.bank_routing_number}</span></div>
                          )}
                        </div>
                      )}

                      {/* Display QR codes from custom payment methods compactly */}
                      {invoice.payment_methods && invoice.payment_methods.length > 0 && invoice.payment_methods.some((m: any) => m.qr_code) && (
                        <div className="flex gap-3 flex-wrap">
                          {invoice.payment_methods.filter((m: any) => m.qr_code).map((method: any) => (
                            <div key={method.id} className="flex flex-col items-center bg-bone/40 p-4 rounded-xl border border-line/60 shadow-sm">
                              <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">{method.title}</span>
                              <img src={method.qr_code} alt={method.title} loading="eager" decoding="sync" className="w-24 h-24 object-contain bg-white block rounded-lg shadow-sm" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {invoice.settings?.show_authorised_signatory && (
                  <div className="pt-8 print:break-inside-avoid">
                    {invoice.settings?.authorised_signatory_signature ? (
                      <img src={invoice.settings.authorised_signatory_signature} alt="Authorised Signatory" className="h-14 object-contain mb-3" />
                    ) : (
                      <div className="h-14 border-b border-line/60 w-40 mb-3"></div>
                    )}
                    <p className="text-sm font-bold text-ink uppercase tracking-wider">Authorised Signatory</p>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm print:max-w-none print:w-[35%] shrink-0 space-y-4 print:break-inside-avoid print:mt-0 bg-bone/20 p-6 rounded-2xl">
                <div className="flex justify-between text-muted text-sm font-medium">
                  <span>Subtotal</span>
                  <span className="text-ink">{formatCurrency(parseFloat(invoice.subtotal), invoice.currency || invoice.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-muted text-sm font-medium">
                  <span>Tax</span>
                  <span className="text-ink">{formatCurrency(parseFloat(invoice.tax_amount), invoice.currency || invoice.company?.currency)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-ink pt-4 border-t border-line/60">
                  <span>Total</span>
                  <span>{formatCurrency(parseFloat(invoice.total), invoice.currency || invoice.company?.currency)}</span>
                </div>
                {parseFloat(invoice.amount_paid || "0") > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold pt-2">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(parseFloat(invoice.amount_paid || "0"), invoice.currency || invoice.company?.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-black text-ink pt-5 border-t border-line/60 mt-2"
                     style={tpl === 'template3' ? { backgroundColor: accentColor, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', border: 'none' } : {}}
                >
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>Amount Due</span>
                  <span style={tpl === 'template3' ? { color: 'white' } : {}}>{formatCurrency(parseFloat(invoice.amount_due || invoice.total), invoice.currency || invoice.company?.currency)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 print:mt-2 print:pt-2 border-t-2 border-line text-center flex flex-col items-center clear-both w-full" style={{ pageBreakBefore: 'auto' }}>
              {invoice.settings?.footer_text && (
                <p className="text-sm font-medium text-muted italic mb-4 print:mb-2">{invoice.settings.footer_text}</p>
              )}
              <div className="h-1 w-12 mt-4 print:mt-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
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
              <h3 className="text-2xl font-semibold text-ink mb-2">Invoice Acknowledged</h3>
              <p className="text-muted mb-8">This invoice was signed and acknowledged on {new Date(invoice.signed_at!).toLocaleString()}.</p>
              
              <div className="max-w-md mx-auto bg-bone-2 rounded-xl p-6 text-left border border-line">
                <div className="mb-4">
                  <span className="text-sm text-muted block mb-2">Signature:</span>
                  <div className="bg-white border border-line rounded-lg p-4">
                    <img src={invoice.signature_data!} alt="Signature" className="max-h-24" />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted block">Signed by:</span>
                  <span className="font-medium text-ink">{invoice.signed_by_name}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-semibold text-ink mb-6">Acknowledge & Sign Invoice</h3>
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
                      // @ts-expect-error dynamic component ref forwarding
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
                    By signing, you acknowledge receipt of this invoice.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Section */}
        {(parseFloat(invoice.amount_due || "0") > 0) && (
          <div className="bg-paper rounded-2xl shadow-sm border border-line p-8 md:p-12 print:hidden mt-8">
            <style>{`
              :root { --accent-color: ${accentColor}; }
            `}</style>
            <h3 className="text-2xl font-semibold text-ink mb-6 text-center print:text-left print:text-xl">Payment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start print:block">
              <div className="text-center p-6 bg-bone rounded-xl border border-line flex flex-col items-center justify-center min-h-[200px] print:hidden">
                <p className="text-muted mb-6">Securely pay this invoice using Razorpay.</p>
                <button
                  onClick={handlePay}
                  disabled={payMutation.isPending || verifyMutation.isPending}
                  className="bg-ink text-paper px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2 w-full max-w-[250px] justify-center"
                >
                  {payMutation.isPending || verifyMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay {formatCurrency(parseFloat(invoice.amount_due || "0"), invoice.currency || invoice.company?.currency)}
                    </>
                  )}
                </button>
              </div>

              <div className="text-center p-6 bg-bone rounded-xl border border-line flex flex-col items-center justify-center min-h-[200px] print:hidden">
                <p className="text-muted mb-6">Securely pay this invoice using PayPal.</p>
                <button
                  onClick={handlePaypalPay}
                  disabled={paypalPayMutation.isPending || verifyPaypalMutation.isPending}
                  className="bg-[#0070ba] text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2 w-full max-w-[250px] justify-center"
                >
                  {paypalPayMutation.isPending || verifyPaypalMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay with PayPal
                    </>
                  )}
                </button>
              </div>
              
              {invoice.payment_methods && invoice.payment_methods.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-ink mb-3 border-b border-line pb-2">Other Payment Options</h4>
                  {invoice.payment_methods.map((method: any) => (
                    <div key={method.id} className="p-5 bg-white shadow-sm border border-line rounded-xl">
                      <h5 className="font-semibold text-ink mb-2">{method.title}</h5>
                      <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{method.details}</p>
                      {method.qr_code && (
                        <div className="mt-4 inline-block border border-line p-2 rounded-lg bg-white shadow-sm">
                          <img src={method.qr_code} alt="QR Code" className="w-28 h-28 object-contain" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
