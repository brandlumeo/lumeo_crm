"use client";

import { useState } from "react";
import { useQuotes, useCreateQuote, useDeleteQuote } from "@/lib/queries";
import { FileText, Plus, Search, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";

export default function QuotesPage() {
  const { data, isLoading } = useQuotes();
  const createMutation = useCreateQuote();
  const deleteMutation = useDeleteQuote();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({ title: "", quote_number: `Q-${Math.floor(Math.random() * 10000)}` });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const quotes = data?.results || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newQuote as any, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewQuote({ title: "", quote_number: `Q-${Math.floor(Math.random() * 10000)}` });
      }
    });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/quote/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Quotes</h1>
          <p className="text-muted text-sm mt-1">Create quotes and share them securely with clients for e-signatures.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line flex items-center gap-3 bg-bone-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search quotes..."
              className="w-full pl-9 pr-4 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable columns={5} rows={8} />
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes found"
            description="Create your first quote to send proposals to your prospective clients."
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap relative">
              <thead className="sticky top-0 z-10 text-muted bg-bone/80 backdrop-blur-md shadow-[0_1px_0_0_var(--color-line)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Quote ID / Title</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Public Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotes.map((quote: any) => (
                  <tr key={quote.id} className="hover:bg-bone-2/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-ink">{quote.title || "Untitled Quote"}</div>
                      <div className="text-xs text-muted mt-1">{quote.quote_number}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                        quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-ink">
                      ${parseFloat(quote.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/public/quote/${quote.public_token}`, '_blank')}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors border border-line"
                          title="Open Public Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(quote.public_token)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-bone-2 text-ink hover:bg-line rounded-md transition-colors"
                        >
                          {copiedLink === quote.public_token ? (
                            <><Check className="w-4 h-4 text-emerald-600" /> Copied</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Copy Link</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <>
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)} />
          <div className="modal-content animate-fade-in p-0">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">New Quote</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Quote Title</label>
                <input
                  required
                  type="text"
                  value={newQuote.title}
                  onChange={(e) => setNewQuote({ ...newQuote, title: e.target.value })}
                  placeholder="e.g. Website Redesign"
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Quote Number</label>
                <input
                  required
                  type="text"
                  value={newQuote.quote_number}
                  onChange={(e) => setNewQuote({ ...newQuote, quote_number: e.target.value })}
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                />
              </div>
            </form>
            <div className="p-5 border-t border-line bg-bone flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Quote"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
