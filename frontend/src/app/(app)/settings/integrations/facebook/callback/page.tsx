"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { api } from "@/lib/api";

interface FacebookPageItem {
  id: string;
  name: string;
  category?: string;
  token: string;
}

function FacebookCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [status, setStatus] = useState<"loading" | "select_page" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Meta / Facebook...");
  const [pages, setPages] = useState<FacebookPageItem[]>([]);
  const [connectingPageId, setConnectingPageId] = useState<string | null>(null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (error) {
      setStatus("error");
      setMessage(errorDescription || `Meta returned an error: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code found in the callback URL.");
      return;
    }

    const exchangeCode = async () => {
      if (hasExchanged.current) return;
      hasExchanged.current = true;

      try {
        const redirect_uri = `${window.location.origin}/settings/integrations/facebook/callback`;
        const res = await api.post("/crm/integrations/facebook/callback/", {
          code,
          redirect_uri,
        });

        if (res.data.status === "connected") {
          setStatus("success");
          setMessage(res.data.message || "Successfully connected your Facebook Page!");
          setTimeout(() => {
            router.push("/settings?tab=meta_leads");
          }, 1800);
        } else if (res.data.status === "select_page") {
          setStatus("select_page");
          setPages(res.data.pages || []);
          setMessage("Choose which Facebook Page you want to connect to this CRM workspace.");
        } else {
          setStatus("error");
          setMessage(res.data.error || "Unexpected response from server.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.error || "Failed to exchange authorization code with Meta.");
      }
    };

    exchangeCode();
  }, [code, error, errorDescription, router]);

  const handleSelectPage = async (page: FacebookPageItem) => {
    try {
      setConnectingPageId(page.id);
      await api.post("/crm/integrations/facebook/connect-page/", {
        page_id: page.id,
        page_name: page.name,
        page_token: page.token,
      });

      setStatus("success");
      setMessage(`Successfully connected "${page.name}" to Lumeo CRM!`);
      setTimeout(() => {
        router.push("/settings?tab=meta_leads");
      }, 1500);
    } catch (err: any) {
      setConnectingPageId(null);
      alert(err.response?.data?.error || "Failed to connect Facebook Page.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-paper border border-line rounded-2xl p-8 max-w-lg w-full shadow-lg">
        {status === "loading" && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center mb-5">
              <Loader2 className="w-8 h-8 text-[#1877F2] animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-ink tracking-tight mb-2">Connecting to Meta</h2>
            <p className="text-sm text-muted max-w-sm">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-ink tracking-tight mb-2">Page Connected!</h2>
            <p className="text-sm text-muted max-w-sm mb-4">{message}</p>
            <p className="text-xs text-muted/70">Redirecting to your CRM settings...</p>
          </div>
        )}

        {status === "select_page" && (
          <div className="py-2 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">Select Facebook Page</h3>
                <p className="text-xs text-muted">{message}</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-bone/30 hover:bg-bone transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      ID: <span className="font-mono">{p.id}</span>
                      {p.category && ` · ${p.category}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectPage(p)}
                    disabled={connectingPageId !== null}
                    className="btn btn-primary text-xs shrink-0 flex items-center gap-1.5 px-3 py-1.5"
                  >
                    {connectingPageId === p.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
              <AlertTriangle className="w-9 h-9 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold text-ink tracking-tight mb-2">Connection Failed</h2>
            <p className="text-sm text-muted max-w-sm mb-6">{message}</p>
            <button
              onClick={() => router.push("/settings?tab=meta_leads")}
              className="btn btn-secondary text-sm px-6 py-2"
            >
              Return to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FacebookOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      }
    >
      <FacebookCallbackContent />
    </Suspense>
  );
}
