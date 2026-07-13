"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Users, UserCircle, Search, MessageSquare, Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { cn, getInitials } from "@/lib/utils";
import { commsApi, type Conversation, type Message } from "@/lib/api-communications";
import { useCurrentUser } from "@/lib/queries";
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

export default function InboxPage() {
  const { data: user } = useCurrentUser();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [msgBody, setMsgBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ["conversations"],
    queryFn: commsApi.getConversations,
    refetchInterval: 10000, // poll every 10s
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["messages", activeConvId],
    queryFn: () => (activeConvId ? commsApi.getMessages(activeConvId) : Promise.resolve([])),
    enabled: !!activeConvId,
    refetchInterval: 5000, // poll every 5s
  });

  // Team search for new DM
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const { data: team = [] } = useQuery({
    queryKey: ["team", searchQ],
    queryFn: async () => {
      const { data } = await api.get<{ users: any[] }>("/accounts/team/");
      return data.users.filter((m: any) => 
        (m.first_name + " " + m.last_name).toLowerCase().includes(searchQ.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQ.toLowerCase())
      );
    },
    enabled: searchOpen,
  });

  const startDmMutation = useMutation({
    mutationFn: (userId: number) => commsApi.startDirect(userId),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSearchOpen(false);
      setActiveConvId(conv.id);
    }
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!activeConvId || !msgBody.trim()) return Promise.reject();
      return commsApi.sendMessage(activeConvId, msgBody);
    },
    onSuccess: () => {
      setMsgBody("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <PageShell title="Inbox" description="Internal team messages & communications">
      <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-paper border border-line rounded-xl shadow-sm overflow-hidden">
        
        {/* Left: Sidebar */}
        <div className="w-full md:w-80 border-r border-line flex flex-col bg-bone/30 shrink-0">
          <div className="p-4 border-b border-line flex items-center justify-between bg-paper">
            <h2 className="font-semibold text-ink">Messages</h2>
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-8 h-8 rounded-md bg-ink text-paper grid place-items-center hover:bg-ink-2 transition-colors"
              title="New Message"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>

          {searchOpen && (
            <div className="p-3 border-b border-line bg-paper">
              <input
                autoFocus
                type="text"
                placeholder="Search team member..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="w-full bg-bone-2 border border-line rounded-md px-3 py-2 text-sm text-ink outline-none"
              />
              <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                {team.filter(m => m.id !== user?.id).map(m => (
                  <button
                    key={m.id}
                    onClick={() => startDmMutation.mutate(m.id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-bone rounded-md text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-line grid place-items-center text-xs font-medium shrink-0">
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium text-ink truncate">{m.first_name} {m.last_name}</div>
                      <div className="text-[11px] text-muted truncate">{m.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loadingConvs ? (
              <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet.</p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = conv.id === activeConvId;
                const displayName = conv.type === 'DIRECT' 
                  ? (conv.other_user ? `${conv.other_user.first_name} ${conv.other_user.last_name}` : 'Unknown User')
                  : (conv.name || 'Group Chat');
                  
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                      isSelected ? "bg-paper shadow-sm border border-line" : "hover:bg-bone border border-transparent"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-bone-2 border border-line grid place-items-center text-sm font-medium shrink-0">
                      {conv.type === 'GROUP' ? <Users className="w-4 h-4 text-muted" /> : displayName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm truncate", isSelected ? "font-semibold text-ink" : "font-medium text-ink-2")}>
                          {displayName}
                        </span>
                        {conv.latest_message && (
                          <span className="text-[10px] text-muted shrink-0">
                            {timeAgoShort(conv.latest_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={cn("text-xs truncate", conv.unread_count > 0 ? "font-medium text-ink" : "text-muted")}>
                          {conv.latest_message?.body || "No messages"}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Chat Window */}
        <div className="flex-1 flex flex-col min-w-0 bg-paper">
          {activeConvId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-line flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-bone border border-line grid place-items-center text-sm font-medium">
                  {activeConv?.type === 'GROUP' ? <Users className="w-5 h-5 text-muted" /> : activeConv?.other_user?.first_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-ink">
                    {activeConv?.type === 'DIRECT' 
                      ? `${activeConv?.other_user?.first_name} ${activeConv?.other_user?.last_name}`
                      : activeConv?.name || 'Group Chat'}
                  </h3>
                  <p className="text-xs text-muted">
                    {activeConv?.type === 'DIRECT' ? activeConv?.other_user?.email : `${activeConv?.participants?.length} participants`}
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted text-sm">
                    Say hello!
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.sender.id === user?.id;
                    const showAvatar = i === messages.length - 1 || messages[i+1].sender.id !== msg.sender.id;
                    
                    return (
                      <div key={msg.id} className={cn("flex items-end gap-2 max-w-[80%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                        {!isMe && (
                          <div className={cn("w-7 h-7 rounded-full bg-bone-2 grid place-items-center text-[10px] font-medium shrink-0", !showAvatar && "invisible")}>
                            {msg.sender.first_name?.[0]}
                          </div>
                        )}
                        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                          {!isMe && showAvatar && (
                            <span className="text-[10px] text-muted mb-1 ml-1">{msg.sender.first_name}</span>
                          )}
                          <div className={cn(
                            "px-4 py-2 text-sm rounded-2xl",
                            isMe ? "bg-ink text-paper rounded-br-sm" : "bg-bone-2 text-ink rounded-bl-sm"
                          )}>
                            {msg.body}
                          </div>
                          <span className="text-[10px] text-muted/60 mt-1 mx-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-line bg-bone/30 shrink-0">
                <form 
                  onSubmit={e => { e.preventDefault(); sendMutation.mutate(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    className="flex-1 bg-paper border border-line rounded-full px-4 py-2.5 text-sm outline-none focus:border-ink transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={!msgBody.trim() || sendMutation.isPending}
                    className="w-10 h-10 rounded-full bg-accent text-white grid place-items-center hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted p-8 text-center bg-bone/10">
              <div className="w-16 h-16 rounded-2xl bg-bone-2 grid place-items-center mb-4">
                <MessageSquare className="w-8 h-8 text-muted/50" />
              </div>
              <h3 className="text-lg font-serif text-ink mb-2">Your Inbox</h3>
              <p className="text-sm max-w-sm">
                Select a conversation on the left to start messaging, or click the new message icon to start a chat with a team member.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
