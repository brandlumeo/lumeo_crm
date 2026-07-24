"use client";
import { toast } from "sonner";


import { CheckCircle2, CreditCard, Users, TrendingUp, FileText, Zap, Shield, Clock, X, Sparkles, ShieldAlert, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { requestSetup } from "@/lib/api";
import { useCurrentSubscription, usePlanCatalogue, useCreateSubscriptionCheckout, useVerifySubscription, useCurrentUser } from "@/lib/queries";
import type { PlanDetail } from "@/lib/types";

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Up to 2 team members",
    "50 leads",
    "20 deals",
    "All CRM views",
    "14-day trial",
  ],
  starter: [
    "Up to 5 team members",
    "500 leads",
    "200 deals",
    "All CRM views",
    "Pipeline & revenue charts",
    "Email support",
  ],
  pro: [
    "Up to 20 team members",
    "5,000 leads",
    "2,000 deals",
    "All CRM views",
    "Advanced analytics",
    "Priority support",
    "API access",
  ],
  enterprise: [
    "Unlimited team members",
    "Unlimited leads & deals",
    "All CRM views",
    "Advanced analytics",
    "Dedicated support",
    "Custom integrations",
    "SLA guarantee",
  ],
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Clock className="w-5 h-5" />,
  starter: <Zap className="w-5 h-5" />,
  pro: <TrendingUp className="w-5 h-5" />,
  enterprise: <Shield className="w-5 h-5" />,
};

function formatINR(amount: number) {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PlanCardProps {
  plan: PlanDetail;
  isCurrent: boolean;
  billingPeriod: "monthly" | "yearly";
  onUpgrade: (plan: PlanDetail) => void;
  disabled: boolean;
}

function PlanCard({ plan, isCurrent, billingPeriod, onUpgrade, disabled }: PlanCardProps) {
  const isPopular = plan.key === "pro";

  const price = billingPeriod === "yearly" ? plan.price_yearly : plan.price_monthly;
  const priceFormatted = formatINR(price);
  
  const maxUsers = (plan.max_users || 0) >= 999999 ? "Unlimited" : `Up to ${plan.max_users || 0}`;
  const maxLeads = billingPeriod === "yearly" ? ((plan.max_leads_yearly || plan.max_leads || 0) >= 999999 ? "Unlimited" : (plan.max_leads_yearly || plan.max_leads || 0).toLocaleString()) : ((plan.max_leads_monthly || plan.max_leads || 0) >= 999999 ? "Unlimited" : (plan.max_leads_monthly || plan.max_leads || 0).toLocaleString());
  const maxDeals = billingPeriod === "yearly" ? ((plan.max_deals_yearly || plan.max_deals || 0) >= 999999 ? "Unlimited" : (plan.max_deals_yearly || plan.max_deals || 0).toLocaleString()) : ((plan.max_deals_monthly || plan.max_deals || 0) >= 999999 ? "Unlimited" : (plan.max_deals_monthly || plan.max_deals || 0).toLocaleString());

  const features = [
    `${maxUsers} team members`,
    `${maxLeads} leads`,
    `${maxDeals} deals`,
    "All CRM views",
  ];
  if (plan.key === "free") features.push("14-day trial");
  if (plan.key === "starter") {
    features.push("Pipeline & revenue charts");
    features.push("Email support");
  }
  if (plan.key === "pro") {
    features.push("Advanced analytics", "Priority support", "API access");
  }
  if (plan.key === "enterprise") {
    features.push("Advanced analytics", "Dedicated support", "Custom integrations", "SLA guarantee");
  }

  return (
    <div
      className={[
        "relative flex flex-col rounded-xl border p-6 transition-all duration-300 hover:shadow-md",
        isCurrent
          ? "border-ink bg-ink text-paper"
          : isPopular
            ? "border-accent bg-accent-soft"
            : "border-line bg-paper",
      ].join(" ")}
    >
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-medium uppercase tracking-widest px-3 py-0.5 rounded-full">
          Most popular
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] font-medium uppercase tracking-widest px-3 py-0.5 rounded-full border border-paper/20 animate-pulse">
          Current plan
        </div>
      )}

      <div className={["mb-4 flex items-center gap-2.5", isCurrent ? "text-paper/80" : "text-ink-2"].join(" ")}>
        {PLAN_ICONS[plan.key]}
        <span className="text-[11px] uppercase tracking-[0.15em] font-medium">
          {plan.name}
        </span>
      </div>

      <div className="mb-6">
        <div className={["font-serif text-[42px] leading-none flex items-baseline", isCurrent ? "text-paper" : "text-ink"].join(" ")}>
          {priceFormatted}
          {price > 0 && (
            <span className={["text-[14px] font-sans ml-1", isCurrent ? "text-paper/60" : "text-muted"].join(" ")}>
              / {billingPeriod === "yearly" ? "yr" : "mo"}
            </span>
          )}
        </div>
        {billingPeriod === "yearly" && plan.price_yearly > 0 && (
          <div className={["text-[12px] mt-1 font-medium text-accent"].join(" ")}>
            Includes {Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)}% yearly discount
          </div>
        )}
      </div>

      <div className={["text-[11px] uppercase tracking-[0.12em] font-medium mb-3", isCurrent ? "text-paper/60" : "text-muted"].join(" ")}>
        Includes
      </div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[13px]">
            <CheckCircle2
              className={["w-4 h-4 mt-0.5 shrink-0", isCurrent ? "text-green-400" : "text-green"].join(" ")}
            />
            <span className={isCurrent ? "text-paper/80" : "text-ink-2"}>{feature}</span>
          </li>
        ))}
      </ul>

      <div className={["text-[11px] grid grid-cols-3 gap-2 pt-4 border-t", isCurrent ? "border-paper/10 text-paper/50" : "border-line text-muted"].join(" ")}>
        <div className="text-center">
          <div className={["font-mono text-base mb-0.5", isCurrent ? "text-paper" : "text-ink"].join(" ")}>
            {(plan.max_users || 0) >= 999999 ? "∞" : (plan.max_users || 0)}
          </div>
          users
        </div>
        <div className="text-center">
          <div className={["font-mono text-base mb-0.5", isCurrent ? "text-paper" : "text-ink"].join(" ")}>
            {billingPeriod === "yearly" ? ((plan.max_leads_yearly || plan.max_leads || 0) >= 999999 ? "∞" : (plan.max_leads_yearly || plan.max_leads || 0).toLocaleString()) : ((plan.max_leads_monthly || plan.max_leads || 0) >= 999999 ? "∞" : (plan.max_leads_monthly || plan.max_leads || 0).toLocaleString())}
          </div>
          leads
        </div>
        <div className="text-center">
          <div className={["font-mono text-base mb-0.5", isCurrent ? "text-paper" : "text-ink"].join(" ")}>
            {billingPeriod === "yearly" ? ((plan.max_deals_yearly || plan.max_deals || 0) >= 999999 ? "∞" : (plan.max_deals_yearly || plan.max_deals || 0).toLocaleString()) : ((plan.max_deals_monthly || plan.max_deals || 0) >= 999999 ? "∞" : (plan.max_deals_monthly || plan.max_deals || 0).toLocaleString())}
          </div>
          deals
        </div>
      </div>

      {!isCurrent && (
        <button
          disabled={disabled}
          className={[
            "mt-5 w-full py-2.5 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98] disabled:opacity-50",
            isPopular
              ? "bg-accent text-white hover:opacity-90"
              : "border border-line bg-paper text-ink hover:bg-bone-2",
          ].join(" ")}
          onClick={() => onUpgrade(plan)}
        >
          {plan.price_monthly === 0 ? "Current (Free Trial)" : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  );
}

function SubscriptionStatus({ sub }: { sub: ReturnType<typeof useCurrentSubscription>["data"] }) {
  if (!sub) return null;

  const statusColor = sub.is_expired
    ? "chip chip-warning"
    : sub.is_trial
      ? "chip chip-warning"
      : "chip chip-positive";

  return (
    <div className="card p-6 mb-8 animate-rise">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-ink grid place-items-center">
            <CreditCard className="w-5 h-5 text-paper" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted mb-0.5">Active plan</div>
            <div className="font-serif text-[24px] leading-none">{sub.plan_display}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={statusColor}>
            {sub.is_expired ? "Expired" : sub.is_trial ? "Trial" : "Active"}
          </span>
          {sub.days_remaining !== null && (
            <span className="chip chip-neutral">
              {sub.days_remaining} days remaining
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-line">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted mb-1">Max users</div>
          <div className="font-mono text-xl text-ink">
            {(sub.plan_limits.max_users >= 999999) ? "∞" : sub.plan_limits.max_users}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted mb-1">Max leads</div>
          <div className="font-mono text-xl text-ink">
            {(sub.plan_limits.max_leads >= 999999) ? "∞" : sub.plan_limits.max_leads.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted mb-1">Max deals</div>
          <div className="font-mono text-xl text-ink">
            {(sub.plan_limits.max_deals >= 999999) ? "∞" : sub.plan_limits.max_deals.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted mb-1">Monthly price</div>
          <div className="font-mono text-xl text-ink">
            {sub.plan_limits.price_monthly === 0 ? "Free" : `₹${sub.plan_limits.price_monthly.toLocaleString()}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: sub, isLoading: subLoading } = useCurrentSubscription();
  const { data: plans, isLoading: plansLoading } = usePlanCatalogue();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mutation hooks
  const checkoutMutation = useCreateSubscriptionCheckout();
  const verifyMutation = useVerifySubscription();
  const setupMutation = useMutation({
    mutationFn: requestSetup,
    onSuccess: () => {
      toast.success("Setup request sent! Our onboarding team will contact you shortly.");
    },
    onError: () => {
      toast.error("Failed to send setup request. Please try again.");
    }
  });

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  // Interactive Simulation Modal state
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockCheckoutData, setMockCheckoutData] = useState<{
    subscriptionId: string;
    planKey: string;
    planName: string;
    billingPeriod: "monthly" | "yearly";
    price: number;
  } | null>(null);

  const [simState, setSimState] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [simStepText, setSimStepText] = useState("");
  const [simError, setSimError] = useState("");

  const isLoading = subLoading || plansLoading || checkoutMutation.isPending || verifyMutation.isPending;

  const handleUpgrade = (plan: PlanDetail) => {
    if (plan.key === "free") return;

    checkoutMutation.mutate(
      { plan_key: plan.key, billing_period: billingPeriod },
      {
        onSuccess: (data) => {
          if (data.is_mock) {
            setMockCheckoutData({
              subscriptionId: data.subscription_id,
              planKey: plan.key,
              planName: plan.name,
              billingPeriod: billingPeriod,
              price: billingPeriod === "yearly" ? plan.price_yearly : plan.price_monthly,
            });
            setSimState("idle");
            setShowMockModal(true);
          } else {
            openRazorpayCheckout(data.subscription_id, data.key_id, plan.key, billingPeriod, plan.name);
          }
        },
        onError: (err: any) => {
          toast.error("Failed to initialize checkout session: " + (err.response?.data?.detail || err.message));
        },
      }
    );
  };

  const openRazorpayCheckout = async (
    subscriptionId: string,
    keyId: string,
    planKey: string,
    billingPeriod: "monthly" | "yearly",
    planName: string
  ) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load Razorpay Checkout SDK. Check your internet connection.");
      return;
    }

    const options = {
      key: keyId,
      subscription_id: subscriptionId,
      name: "Lumeo CRM",
      description: `Upgrade to ${planName} (${billingPeriod})`,
      handler: function (response: any) {
        verifyMutation.mutate(
          {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
            plan_key: planKey,
            billing_period: billingPeriod,
          },
          {
            onSuccess: () => {
              toast.success("Subscription upgraded successfully! Enjoy your expanded tier limits.");
            },
            onError: (err: any) => {
              toast.error("Payment verification failed: " + (err.response?.data?.detail || err.message));
            },
          }
        );
      },
      prefill: {
        name: "Lumeo Sandbox User",
        email: "billing@lumeo.com",
      },
      theme: {
        color: "#0F0F11",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleSimulatePayment = async (success: boolean) => {
    if (!mockCheckoutData) return;

    setSimState("processing");
    setSimError("");

    const steps = [
      "Establishing SSL connection to mock gateway...",
      "Authorizing card limits with VISA...",
      "Generating unique transaction proof...",
      "Checking double-spend signatures...",
    ];

    for (let i = 0; i < steps.length; i++) {
      setSimStepText(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 200));
    }

    if (!success) {
      setSimState("error");
      setSimError("Mock Payment Declined: Insufficient simulated limits on test VISA card.");
      return;
    }

    verifyMutation.mutate(
      {
        razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
        razorpay_subscription_id: mockCheckoutData.subscriptionId,
        razorpay_signature: "sig_mock_" + Math.random().toString(36).substring(7),
        plan_key: mockCheckoutData.planKey,
        billing_period: mockCheckoutData.billingPeriod,
      },
      {
        onSuccess: () => {
          setSimState("success");
          setTimeout(() => {
            setShowMockModal(false);
            setSimState("idle");
          }, 2000);
        },
        onError: (err: any) => {
          setSimState("error");
          setSimError("Backend signature verification failed: " + (err.response?.data?.detail || err.message));
        },
      }
    );
  };

  if (!userLoading && user && user.role !== "owner" && user.role !== "admin") {
    return (
      <div className="p-7 max-w-[1200px]">
        <div className="bg-bone-2 border border-line rounded-md p-10 text-center text-muted">
          <ShieldAlert className="w-8 h-8 text-muted mx-auto mb-3" />
          <h2 className="text-lg font-medium text-ink mb-1">Access Denied</h2>
          <p className="text-sm">You do not have permission to view or manage billing settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 pb-16 max-w-[1200px]">
      <div className="animate-rise mb-8">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
          <span className="w-[18px] h-px bg-accent" />
          Billing
        </div>
        <h1 className="font-serif text-[52px] leading-none mb-2">
          Subscription &amp;{" "}
          <em className="text-accent not-italic">plans.</em>
        </h1>
        <p className="text-muted text-sm max-w-xl">
          Manage your Lumeo workspace plan. Upgrade dynamically using credit cards or simulated checkouts. All pricing includes features aligned to enterprise organization and data security standards.
        </p>
      </div>

      {!mounted || subLoading || plansLoading ? (
        <div className="card p-10 animate-rise">
          <div className="font-serif text-[28px] mb-2">Loading billing info...</div>
          <p className="text-muted text-sm animate-pulse">Fetching your active subscription details and available plans catalogue...</p>
        </div>
      ) : (
        <>
          <SubscriptionStatus sub={sub} />

          <div className="mb-6 animate-rise">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                <span className="w-[18px] h-px bg-accent" />
                Available plans
              </div>

              {/* Billing Cycle Toggle */}
              <div className="bg-bone border border-line p-1 rounded-xl flex gap-1">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={[
                    "py-1.5 px-3 text-xs font-semibold rounded-lg transition-all",
                    billingPeriod === "monthly"
                      ? "bg-ink text-paper shadow-sm"
                      : "text-muted hover:text-ink"
                  ].join(" ")}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={[
                    "py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    billingPeriod === "yearly"
                      ? "bg-ink text-paper shadow-sm"
                      : "text-muted hover:text-ink"
                  ].join(" ")}
                >
                  Yearly
                  <span className="bg-accent text-white text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded">
                    Up to -17%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {(plans ?? []).map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  isCurrent={plan.is_current}
                  billingPeriod={billingPeriod}
                  onUpgrade={handleUpgrade}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <div className="card border-accent/20 bg-accent-soft/30 overflow-hidden mb-8 animate-rise">
            <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-serif text-[24px] text-ink leading-none">Premium Setup & Data Migration</h3>
                    <span className="chip chip-positive bg-accent text-white border-accent">Tailored to your needs</span>
                  </div>
                  <p className="text-[14px] text-muted max-w-2xl leading-relaxed">
                    Skip the learning curve. Our onboarding experts will configure your workspace, set up custom fields, establish pipeline stages, and migrate all your existing data from previous systems or spreadsheets so you can hit the ground running.
                  </p>
                  <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                    <li className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Full Data Import
                    </li>
                    <li className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Custom Workflow Setup
                    </li>
                    <li className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> 2-Hr Team Training
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-line">
                <div className="font-serif text-[24px] text-ink mb-1">
                  Custom Quote
                </div>
                <div className="text-[12px] text-muted mb-4 font-medium">Based on company size & complexity</div>
                <button 
                  type="button"
                  className="btn bg-accent hover:bg-accent/90 text-white w-full md:w-auto shadow-sm px-6 py-2.5 transition-all flex items-center justify-center gap-2"
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Request Setup"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 animate-rise">
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <FileText className="w-5 h-5 text-muted mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-ink mb-1">Invoice history</div>
                  <p className="text-[13px] text-muted">
                    Invoice history and receipt downloads are synced via background webhook charging events. Real-time updates automatically display in your billing panel.
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-start gap-4">
                <Users className="w-5 h-5 text-muted mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-ink mb-1">Team seat usage</div>
                  <p className="text-[13px] text-muted">
                    Real-time seat tracking automatically monitors actual users vs the strict capacity ceiling of your plan limits. Custom invitations automatically disable once you reach the maximum allowed seats.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Developer Mock Gateway Glassmorphism Modal */}
      {showMockModal && mockCheckoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-md bg-paper border border-line rounded-2xl shadow-2xl overflow-hidden p-6 animate-rise">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-line mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                <span className="font-serif text-lg text-ink font-semibold">Lumeo Developer Gateway</span>
              </div>
              {simState === "idle" && (
                <button
                  onClick={() => setShowMockModal(false)}
                  className="text-muted hover:text-ink transition-colors p-1 rounded-full hover:bg-bone"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Credit Card Simulation Visual */}
            <div className="w-full h-48 bg-gradient-to-tr from-ink to-ink-2 rounded-xl p-6 text-paper flex flex-col justify-between shadow-lg mb-6 relative overflow-hidden">
              {/* Abstract background graphics for card */}
              <div className="absolute right-0 bottom-0 w-36 h-36 bg-accent/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute left-1/3 top-1/4 w-12 h-12 bg-paper/5 rounded-full pointer-events-none" />
              
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] text-paper/60 uppercase tracking-widest">Mock Credit Card</div>
                  <div className="font-sans text-xs tracking-wider mt-1 text-paper/80 font-medium font-sans">VISA PRE-AUTHORIZED</div>
                </div>
                <div className="font-sans text-lg italic tracking-wider font-bold">VISA</div>
              </div>

              <div className="font-mono text-xl tracking-[0.2em] text-center my-3 text-paper/90 select-none">
                4111 2222 3333 4444
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[9px] text-paper/40 uppercase">Cardholder</div>
                  <div className="font-mono text-xs tracking-wider text-paper/80">LUMEO SAAS TESTING</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-paper/40 uppercase">Expires</div>
                  <div className="font-mono text-xs text-paper/80">12 / 30</div>
                </div>
              </div>
            </div>

            {/* Plan summary */}
            <div className="bg-bone-2 rounded-xl p-4 mb-6 border border-line text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted">Subscription plan</span>
                <span className="font-medium text-ink">{mockCheckoutData.planName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted">Billing cycle</span>
                <span className="font-medium text-ink capitalize">{mockCheckoutData.billingPeriod}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-line mt-2 text-base font-medium">
                <span className="text-ink">Total to Pay</span>
                <span className="text-accent">{formatINR(mockCheckoutData.price)}</span>
              </div>
            </div>

            {/* States handler */}
            {simState === "idle" && (
              <div className="space-y-3">
                <p className="text-xs text-muted text-center leading-relaxed">
                  This simulates standard banking APIs. Click Success to verify the signature on your Django local server backend instantly.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleSimulatePayment(true)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold bg-accent text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Simulate Success
                  </button>
                  <button
                    onClick={() => handleSimulatePayment(false)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold border border-line text-ink hover:bg-bone-2 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Simulate Decline
                  </button>
                </div>
              </div>
            )}

            {simState === "processing" && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                <div className="font-medium text-ink mb-2">Simulating Secure Payment</div>
                <div className="text-xs text-muted font-mono bg-bone px-3 py-1.5 rounded border border-line animate-pulse">
                  {simStepText}
                </div>
              </div>
            )}

            {simState === "success" && (
              <div className="flex flex-col items-center justify-center py-6 text-center animate-rise">
                <div className="w-14 h-14 bg-green/10 text-green rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green" />
                </div>
                <div className="font-serif text-xl text-ink font-semibold mb-1">Upgrade Success!</div>
                <p className="text-xs text-muted">
                  The subscription signature was verified on the backend, and your organization limits have been expanded.
                </p>
              </div>
            )}

            {simState === "error" && (
              <div className="flex flex-col items-center justify-center py-6 text-center animate-rise">
                <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <div className="font-serif text-lg text-ink font-semibold mb-1">Transaction Failed</div>
                <p className="text-xs text-muted mb-4 px-4 leading-relaxed">
                  {simError || "Payment simulation was declined. Make sure to check key configurations or retry the checkout."}
                </p>
                <button
                  onClick={() => setSimState("idle")}
                  className="py-2 px-4 bg-bone border border-line hover:bg-bone-2 text-ink rounded-lg text-xs font-medium transition-all"
                >
                  Retry Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
