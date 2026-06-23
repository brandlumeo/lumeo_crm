"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left column — form */}
      <div className="flex flex-col px-8 py-10 sm:px-16">
        {/* Logo */}
        <Link href="/login" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ink rounded-md grid place-items-center text-bone font-serif italic text-[20px] leading-none pb-0.5">
            L
          </div>
          <div className="font-serif text-[22px]">
            Lume<em className="text-accent not-italic">o</em>
          </div>
        </Link>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm">
            {sent ? (
              /* ── Success state ── */
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 border border-green-200 grid place-items-center mx-auto mb-5">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="font-serif text-[36px] leading-none mb-3">
                  Check your <em className="text-accent not-italic">inbox.</em>
                </h1>
                <p className="text-[14px] text-muted leading-relaxed mb-6">
                  If <strong>{email}</strong> is registered in Lumeo, you'll
                  receive a password reset link within a few minutes.
                </p>
                <p className="text-[12px] text-muted mb-6">
                  Check your spam folder if you don't see it.
                </p>
                <Link href="/login" className="btn btn-primary w-full justify-center py-2.5">
                  Back to sign in
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-2 flex items-center gap-2">
                  <span className="w-[18px] h-px bg-accent" /> Forgot password
                </div>
                <h1 className="font-serif text-[40px] leading-none mb-3">
                  Reset your <em className="text-accent not-italic">password.</em>
                </h1>
                <p className="text-[14px] text-muted mb-8 leading-relaxed">
                  Enter the email address linked to your Lumeo account and we'll
                  send you a secure reset link.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                  <label className="block">
                    <span className="label">Email address</span>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input !pl-10"
                        placeholder="you@yourcompany.com"
                      />
                    </div>
                  </label>

                  {error && (
                    <div className="chip chip-warning justify-center">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary justify-center py-2.5 mt-2 disabled:opacity-60"
                  >
                    {loading ? "Sending reset link…" : "Send reset link"}
                  </button>

                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors mt-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="text-[11px] text-muted font-mono">Copyright Lumeo 2026</div>
      </div>

      {/* Right column — brand panel */}
      <div className="hidden lg:flex relative bg-ink text-paper p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,31,0.25),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4">
            Account recovery
          </div>
          <h2 className="font-serif text-[64px] leading-[0.95] max-w-md">
            Back in your{" "}
            <em className="text-accent not-italic">workspace</em> in minutes.
          </h2>
        </div>
        <div className="relative grid grid-cols-3 gap-6 text-xs text-paper/70 max-w-md">
          <div>
            <div className="font-mono text-2xl text-paper mb-1">1hr</div>
            link validity
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">256</div>
            bit encryption
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">0</div>
            data exposed
          </div>
        </div>
      </div>
    </div>
  );
}
