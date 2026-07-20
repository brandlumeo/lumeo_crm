"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CreditCard, Loader2, CheckCircle, XCircle, Shield, 
  DollarSign, ShieldCheck, Key
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function PaymentCredentialsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("paypal");

  const [stripePublicKey, setStripePublicKey] = useState(company?.stripe_public_key ?? "");
  const [stripeSecretKey, setStripeSecretKey] = useState(company?.stripe_secret_key ?? "");
  const [paypalClientId, setPaypalClientId] = useState(company?.paypal_client_id ?? "");
  const [paypalSecret, setPaypalSecret] = useState(company?.paypal_secret ?? "");

  // Local UI states for the status checkboxes
  const [stripeStatus, setStripeStatus] = useState(!!(company?.stripe_public_key || company?.stripe_secret_key));
  const [paypalStatus, setPaypalStatus] = useState(!!(company?.paypal_client_id || company?.paypal_secret));
  
  // Local UI states for Razorpay
  const [razorpayStatus, setRazorpayStatus] = useState(!!(company?.razorpay_key_id || company?.razorpay_key_secret));
  const [razorpayKey, setRazorpayKey] = useState(company?.razorpay_key_id ?? "");
  const [razorpaySecret, setRazorpaySecret] = useState(company?.razorpay_key_secret ?? "");

  // Local UI states for Paystack (mocked)
  const [paystackStatus, setPaystackStatus] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [paystackMerchantEmail, setPaystackMerchantEmail] = useState("");

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Payment credentials updated successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update payment credentials. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading credentials...</div>
    </div>
  );

  const tabs = [
    { id: "paypal", label: "Paypal" },
    { id: "stripe", label: "Stripe" },
    { id: "razorpay", label: "Razorpay" },
    { id: "paystack", label: "Paystack" },
  ];

  return (
    <div className="animate-fade-in bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      {/* Header Tabs */}
      <div className="flex items-center gap-6 px-6 pt-6 border-b border-line shrink-0 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-3 text-[14px] font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap", 
              activeTab === tab.id ? "border-rose-500 text-ink" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {tab.label}
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col p-8 bg-bone/10">
        {!isAdmin && (
          <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center mb-6">
            <Shield className="w-5 h-5 shrink-0 text-amber-600" />
            <span className="font-medium">Restricted Access: Only Owners and Admins can view or manage payment gateways.</span>
          </div>
        )}

        <div className="flex-1 max-w-2xl">
          {activeTab === "stripe" && (
            <div className="space-y-6 animate-fade-in">
              <label className="flex items-center gap-3 cursor-pointer group pb-4 border-b border-line">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-line accent-indigo-600" 
                  checked={stripeStatus}
                  onChange={(e) => setStripeStatus(e.target.checked)}
                  disabled={!isAdmin} 
                />
                <span className="text-[14px] text-ink">Stripe Status</span>
              </label>
              
              {stripeStatus && (
                <div className="space-y-6 animate-fade-in">
                  <label className="block">
                    <span className="block text-[13px] text-muted mb-1.5">Select Environment</span>
                    <select 
                      className="w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors appearance-none"
                      disabled={!isAdmin}
                    >
                      <option value="test">Test</option>
                      <option value="live">Live</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="block text-[13px] text-muted mb-1.5">Test Stripe Publishable Key <span className="text-rose-500">*</span></span>
                      <input
                        type="text"
                        placeholder="e.g. pk_test_..."
                        value={stripePublicKey}
                        onChange={(e) => setStripePublicKey(e.target.value)}
                        disabled={!isAdmin}
                        className="input w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      />
                    </label>
                    <label className="block relative">
                      <span className="block text-[13px] text-muted mb-1.5">Test Stripe Secret <span className="text-rose-500">*</span></span>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder=""
                          value={stripeSecretKey}
                          onChange={(e) => setStripeSecretKey(e.target.value)}
                          disabled={!isAdmin}
                          className="input w-full h-10 pl-3 pr-10 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </label>
                  </div>

                  <label className="block relative">
                    <span className="block text-[13px] text-muted mb-1.5">Test Stripe Webhook Signing Secret</span>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder=""
                        disabled={!isAdmin}
                        className="input w-full h-10 pl-3 pr-10 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </label>

                  <div className="pt-2">
                    <span className="block text-[13px] text-muted mb-1.5">Webhook URL</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-ink bg-transparent font-mono select-all">
                        https://crm.lumeo.in/verify_webhook/{company?.id || "b246320efc407fb3fae..."}
                      </span>
                      <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-ink transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <div className="mt-4 text-[12px] text-muted leading-relaxed space-y-1">
                      <p>Visit <span className="text-blue-500 hover:underline cursor-pointer">Generate</span> Add endpoint as above url and enter the webhook key generated</p>
                      <p>Select event <span className="font-semibold text-ink">invoice.payment_failed</span>, <span className="font-semibold text-ink">invoice.payment_succeeded</span> , <span className="font-semibold text-ink">payment_intent.succeeded</span> and <span className="font-semibold text-ink">payment_intent.payment_failed</span> while creating webhook.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "paypal" && (
            <div className="space-y-6 animate-fade-in">
              <label className="flex items-center gap-3 cursor-pointer group pb-4 border-b border-line">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-line accent-blue-600" 
                  checked={paypalStatus}
                  onChange={(e) => setPaypalStatus(e.target.checked)}
                  disabled={!isAdmin} 
                />
                <span className="text-[14px] text-ink">Paypal Status</span>
              </label>
              
              {paypalStatus && (
                <div className="space-y-6 animate-fade-in">
                  <label className="block">
                    <span className="block text-[13px] text-muted mb-1.5">Select Environment</span>
                    <select 
                      className="w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors appearance-none"
                      disabled={!isAdmin}
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="block text-[13px] text-muted mb-1.5">Sandbox Paypal Client Id <span className="text-rose-500">*</span></span>
                      <input
                        type="text"
                        placeholder="e.g. AW-Ydt5KHz..."
                        value={paypalClientId}
                        onChange={(e) => setPaypalClientId(e.target.value)}
                        disabled={!isAdmin}
                        className="input w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      />
                    </label>
                    <label className="block relative">
                      <span className="block text-[13px] text-muted mb-1.5">Sandbox Paypal Secret <span className="text-rose-500">*</span></span>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder=""
                          value={paypalSecret}
                          onChange={(e) => setPaypalSecret(e.target.value)}
                          disabled={!isAdmin}
                          className="input w-full h-10 pl-3 pr-10 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2">
                    <span className="block text-[13px] text-muted mb-1.5">Webhook URL</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-ink bg-transparent font-mono select-all">
                        https://crm.lumeo.in/paypal-webhook/{company?.id || "b246320efc407fb3fae..."}
                      </span>
                      <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-ink transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <p className="text-[12.5px] text-rose-500 mt-2 italic">
                      (Add this webhook url on your paypal app settings.)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "razorpay" && (
            <div className="space-y-6 animate-fade-in">
              <label className="flex items-center gap-3 cursor-pointer group pb-4 border-b border-line">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-line accent-cyan-600" 
                  checked={razorpayStatus}
                  onChange={(e) => setRazorpayStatus(e.target.checked)}
                  disabled={!isAdmin} 
                />
                <span className="text-[14px] text-ink">Razorpay Status</span>
              </label>
              
              {razorpayStatus && (
                <div className="space-y-6 animate-fade-in">
                  <label className="block">
                    <span className="block text-[13px] text-muted mb-1.5">Select Environment</span>
                    <select 
                      className="w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors appearance-none"
                      disabled={!isAdmin}
                    >
                      <option value="test">Test</option>
                      <option value="live">Live</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="block text-[13px] text-muted mb-1.5">Test Razorpay Key <span className="text-rose-500">*</span></span>
                      <input
                        type="text"
                        placeholder="e.g. rzp_test_znK7OLXXT3XXFX"
                        value={razorpayKey}
                        onChange={(e) => setRazorpayKey(e.target.value)}
                        disabled={!isAdmin}
                        className="input w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      />
                    </label>
                    <label className="block relative">
                      <span className="block text-[13px] text-muted mb-1.5">Test Razorpay Secret <span className="text-rose-500">*</span></span>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder=""
                          value={razorpaySecret}
                          onChange={(e) => setRazorpaySecret(e.target.value)}
                          disabled={!isAdmin}
                          className="input w-full h-10 pl-3 pr-10 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </label>
                  </div>

                  <label className="block relative">
                    <span className="block text-[13px] text-muted mb-1.5">Test Razorpay Webhook Signing Secret</span>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder=""
                        disabled={!isAdmin}
                        className="input w-full h-10 pl-3 pr-10 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </label>

                  <div className="pt-2">
                    <span className="block text-[13px] text-muted mb-1.5">Webhook URL</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-ink bg-transparent font-mono select-all">
                        https://crm.lumeo.in/razorpay-webhook/{company?.id || "b246320efc407fb3fae..."}
                      </span>
                      <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-ink transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <p className="text-[12.5px] text-rose-500 mt-2 italic">
                      (Add this webhook url on your razorpay app settings.)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "paystack" && (
            <div className="space-y-6 animate-fade-in">
              <label className="flex items-center gap-3 cursor-pointer group pb-4 border-b border-line">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-line accent-cyan-600" 
                  checked={paystackStatus}
                  onChange={(e) => setPaystackStatus(e.target.checked)}
                  disabled={!isAdmin} 
                />
                <span className="text-[14px] text-ink">Paystack Status</span>
              </label>
              
              {paystackStatus && (
                <div className="space-y-6 animate-fade-in">
                  <label className="block">
                    <span className="block text-[13px] text-muted mb-1.5">Select Environment</span>
                    <select 
                      className="w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors appearance-none"
                      disabled={!isAdmin}
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="block text-[13px] text-muted mb-1.5">Test Paystack Public Key <span className="text-rose-500">*</span></span>
                      <input
                        type="text"
                        placeholder="e.g. pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        value={paystackPublicKey}
                        onChange={(e) => setPaystackPublicKey(e.target.value)}
                        disabled={!isAdmin}
                        className="input w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                      />
                    </label>
                    <label className="block relative">
                      <span className="block text-[13px] text-muted mb-1.5">Test Paystack Secret Key <span className="text-rose-500">*</span></span>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder=""
                          value={paystackSecretKey}
                          onChange={(e) => setPaystackSecretKey(e.target.value)}
                          disabled={!isAdmin}
                          className="input w-full h-10 pl-3 pr-10 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="block text-[13px] text-muted mb-1.5">Test Paystack Merchant Email <span className="text-rose-500">*</span></span>
                    <input
                      type="email"
                      placeholder=""
                      value={paystackMerchantEmail}
                      onChange={(e) => setPaystackMerchantEmail(e.target.value)}
                      disabled={!isAdmin}
                      className="input w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                    />
                  </label>

                  <div className="pt-2">
                    <span className="block text-[13px] text-muted mb-1.5">Webhook URL</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-ink bg-transparent font-mono select-all">
                        https://crm.lumeo.in/paystack-webhook/{company?.id || "b246320efc407fb3fae..."}
                      </span>
                      <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-ink transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <p className="text-[12.5px] text-rose-500 mt-2 italic">
                      (Add this webhook url on your paystack app settings.)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-line/40 bg-paper flex items-center gap-4">
        {isAdmin && (
          <button
            onClick={() => mutation.mutate({
              stripe_public_key: stripePublicKey,
              stripe_secret_key: stripeSecretKey,
              paypal_client_id: paypalClientId,
              paypal_secret: paypalSecret,
              razorpay_key_id: razorpayKey,
              razorpay_key_secret: razorpaySecret
            })}
            disabled={mutation.isPending}
            className="btn btn-primary shadow-sm hover:shadow-md transition-all h-10 px-6 rounded-lg font-medium flex items-center gap-2 bg-ink hover:bg-ink-2 text-white border-0"
          >
            {mutation.isPending ? "Saving..." : (
              <>
                <CheckCircle className="w-4 h-4" /> Save
              </>
            )}
          </button>
        )}
        {msg && (
          <span className={cn(
            "text-[13px] font-medium animate-fade-in",
            msg.type === "success" ? "text-emerald-600" : "text-rose-600"
          )}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
