"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Search, MessageSquare, Loader2, User } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { api } from "@/lib/api";

function timeAgoShort(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function WhatsappInbox() {
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [msgBody, setMsgBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["whatsapp-messages"],
    queryFn: async () => {
      const { data } = await api.get("/crm/whatsapp-messages/");
      return Array.isArray(data) ? data : (data.results || []);
    },
    refetchInterval: 5000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await api.get("/crm/leads/");
      return Array.isArray(data) ? data : (data.results || []);
    },
  });

  // Group messages by lead
  const convos = leads.map((lead: any) => {
    const leadMsgs = messages.filter((m: any) => m.lead_id === lead.id || m.lead === lead.id);
    return {
      lead,
      messages: leadMsgs,
      lastMessage: leadMsgs[leadMsgs.length - 1],
    };
  }).filter((c: any) => c.messages.length > 0);

  // Sort by latest message
  convos.sort((a: any, b: any) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
  });

  const activeConvo = convos.find((c: any) => c.lead.id === activeLeadId);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeLeadId || !msgBody.trim()) return Promise.reject();
      return api.post("/crm/whatsapp-messages/send_message/", {
        lead_id: activeLeadId,
        content: msgBody
      });
    },
    onSuccess: () => {
      setMsgBody("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConvo?.messages]);

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[350px] bg-paper border border-line rounded-xl shadow-sm overflow-hidden">
      
      {/* Left: Sidebar */}
      <div className="w-full md:w-80 border-r border-line flex flex-col bg-bone/30 shrink-0">
        <div className="p-4 border-b border-line flex items-center justify-between bg-paper">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            WhatsApp 
            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Beta</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loadingMsgs ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>
          ) : convos.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No WhatsApp messages yet.</p>
            </div>
          ) : (
            convos.map((conv: any) => {
              const isSelected = conv.lead.id === activeLeadId;
                
              return (
                <button
                  key={conv.lead.id}
                  onClick={() => setActiveLeadId(conv.lead.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    isSelected ? "bg-accent/10 text-accent shadow-sm" : "hover:bg-bone text-ink"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full grid place-items-center text-sm font-semibold shrink-0 shadow-sm",
                    isSelected ? "bg-accent text-white" : "bg-paper border border-line text-ink-2"
                  )}>
                    {getInitials(conv.lead.name || 'Unknown')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={cn("font-medium text-[13.5px] truncate", isSelected ? "text-accent" : "text-ink")}>
                        {conv.lead.name}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted whitespace-nowrap ml-2">
                          {timeAgoShort(conv.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-xs truncate", isSelected ? "text-accent/80" : "text-muted")}>
                      {conv.lastMessage?.content || "..."}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Chat Window */}
      <div className="flex-1 flex flex-col bg-paper relative">
        {activeConvo ? (
          <>
            <div className="p-4 border-b border-line flex items-center justify-between shrink-0 bg-bone/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent text-white grid place-items-center text-xs font-semibold shadow-sm">
                  {getInitials(activeConvo.lead.name || 'Unknown')}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-ink">{activeConvo.lead.name}</h3>
                  <p className="text-[11px] text-muted">{activeConvo.lead.mobile || 'No phone number'}</p>
                </div>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_14px]"
            >
              {activeConvo.messages.map((msg: any, i: number) => {
                const isMe = msg.direction === 'outbound';
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-[13.5px] leading-relaxed relative group",
                      isMe 
                        ? "bg-accent text-white rounded-br-sm" 
                        : "bg-bone-2 text-ink rounded-bl-sm border border-line"
                    )}>
                      {msg.content}
                      <div className={cn(
                        "text-[9px] mt-1 text-right",
                        isMe ? "text-white/70" : "text-muted"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && msg.status && <span className="ml-1 capitalize">({msg.status})</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-line shrink-0 bg-paper">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMutation.mutate();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-bone border border-line rounded-full px-4 py-2.5 text-sm outline-none focus:border-ink transition-colors"
                  disabled={sendMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!msgBody.trim() || sendMutation.isPending}
                  className="w-10 h-10 rounded-full bg-accent text-white grid place-items-center hover:bg-accent/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-muted">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bone grid place-items-center mx-auto mb-4 border border-line">
                <MessageSquare className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-sm font-medium text-ink">Your Messages</h3>
              <p className="text-xs max-w-[200px] mt-1 leading-relaxed">
                Select a lead to view their WhatsApp history or reply.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
