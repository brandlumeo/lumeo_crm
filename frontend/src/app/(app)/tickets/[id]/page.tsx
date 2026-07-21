"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { useTicket, useTicketComments, useCreateTicketComment, useUpdateTicket, useCurrentUser } from "@/lib/queries";
import { fetchTeam } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";

const STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function CRMTicketDetailPage() {
  const params = useParams();
  const ticketId = Number(params.id);
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: ticket, isLoading: isLoadingTicket } = useTicket(ticketId);
  const { data: comments, isLoading: isLoadingComments } = useTicketComments(ticketId);
  const { data: currentUser } = useCurrentUser();
  
  // Fetch team for assignment
  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    enabled: !!currentUser,
  });

  const createCommentMutation = useCreateTicketComment();
  const updateTicketMutation = useUpdateTicket();
  
  const [newComment, setNewComment] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when comments load
  useEffect(() => {
    if (comments) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  if (!mounted) return null;

  const handleSendComment = (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate(
      { ticketId, payload: { body: newComment } },
      {
        onSuccess: () => {
          setNewComment("");
        },
        onError: (err: any) => {
          toast.error("Failed to post comment: " + (err.response?.data?.detail || err.message));
        }
      }
    );
  };

  const handleStatusChange = (newStatus: string) => {
    updateTicketMutation.mutate(
      { id: ticketId, payload: { status: newStatus } },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (err) => toast.error("Failed to update status: " + err.message),
      }
    );
  };

  const handlePriorityChange = (newPriority: string) => {
    updateTicketMutation.mutate(
      { id: ticketId, payload: { priority: newPriority } },
      {
        onSuccess: () => toast.success("Priority updated"),
        onError: (err) => toast.error("Failed to update priority: " + err.message),
      }
    );
  };

  const handleAssignChange = (newUserId: string) => {
    updateTicketMutation.mutate(
      { id: ticketId, payload: { assigned_to_id: newUserId ? Number(newUserId) : null } },
      {
        onSuccess: () => toast.success("Assignment updated"),
        onError: (err) => toast.error("Failed to update assignment: " + err.message),
      }
    );
  };

  if (isLoadingTicket) {
    return (
      <PageShell title="Loading Ticket...">
        <div className="p-8 text-center text-muted">Loading ticket details...</div>
      </PageShell>
    );
  }

  if (!ticket) {
    return (
      <PageShell title="Ticket Not Found">
        <div className="p-8 text-center">
          <Link href="/tickets" className="btn btn-primary">Go back</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={`Ticket #${ticket.id}`} eyebrow="Support">
      <div className="space-y-6 animate-rise">
        <Link href="/tickets" className="text-sm font-medium text-muted hover:text-ink flex items-center gap-2 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-serif text-[32px] leading-none">{ticket.subject}</h1>
              <span className={`chip ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'chip-positive' : 'chip-gold'}`}>
                {ticket.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-muted">Ticket #{ticket.id} • Created on {formatDateTime(ticket.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Conversation Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-6 min-h-[400px] max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col relative p-6">
              
              {/* Original Ticket Description */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-medium shrink-0">
                  C
                </div>
                <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-none p-4 border border-slate-100">
                  <div className="text-xs font-medium text-slate-700 mb-1">
                    Customer ID: {ticket.customer || "Unknown"} (Client)
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{ticket.description}</p>
                  <div className="text-[11px] text-slate-400 mt-2 text-right">
                    {formatDateTime(ticket.created_at)}
                  </div>
                </div>
              </div>

              {/* Comments */}
              {isLoadingComments ? (
                <div className="text-center text-muted py-4">Loading conversation...</div>
              ) : (
                comments?.map((comment) => {
                  const isStaff = comment.author?.role !== "CUSTOMER";
                  return (
                    <div key={comment.id} className={`flex gap-4 ${isStaff ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium shrink-0 ${
                        isStaff ? "bg-brand/20 text-brand" : "bg-slate-100 text-slate-700"
                      }`}>
                        {isStaff ? "You" : (comment.author?.first_name?.[0] || "C")}
                      </div>
                      <div className={`flex-1 max-w-[85%] rounded-2xl p-4 border ${
                        isStaff 
                          ? "bg-white border-line-2 rounded-tr-none shadow-sm" 
                          : "bg-slate-50 border-slate-100 rounded-tl-none"
                      }`}>
                        {!isStaff && (
                          <div className="text-xs font-medium text-slate-700 mb-1">
                            {comment.author?.first_name} {comment.author?.last_name} (Client)
                          </div>
                        )}
                        {isStaff && comment.author?.id !== currentUser?.id && (
                          <div className="text-xs font-medium text-brand mb-1">
                            {comment.author?.first_name} {comment.author?.last_name} (Staff)
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm text-slate-800">{comment.body}</p>
                        <div className="text-[11px] text-slate-400 mt-2 text-right">
                          {formatDateTime(comment.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Reply Box */}
            {ticket.status !== "closed" && ticket.status !== "resolved" ? (
              <form onSubmit={handleSendComment} className="relative">
                <textarea 
                  placeholder="Type your reply here..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full pr-12 pb-12 min-h-[120px] bg-white rounded-xl border-line-2 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none p-4"
                  disabled={createCommentMutation.isPending}
                />
                <div className="absolute bottom-3 right-3">
                  <button 
                    type="submit" 
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    className="w-8 h-8 rounded-full bg-brand hover:bg-brand/90 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-muted text-sm">
                This ticket is marked as {ticket.status.replace("_", " ")}. Re-open the ticket to add new replies.
              </div>
            )}
          </div>

          {/* Sidebar Admin Controls */}
          <div className="space-y-6">
            <div className="card space-y-5 p-6">
              <h3 className="font-serif text-lg border-b border-line-2 pb-3">Admin Controls</h3>
              
              <div>
                <label className="text-xs text-muted mb-1 uppercase tracking-wider block">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="input py-2 bg-white"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 uppercase tracking-wider block">Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="input py-2 bg-white"
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-muted mb-1 uppercase tracking-wider block">Assigned To</label>
                <select
                  value={ticket.assigned_to?.id?.toString() ?? ""}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="input py-2 bg-white"
                >
                  <option value="">Unassigned</option>
                  {teamData?.users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="pt-3 border-t border-line-2">
                <div className="text-xs text-muted mb-1 uppercase tracking-wider">Customer</div>
                <div className="font-medium text-sm">
                  Customer ID: {ticket.customer || "N/A"}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
