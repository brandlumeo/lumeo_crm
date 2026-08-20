"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function GoogleOAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Google Workspace...");
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (error) {
      setStatus("error");
      setMessage(`Google returned an error: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code found in the URL.");
      return;
    }

    const exchangeCode = async () => {
      if (hasExchanged.current) return;
      hasExchanged.current = true;
      
      try {
        const response = await api.post("/crm/integrations/google/callback/", { code });
        setStatus("success");
        setMessage(response.data.message || "Successfully connected your Google account!");
        
        // Redirect back to integrations settings after a short delay
        setTimeout(() => {
          router.push("/settings/integrations");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.error || "Failed to exchange authorization code.");
      }
    };

    exchangeCode();
  }, [code, error, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="card border border-slate-900 bg-slate-950/40 p-8 flex flex-col items-center max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-ink">Connecting...</h2>
          </>
        )}
        
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-500 mb-4" />
            <h2 className="text-lg font-semibold text-emerald-400">Connected!</h2>
          </>
        )}
        
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-rose-500 mb-4" />
            <h2 className="text-lg font-semibold text-rose-400">Connection Failed</h2>
          </>
        )}
        
        <p className="text-sm text-muted mt-2">{message}</p>
        
        {status === "error" && (
          <button 
            onClick={() => router.push("/settings/integrations")}
            className="btn btn-secondary mt-6 w-full justify-center"
          >
            Return to Settings
          </button>
        )}
      </div>
    </div>
  );
}
