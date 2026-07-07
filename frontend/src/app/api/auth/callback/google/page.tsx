"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHandleOAuthCallback } from "@/lib/queries";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  
  const handleMutation = useHandleOAuthCallback();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (errorParam) {
      setStatus("error");
      setErrorMessage(`Google returned an error: ${errorParam}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code found in the URL.");
      return;
    }

    handleMutation.mutate(code, {
      onSuccess: () => {
        setStatus("success");
        // Redirect back to settings after a short delay
        setTimeout(() => {
          router.push("/settings");
        }, 2000);
      },
      onError: (err: any) => {
        setStatus("error");
        setErrorMessage(err?.response?.data?.error || "Failed to exchange authorization code.");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-bone border border-line rounded-2xl shadow-sm p-8 text-center animate-in zoom-in-95 duration-300">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-ink">Connecting to Google...</h2>
            <p className="text-muted text-sm">Please wait while we securely link your account.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-ink">Successfully Connected!</h2>
            <p className="text-muted text-sm">Your Google account has been linked. Redirecting you back...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-ink">Connection Failed</h2>
            <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-md border border-red-100">
              {errorMessage}
            </p>
            <div className="pt-4">
              <Link href="/settings" className="btn px-6 text-sm">
                Return to Settings
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
