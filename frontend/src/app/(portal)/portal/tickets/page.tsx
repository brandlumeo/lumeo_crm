"use client";

import { useEffect, useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchTickets } from "@/lib/api";
import { useCreateTicket } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Ticket as TicketIcon, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function PortalTicketsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => fetchTickets(),
  });

  const createTicketMutation = useCreateTicket();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("low");

  if (!mounted) return null;

  const tickets = data?.results || [];

  const handleCreateTicket = (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Subject and description are required.");
      return;
    }
    
    createTicketMutation.mutate(
      { subject, description, priority },
      {
        onSuccess: (newTicket) => {
          toast.success("Ticket created successfully!");
          setIsModalOpen(false);
          setSubject("");
          setDescription("");
          setPriority("low");
          router.push(`/portal/tickets/${newTicket.id}`);
        },
        onError: (err: any) => {
          toast.error("Failed to create ticket: " + (err.response?.data?.detail || err.message));
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-rise relative">
      <Link href="/portal" className="text-sm font-medium text-muted hover:text-ink flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-[32px] leading-none mb-2">Support Tickets</h1>
          <p className="text-muted text-lg">Track your current and past support requests.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <SkeletonTable columns={5} rows={5} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets yet"
            description="You don't have any open support tickets at the moment."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                <tr className="text-muted text-left">
                  <th className="p-3 font-medium">Ticket ID</th>
                  <th className="p-3 font-medium">Subject</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Priority</th>
                  <th className="p-3 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
              {tickets.map((t) => (
                <tr 
                  key={t.id} 
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => router.push(`/portal/tickets/${t.id}`)}
                >
                  <td className="p-3 font-mono text-xs">#{t.id}</td>
                  <td className="p-3">{t.subject}</td>
                  <td className="p-3 capitalize">
                    <span className={`chip ${t.status === 'resolved' || t.status === 'closed' ? 'chip-positive' : 'chip-gold'}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 capitalize">{t.priority}</td>
                  <td className="p-3 text-right text-muted">{formatDateTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="card p-6 w-full max-w-lg bg-[#111] border border-white/10 shadow-2xl animate-rise relative"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl mb-4">Create New Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Subject</label>
                <input 
                  placeholder="Brief description of the issue"
                  value={subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-line bg-surface text-ink text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-line bg-surface text-ink text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Description</label>
                <textarea 
                  placeholder="Provide more details..."
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-line bg-surface text-ink text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                  required
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={createTicketMutation.isPending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={createTicketMutation.isPending}
                >
                  {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
