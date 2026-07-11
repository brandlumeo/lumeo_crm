"use client";

import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/api";
import { jwtDecode } from "jwt-decode";

export default function MaintenancePage() {
  const [isSuperuser, setIsSuperuser] = useState(false);

  useEffect(() => {
    // If the user happens to be a superuser, they can bypass this page
    const token = getAccessToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.is_superuser) {
          setIsSuperuser(true);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-md w-full flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] flex items-center justify-center mb-4">
          <Construction className="w-10 h-10 text-indigo-400" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Under Maintenance</h1>
          <p className="text-white/60 text-base md:text-lg leading-relaxed">
            We are currently upgrading the Lumeo platform to bring you better features and performance. We'll be back online shortly.
          </p>
        </div>

        {isSuperuser && (
          <div className="mt-8 pt-8 border-t border-white/10 w-full flex flex-col items-center gap-4">
            <p className="text-indigo-400/80 text-sm font-medium">Superadmin Bypass Access</p>
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
