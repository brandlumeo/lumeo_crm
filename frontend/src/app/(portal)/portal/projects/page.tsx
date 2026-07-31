"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchProjects } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { useRouter } from "next/navigation";

export default function PortalProjectsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-projects"],
    queryFn: () => fetchProjects(),
  });

  if (!mounted) return null;

  const projects = data?.results || [];

  return (
    <div className="space-y-6 animate-rise relative">
      <Link href="/portal" className="text-sm font-medium text-muted hover:text-ink flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-[32px] leading-none mb-2">Projects</h1>
          <p className="text-muted text-lg">Track your current and past projects.</p>
        </div>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <SkeletonTable columns={4} rows={5} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No projects yet"
            description="You don't have any active projects at the moment."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                <tr className="text-muted text-left">
                  <th className="p-3 font-medium">Project Name</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Start Date</th>
                  <th className="p-3 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
              {projects.map((p: any) => (
                <tr 
                  key={p.id} 
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 capitalize">
                    <span className={`chip chip-positive`}>
                      Active
                    </span>
                  </td>
                  <td className="p-3 capitalize">{p.start_date || "-"}</td>
                  <td className="p-3 text-right text-muted">{formatDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
