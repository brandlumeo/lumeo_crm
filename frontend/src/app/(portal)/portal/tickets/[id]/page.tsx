"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { useTicket, useTicketComments, useCreateTicketComment } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = Number(params.id);
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: ticket, isLoading: isLoadingTicket } = useTicket(ticketId);
  const { data: comments, isLoading: isLoadingComments } = useTicketComments(ticketId);
  
  const createCommentMutation = useCreateTicketComment();
  const [newComment, setNewComment] = useState("");
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when comments load
  useEffect(() => {
    if (comments) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  if (!mounted) return null;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate(
      { ticketId, payload: { content: newComment } },
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

  if (isLoadingTicket) {
    return <div className="p-8 text-center text-muted">Loading ticket details...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl mb-4">Ticket not found</h2>
        <Link href="/portal/tickets" className="btn btn-primary">Go back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <Link href="/portal/tickets" className="text-sm font-medium text-muted hover:text-ink flex items-center gap-2 w-fit">
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
          <div className="card space-y-6 min-h-[400px] max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col relative">
            
            {/* Original Ticket Description */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center font-medium shrink-0">
                You
              </div>
              <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-none p-4 border border-white/5">
                <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
                <div className="text-[11px] text-muted mt-2 text-right">
                  {formatDateTime(ticket.created_at)}
                </div>
              </div>
            </div>

            {/* Comments */}
            {isLoadingComments ? (
              <div className="text-center text-muted py-4">Loading conversation...</div>
            ) : (
              comments?.map((comment) => {
                const isCustomer = comment.author?.role === "CUSTOMER";
                return (
                  <div key={comment.id} className={`flex gap-4 ${isCustomer ? "" : "flex-row-reverse"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium shrink-0 ${
                      isCustomer ? "bg-brand/20 text-brand" : "bg-white/10 text-white"
                    }`}>
                      {isCustomer ? "You" : (comment.author?.first_name?.[0] || "S")}
                    </div>
                    <div className={`flex-1 max-w-[85%] rounded-2xl p-4 border ${
                      isCustomer 
                        ? "bg-white/5 border-white/5 rounded-tl-none" 
                        : "bg-[#1a1a1a] border-white/10 rounded-tr-none"
                    }`}>
                      {!isCustomer && (
                        <div className="text-xs font-medium text-white mb-1">
                          {comment.author?.first_name} {comment.author?.last_name}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                      <div className="text-[11px] text-muted mt-2 text-right">
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
              <Textarea 
                placeholder="Type your reply here..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full pr-12 pb-12 min-h-[120px] bg-[#0a0a0a]"
                disabled={createCommentMutation.isPending}
              />
              <div className="absolute bottom-3 right-3">
                <button 
                  type="submit" 
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  className="w-8 h-8 rounded-full bg-brand hover:bg-brand/90 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-muted text-sm">
              This ticket is marked as {ticket.status.replace("_", " ")}. You cannot add new replies.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <h3 className="font-serif text-lg mb-4">Ticket Details</h3>
            
            <div>
              <div className="text-xs text-muted mb-1 uppercase tracking-wider">Priority</div>
              <div className="capitalize">{ticket.priority}</div>
            </div>
            
            <div>
              <div className="text-xs text-muted mb-1 uppercase tracking-wider">Status</div>
              <div className="capitalize">{ticket.status.replace("_", " ")}</div>
            </div>
            
            <div>
              <div className="text-xs text-muted mb-1 uppercase tracking-wider">Assigned To</div>
              <div>
                {ticket.assigned_to 
                  ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`.trim() || ticket.assigned_to.email 
                  : "Unassigned"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
