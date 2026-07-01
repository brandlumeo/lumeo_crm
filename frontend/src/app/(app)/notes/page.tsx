"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, NotebookPen, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { createNote, updateNote, deleteNote } from "@/lib/api";
import { useNotePage } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { SkeletonTable } from "@/components/skeleton-table";
import { RichTextEditor, RichTextDisplay } from "@/components/rich-text-editor";

const PAGE_SIZE = 20;

export default function NotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ content: string; [key: string]: any }>({ content: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Modals state
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useNotePage({
    page,
    search,
    ordering: "-updated_at",
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["crm"] });
    void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
  };

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      setForm({ content: "" });
      toast.success("Note created.");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<any> }) => updateNote(payload.id, payload.data),
    onSuccess: () => {
      setForm({ content: "" });
      setEditingId(null);
      toast.success("Note updated.");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      toast.success("Note deleted.");
      setNoteToDelete(null);
      invalidate();
    },
    onError: () => {
      setNoteToDelete(null);
    }
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
                {
                  key: "actions",
                  header: "",
                  className: "w-[90px] text-right",
                  render: (note) => (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(note.id);
                          setForm({ content: note.content });
                        }}
                        className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors"
                        title="Edit note"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note.id);
                        }}
                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors !block !opacity-100 !visible"
                        style={{ display: "flex", visibility: "visible", opacity: 1 }}
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ),
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

        <div className="card animate-rise h-fit sticky top-[104px]">
          <div className="card-head">
            <div className="card-title">
              {editingId ? "Edit note" : "New note"}
              <span className="card-title-meta">Workspace context</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (editingId) {
                setShowEditConfirm(true);
              } else {
                createMutation.mutate(form);
              }
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

            {createMutation.isError || updateMutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not save note. Check the data and try again.
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn btn-primary flex-1 justify-center"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingId
                  ? "Save changes"
                  : "Create note"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ content: "" });
                  }}
                  className="btn btn-secondary px-3"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="surface-muted p-4 text-[12px] text-muted flex items-start gap-2">
              <NotebookPen className="w-4 h-4 mt-0.5 text-ink-2" />
              Notes are shared across the organization. Dynamic linking to deals, leads, and customer profiles can be enabled as your team scales.
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        open={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete !== null) {
            deleteMutation.mutate(noteToDelete);
          }
        }}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete Note"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <ConfirmationModal
        open={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={() => {
          if (editingId) {
            updateMutation.mutate({ id: editingId, data: form });
            setShowEditConfirm(false);
          }
        }}
        title="Save Changes"
        description="Are you sure you want to update this note's content? The previous version will be permanently replaced."
        confirmText="Save changes"
        variant="warning"
        loading={updateMutation.isPending}
      />
    </PageShell>
  );
}
