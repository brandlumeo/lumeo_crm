"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";
import { api } from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hi! I'm Lumeo AI, your intelligent CRM assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post("/crm/ai-chat/", {
        message: userMsg.content, 
        history: messages.slice(-5)
      });
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: response.data.reply || "Sorry, I couldn't process that." 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: "Error connecting to AI backend. Please check your API key." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-ink text-paper rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-50 ${isOpen ? "hidden" : ""}`}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-paper border border-line rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-rise">
          {/* Header */}
          <div className="bg-ink text-paper px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-medium text-[15px]">Lumeo AI</h3>
                <p className="text-[11px] opacity-70">Powered by Gemini</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 bg-bone-2 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-ink text-paper" : "bg-accent text-white"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[13.5px] leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-ink text-paper rounded-tr-sm" 
                    : "bg-paper border border-line text-ink rounded-tl-sm shadow-sm whitespace-pre-wrap"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 bg-paper border border-line rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-paper border-t border-line">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask your AI Copilot..."
                className="w-full bg-bone border border-line rounded-full pl-4 pr-12 py-3 text-[13.5px] outline-none focus:border-ink transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-ink text-paper rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-ink-2 transition-colors"
              >
                <Send className="w-4 h-4 -ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
