"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, LayoutList, FolderKanban } from "lucide-react";
import { useProject } from "@/lib/queries";
import { PageShell } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { formatDateTime } from "@/lib/utils";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id, 10);
  
  const { data: project, isLoading, error } = useProject(projectId);

  if (isLoading) {
    return (
      <PageShell
        eyebrow="Projects"
        title="Loading..."
        description="Fetching project details from your workspace..."
      >
        <div className="p-6 text-muted font-sans text-xs">Loading project details...</div>
      </PageShell>
    );
  }

  if (error || !project) {
    return (
      <PageShell
        eyebrow="Projects"
        title="Not Found"
        description="The requested project is not available or has been moved."
      >
        <div className="p-6 text-muted font-sans text-xs">Project not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={project.name}
      eyebrow="Project Details"
      description="Manage communications, timelines, documentation, and tasks for this project."
    >
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center text-[13px] text-muted hover:text-ink transition-colors font-medium px-3 py-1.5 bg-bone-2 border border-line rounded-md">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to projects
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card animate-rise">
            <div className="p-6 border-b border-line flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-bone-2 rounded-full grid place-items-center mb-3 border border-line shadow-sm">
                <FolderKanban className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <h2 className="text-[22px] font-serif text-ink tracking-tight">{project.name}</h2>
              <span className="mt-2 chip bg-surface-muted text-ink-2 border-line">
                {project.status?.replaceAll("_", " ")}
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              {project.customer && (
                <div className="flex items-center gap-3 text-[13px]">
                  <LayoutList className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">
                    Client: <Link href={`/customers/${project.customer.id}`} className="hover:underline">{project.customer.name}</Link>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Added: {formatDateTime(project.created_at)}</span>
              </div>
              {project.start_date && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Calendar className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">Start: {formatDateTime(project.start_date)}</span>
                </div>
              )}
              {project.end_date && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Calendar className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">Deadline: {formatDateTime(project.end_date)}</span>
                </div>
              )}
              
              <div className="pt-2">
                <div className="flex justify-between text-[11px] text-muted mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-1.5">
                  <div 
                    className="bg-accent h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <CustomFieldsDisplay modelName="project" customData={project.custom_data} />
        </div>

        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={project.id} entityType="project" />
          <DocumentLibrary entityId={project.id} entityType="project" />
        </div>
      </div>
    </PageShell>
  );
}
