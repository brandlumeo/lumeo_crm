"use client";
import { toast } from "sonner";


import { useState, useRef, use } from "react";
import { usePublicInvoice, useSignPublicInvoice, usePayPublicInvoice, useVerifyPublicInvoicePayment } from "@/lib/queries";
import SignatureCanvas from "react-signature-canvas";
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
  const { data: invoice, isLoading, error } = usePublicInvoice(token);
  const signMutation = useSignPublicInvoice();
  const payMutation = usePayPublicInvoice();
  const verifyMutation = useVerifyPublicInvoicePayment();

  const [signedByName, setSignedByName] = useState("");
  const sigCanvas = useRef<SignatureCanvas>(null);

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

  const isSigned = !!invoice.signature_data;

  return (
    <div className="min-h-screen bg-bone py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Invoice Document */}
        <div className="bg-paper rounded-2xl shadow-sm border border-line p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-line pb-8 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-ink mb-2">INVOICE</h1>
              <p className="text-muted text-sm uppercase tracking-wider font-medium">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-ink">{invoice.company?.name || "Company"}</h2>
              <div className="mt-4 space-y-1">
                <p className="text-sm text-muted">Issue Date: <span className="font-medium text-ink">{invoice.issue_date}</span></p>
                {invoice.due_date && <p className="text-sm text-muted">Due Date: <span className="font-medium text-ink">{invoice.due_date}</span></p>}
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-bone-2 text-ink">
                Status: <span className="capitalize">{invoice.status.replace("_", " ")}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left mb-8 min-w-[600px]">
              <thead className="border-b border-line">
                <tr>
                  <th className="py-3 font-medium text-muted">Item</th>
                  <th className="py-3 font-medium text-muted text-right">Qty</th>
                  <th className="py-3 font-medium text-muted text-right">Price</th>
                  <th className="py-3 font-medium text-muted text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoice.items.map((item: InvoiceLineItem, i: number) => (
                  <tr key={i}>
                    <td className="py-4">
                      <div className="font-medium text-ink">{item.name}</div>
                      {item.description && <div className="text-sm text-muted mt-1">{item.description}</div>}
                    </td>
                    <td className="py-4 text-right text-ink">{item.quantity}</td>
                    <td className="py-4 text-right text-ink">{formatCurrency(parseFloat(item.unit_price), invoice.company?.currency)}</td>
                    <td className="py-4 text-right font-medium text-ink">
                      {formatCurrency(item.quantity * parseFloat(item.unit_price), invoice.company?.currency)}
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
                <span>{formatCurrency(parseFloat(invoice.subtotal), invoice.company?.currency)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Tax</span>
                <span>{formatCurrency(parseFloat(invoice.tax_amount), invoice.company?.currency)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-ink pt-3 border-t border-line">
                <span>Total</span>
                <span>{formatCurrency(parseFloat(invoice.total), invoice.company?.currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium pt-1">
                <span>Amount Paid</span>
                <span>{formatCurrency(parseFloat(invoice.amount_paid || "0"), invoice.company?.currency)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-red-600 pt-3 border-t border-line">
                <span>Amount Due</span>
                <span>{formatCurrency(parseFloat(invoice.amount_due || invoice.total), invoice.company?.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* E-Signature Section */}
        <div className="bg-paper rounded-2xl shadow-sm border border-line p-8 md:p-12">
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
          <div className="bg-paper rounded-2xl shadow-sm border border-line p-8 md:p-12 text-center">
            <h3 className="text-2xl font-semibold text-ink mb-2">Pay Invoice</h3>
            <p className="text-muted mb-8">Securely pay this invoice using Razorpay.</p>
            <button
              onClick={handlePay}
              disabled={payMutation.isPending || verifyMutation.isPending}
              className="bg-ink text-paper px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2 min-w-[200px] justify-center"
            >
              {payMutation.isPending || verifyMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay {formatCurrency(parseFloat(invoice.amount_due || "0"), invoice.company?.currency)}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
