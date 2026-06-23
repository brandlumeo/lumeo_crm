"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, NotebookPen } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { createNote } from "@/lib/api";
import { useNotePage } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { SkeletonTable } from "@/components/skeleton-table";
import { RichTextEditor, RichTextDisplay } from "@/components/rich-text-editor";

const PAGE_SIZE = 20;

export default function NotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ content: string; [key: string]: any }>({ content: "" });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useNotePage({
    page,
    search,
    ordering: "-updated_at",
  });

  const mutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      setForm({ content: "" });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Notes"
      title="Searchable memory."
      description="Lumeo keeps free-form context close to the rest of your CRM records. Search updates, record new notes, and keep the workspace readable."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Notes archive
              <span className="card-title-meta">{data?.count ?? 0} total notes</span>
            </div>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="input sm:w-[260px]"
              placeholder="Search note content"
            />
          </div>

          {!mounted || (isLoading && !data) ? (
            <SkeletonTable columns={2} rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No notes found"
              description="Create a note on the right, or widen the current search."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "content",
                  header: "Note",
                  render: (note) => (
                    <div className="max-w-[520px]">
                      <RichTextDisplay content={note.content} />
                    </div>
                  ),
                },
                {
                  key: "updated_at",
                  header: "Updated",
                  render: (note) => formatDateTime(note.updated_at),
                },
              ]}
              rows={rows}
              count={data?.count ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>

        <div className="card animate-rise">
          <div className="card-head">
            <div className="card-title">
              New note
              <span className="card-title-meta">Workspace context</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(form);
            }}
          >
            <div>
              <span className="label">Content</span>
              <RichTextEditor
                value={form.content}
                onChange={(content) => setForm({ content })}
                placeholder="Capture call outcomes, procurement blockers, next steps, and internal context here."
              />
            </div>

            {mutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not create note. Check the data and try again.
              </div>
            ) : null}

            <button type="submit" disabled={mutation.isPending} className="btn btn-primary w-full justify-center">
              {mutation.isPending ? "Creating..." : "Create note"}
            </button>

            <div className="surface-muted p-4 text-[12px] text-muted flex items-start gap-2">
              <NotebookPen className="w-4 h-4 mt-0.5 text-ink-2" />
              Notes are shared across the organization. Dynamic linking to deals, leads, and customer profiles can be enabled as your team scales.
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
