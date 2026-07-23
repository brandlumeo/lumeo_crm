import React, { useState } from "react";
import { Sparkles, Bot, ChevronDown, ChevronUp, Copy, CheckCircle2 } from "lucide-react";
import { aiAssistantAction } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import DOMPurify from "dompurify";

interface AIExecutiveBriefProps {
  timelineData: any[];
}

export function AIExecutiveBrief({ timelineData }: AIExecutiveBriefProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateBriefMutation = useMutation({
    mutationFn: async () => {
      // Create a massive context string from the timeline
      const context = timelineData
        .map((item) => {
          if (item._kind === "email") {
            return `[Email] ${item.subject}: ${item.body_text}`;
          }
          return `[${item.activity_type}] ${item.description}`;
        })
        .join("\n---\n");

      const res = await aiAssistantAction({
        action: "executive_brief",
        context: context.substring(0, 5000), // Limit context size
      });
      return res.result;
    },
    onSuccess: (data) => {
      setBrief(data);
      setIsExpanded(true);
    },
  });

  const handleCopy = () => {
    if (brief) {
      navigator.clipboard.writeText(brief);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="mb-6">
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 overflow-hidden shadow-sm relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Bot className="w-24 h-24" />
        </div>
        
        <div className="p-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-indigo-950 flex items-center gap-2">
                AI Executive Brief
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider">Beta</span>
              </h3>
              <p className="text-xs text-indigo-900/60 mt-0.5">Generate a smart summary of the entire timeline</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!brief) {
                generateBriefMutation.mutate();
              } else {
                setIsExpanded(!isExpanded);
              }
            }}
            disabled={generateBriefMutation.isPending || timelineData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold shadow-sm border border-indigo-100 transition-all disabled:opacity-50"
          >
            {generateBriefMutation.isPending ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </>
            ) : brief ? (
              <>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? "Hide Brief" : "View Brief"}
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                Generate Brief
              </>
            )}
          </button>
        </div>

        {isExpanded && brief && (
          <div className="border-t border-indigo-100 bg-white/60 backdrop-blur-sm p-5 relative z-10">
            <div 
              className="prose prose-sm prose-indigo max-w-none text-[13px] text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  brief.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />')
                )
              }}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
