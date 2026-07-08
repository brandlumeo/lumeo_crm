"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileSignature, Loader2, CheckCircle, XCircle, Shield, 
  Hash, Save
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ContractSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [contractPrefix, setContractPrefix] = useState(company?.contract_prefix ?? "CONT");
  const [contractNumberSeparator, setContractNumberSeparator] = useState(company?.contract_number_separator ?? "#");
  const [contractNumberDigits, setContractNumberDigits] = useState(company?.contract_number_digits ?? 3);

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Contract settings updated successfully." });
      setTimeout(() => setMsg(null), 4000);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update contract settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  // Generate example
  const exampleDigits = String(1).padStart(contractNumberDigits, '0');
  const contractNumberExample = `${contractPrefix}${contractNumberSeparator}${exampleDigits}`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line sticky top-0 bg-bone/80 backdrop-blur-md z-10 -mx-6 px-6 pt-6 -mt-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <FileSignature className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Contract Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure your contract numbering formats.
            </p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify contract settings.</span>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 via-blue-500 to-sky-500"></div>
        
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            
            {/* Contract Prefix */}
            <div className="space-y-2">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-1.5">
                Contract Prefix <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={contractPrefix}
                onChange={(e) => setContractPrefix(e.target.value)}
                disabled={!isAdmin}
                className="input w-full h-11 bg-bone/30 focus:bg-paper font-mono text-sm uppercase"
                placeholder="CONT"
              />
            </div>

            {/* Contract Number Separator */}
            <div className="space-y-2">
              <label className="text-[13.5px] font-medium text-ink">
                Contract Number Separator
              </label>
              <input
                type="text"
                value={contractNumberSeparator}
                onChange={(e) => setContractNumberSeparator(e.target.value)}
                disabled={!isAdmin}
                className="input w-full h-11 bg-bone/30 focus:bg-paper font-mono text-sm text-center"
                placeholder="#"
              />
            </div>

            {/* Contract Number Digits */}
            <div className="space-y-2">
              <label className="text-[13.5px] font-medium text-ink">
                Contract Number Digits
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={contractNumberDigits}
                onChange={(e) => setContractNumberDigits(Number(e.target.value))}
                disabled={!isAdmin}
                className="input w-full h-11 bg-bone/30 focus:bg-paper font-mono text-sm text-center"
                placeholder="3"
              />
            </div>

            {/* Contract Number Example */}
            <div className="space-y-2">
              <label className="text-[13.5px] font-medium text-ink">
                Contract Number Example
              </label>
              <div className="w-full h-11 bg-bone/50 border border-line rounded-lg flex items-center px-4 font-mono text-sm text-ink-2 shadow-inner">
                {contractNumberExample}
              </div>
            </div>

          </div>
          
          {isAdmin && (
            <div className="pt-6">
              <button
                onClick={() => mutation.mutate({
                  contract_prefix: contractPrefix,
                  contract_number_separator: contractNumberSeparator,
                  contract_number_digits: contractNumberDigits
                })}
                disabled={mutation.isPending}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-md hover:shadow-lg transition-all h-10 px-6 rounded-lg font-medium flex items-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Save</>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
