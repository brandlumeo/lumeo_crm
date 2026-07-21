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
          <div className="lg:col-span-2 flex flex-col max-h-[70vh]">
            <div className="card flex flex-col flex-1 overflow-hidden shadow-sm border border-line/60 bg-white p-0">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-gradient-to-b from-bone/10 to-bone/30">
                {/* Original Ticket Description */}
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-medium shrink-0 text-sm border border-accent/20">
                    Client
                  </div>
                  <div className="flex flex-col gap-1 items-start max-w-[85%]">
                    <div className="bg-white border border-line shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-ink">
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{ticket.description}</p>
                    </div>
                    <div className="text-[11px] text-muted font-medium px-1">
                      {formatDateTime(ticket.created_at)}
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {isLoadingComments ? (
                  <div className="text-center text-muted py-4 animate-pulse">Loading conversation...</div>
                ) : (
                  comments?.map((comment) => {
                    const isStaff = comment.author?.role !== "CUSTOMER";
                    const isMe = comment.author?.id === currentUser?.id;
                    return (
                      <div key={comment.id} className={`flex gap-4 ${isStaff ? "flex-row-reverse" : ""}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium shrink-0 text-sm border ${
                          isStaff 
                            ? "bg-ink text-bone border-ink"
                            : "bg-accent/10 text-accent border-accent/20"
                        }`}>
                          {isMe ? "You" : (comment.author?.first_name?.[0] || "C")}
                        </div>
                        <div className={`flex flex-col gap-1 max-w-[85%] ${isStaff ? "items-end" : "items-start"}`}>
                          {!isMe && (
                            <div className="text-[12px] font-medium text-ink px-1 flex items-center gap-2">
                              {comment.author?.first_name} {comment.author?.last_name}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${isStaff ? "bg-bone-2 text-muted" : "bg-accent/10 text-accent"}`}>
                                {isStaff ? "Staff" : "Client"}
                              </span>
                            </div>
                          )}
                          <div className={`px-4 py-3 shadow-sm ${
                            isStaff 
                              ? "bg-ink text-white rounded-2xl rounded-tr-sm"
                              : "bg-white border border-line rounded-2xl rounded-tl-sm text-ink"
                          }`}>
                            <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{comment.body}</p>
                          </div>
                          <div className="text-[11px] text-muted font-medium px-1">
                            {formatDateTime(comment.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} className="h-2" />
              </div>

              {/* Reply Box */}
              <div className="p-4 bg-white border-t border-line/60">
                {ticket.status !== "closed" && ticket.status !== "resolved" ? (
                  <form onSubmit={handleSendComment} className="relative flex flex-col gap-3">
                    <textarea 
                      placeholder="Type your reply here..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full resize-none min-h-[100px] p-4 text-[14px] bg-bone-2/50 border border-line rounded-xl focus:bg-white focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none"
                      disabled={createCommentMutation.isPending}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted">Press Enter to add a new line</span>
                      <button 
                        type="submit" 
                        disabled={!newComment.trim() || createCommentMutation.isPending}
                        className="btn btn-primary rounded-lg pl-4 pr-3 py-2 flex items-center gap-2 shadow-sm"
                      >
                        {createCommentMutation.isPending ? "Sending..." : "Send Reply"} 
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-3 px-4 bg-bone-2 rounded-xl text-center text-muted text-[13px] font-medium border border-line/50">
                    This ticket is marked as {ticket.status.replace("_", " ")}. Re-open the ticket to add new replies.
                  </div>
                )}
              </div>
            </div>
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
