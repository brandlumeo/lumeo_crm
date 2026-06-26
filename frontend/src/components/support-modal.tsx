"use client";

import { useState } from "react";
import { X, CheckCircle2, Send, Building2, User2, Mail } from "lucide-react";
import { useCurrentUser, useCurrentCompany } from "@/lib/queries";
import { getAuthToken } from "@/lib/api";

export function SupportModal({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { data: user } = useCurrentUser();
  const { data: company } = useCurrentCompany();

  const [subject, setSubject] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/accounts/contact-support/`
          : "/api/v1/accounts/contact-support/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ subject, message }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to send support message. Please try again.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setSuccess(false);
      setMessage("");
      setError("");
    }, 200);
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-paper border border-line rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-bone">
          <div>
            <h3 className="font-serif text-lg text-ink">Contact Lumeo Support</h3>
            <p className="text-xs text-muted mt-0.5">We are here to help your workspace succeed</p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-ink transition-colors p-1 rounded-lg hover:bg-bone-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-xl text-ink mb-2">Message Sent Successfully!</h4>
            <p className="text-sm text-muted max-w-sm mx-auto mb-6">
              Our support team has received your request along with your workspace details and will get back to you shortly.
            </p>
            <button
              onClick={handleClose}
              className="bg-ink text-paper px-6 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Verified sender info */}
            <div className="bg-bone-2 border border-line rounded-lg p-3 space-y-2 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted font-mono font-bold">
                Verified Sender Identity
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-ink shrink-0" />
                  <span className="truncate">Company: <strong className="text-ink">{company?.name || "Lumeo Workspace"}</strong></span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <User2 className="w-3.5 h-3.5 text-ink shrink-0" />
                  <span className="truncate">User: <strong className="text-ink">{user?.first_name || user?.username || "Admin"}</strong></span>
                </div>
                <div className="col-span-2 flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-ink shrink-0" />
                  <span className="truncate">Email: <strong className="text-ink">{user?.email || user?.username || "User Email"}</strong></span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Select Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-paper border border-line rounded-md px-3 py-2 text-sm text-ink outline-none focus:border-ink transition-colors"
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="Billing & Subscriptions">Billing & Subscriptions</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Bug Report & Technical Issue">Bug Report & Technical Issue</option>
                <option value="Account Management">Account Management</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">How can we help you?</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or issue in detail..."
                rows={5}
                className="w-full bg-paper border border-line rounded-md p-3 text-sm text-ink outline-none focus:border-ink transition-colors resize-none"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-md">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-muted hover:text-ink transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-ink text-paper px-5 py-2 rounded-md text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
