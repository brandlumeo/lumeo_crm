"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { api, storeTokens } from "@/lib/api";

function VerifyEmail() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(token ? "" : "This confirmation link is missing its code.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .post("/accounts/verify-email/", { token })
      .then(({ data }) => {
        storeTokens({ access: data.access, refresh: data.refresh }, true);
        setState("done");
        setTimeout(() => router.replace("/dashboard"), 1500);
      })
      .catch((err) => {
        setState("error");
        setMessage(err?.response?.data?.detail || "We couldn't confirm your email. Please try again.");
      });
  }, [token, router]);

  if (state === "working") {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto mb-5 h-8 w-8 animate-spin text-muted" />
        <h1 className="mb-3 font-serif text-[32px] leading-none">Confirming your email…</h1>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-green-200 bg-green-100">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="mb-3 font-serif text-[36px] leading-none">
          Email <em className="text-accent not-italic">confirmed.</em>
        </h1>
        <p className="mb-6 text-[14px] text-muted">Your workspace is ready. Taking you in…</p>
        <Link href="/dashboard" className="btn btn-primary w-full justify-center py-2.5">
          Open my workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-amber-200 bg-amber-100">
        <AlertCircle className="h-7 w-7 text-amber-600" />
      </div>
      <h1 className="mb-3 font-serif text-[36px] leading-none">Link not valid.</h1>
      <p className="mb-6 text-[14px] leading-relaxed text-muted">{message} You can ask for a new link from the sign-in page.</p>
      <Link href="/login" className="btn btn-primary w-full justify-center py-2.5">
        Go to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-muted" />}>
      <VerifyEmail />
    </Suspense>
  );
}
