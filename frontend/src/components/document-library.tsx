"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, UploadCloud, Download, Paperclip } from "lucide-react";

import { uploadAttachment } from "@/lib/api";
import { useAttachments } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DocumentLibrary({
  entityId,
  entityType,
}: {
  entityId: number;
  entityType: "lead" | "deal" | "customer";
}) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params: Record<string, any> = {};
  params[entityType] = entityId;

  const { data, isLoading } = useAttachments(params);

  const mutation = useMutation({
    mutationFn: uploadAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "attachments"] });
    },
  });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Support multiple files by iterating
    Array.from(files).forEach(file => {
      const formData = new FormData();
      formData.append(entityType, entityId.toString());
      formData.append("file", file);
      mutation.mutate(formData);
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const attachments = data?.results ?? [];

  return (
    <div className="card animate-rise" style={{ animationDelay: "100ms" }}>
      <div className="card-head">
        <div className="card-title">Document Library</div>
      </div>

      <div className="p-5 border-b border-line">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging 
              ? "border-accent bg-accent-soft/30" 
              : "border-line bg-bone hover:border-ink/30 hover:bg-bone-2"
          }`}
        >
          <UploadCloud className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-accent' : 'text-muted'}`} strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-ink mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted">
            PDF, DOCX, Images, and spreadsheets
          </p>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        
        {mutation.isPending && (
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-2 bg-bone-2 p-3 rounded-lg border border-line">
            <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin"></div>
            Uploading document...
          </div>
        )}
      </div>

      <div className="p-0 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-muted text-sm py-8">Loading documents...</div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8">
            <Paperclip className="w-8 h-8 mx-auto text-muted mb-2 opacity-40" />
            <div className="text-sm text-muted">No documents uploaded yet.</div>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {attachments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-bone-2 transition-colors group">
                <div className="w-10 h-10 bg-paper border border-line rounded-lg grid place-items-center shrink-0">
                  <FileText className="w-5 h-5 text-muted" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[13px] font-medium text-ink hover:text-accent hover:underline truncate block"
                  >
                    {doc.file_name}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDateTime(doc.created_at)}</span>
                    <span>•</span>
                    <span>{doc.uploaded_by?.first_name || doc.uploaded_by?.username || 'System'}</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <a 
                    href={doc.file_url} 
                    download
                    target="_blank"
                    className="p-1.5 text-muted hover:text-ink hover:bg-line-2 rounded-md transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
