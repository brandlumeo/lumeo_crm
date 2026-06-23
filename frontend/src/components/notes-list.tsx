import Link from "next/link";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { RichTextDisplay } from "@/components/rich-text-editor";
import type { Note } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

export function NotesList({ notes }: { notes: Note[] }) {
  return (
    <div className="card animate-rise">
      <div className="card-head">
        <div className="card-title">Recent notes</div>
        <Link href="/notes" className="btn px-2.5 py-1 text-xs">
          View notes
        </Link>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Call notes, follow-up context, and meeting summaries will surface here once your team starts capturing them."
        />
      ) : (
        <div>
          {notes.map((note) => (
            <div
              key={note.id}
              className="px-5 py-3.5 border-b border-line-2 last:border-b-0 hover:bg-bone-2 transition-colors"
            >
              <div className="flex items-center justify-between mb-1 gap-3">
                <div className="text-[13px] font-medium text-ink">
                  Note #{note.id}
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {formatShortDate(note.updated_at)}
                </div>
              </div>
              <div className="text-[12.5px] text-muted leading-relaxed line-clamp-3">
                <RichTextDisplay content={note.content} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
