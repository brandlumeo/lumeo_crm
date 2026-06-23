"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Strikethrough, Heading2 } from "lucide-react";
import DOMPurify from "dompurify";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Start typing..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] p-3 text-[13px] text-ink",
      },
    },
  });

  if (!editor) {
    return <div className="h-[140px] w-full border border-line rounded-md bg-paper animate-pulse" />;
  }

  return (
    <div className="border border-line rounded-md bg-paper overflow-hidden focus-within:border-ink transition-colors">
      <div className="border-b border-line bg-bone-2/50 px-2 py-1.5 flex flex-wrap gap-1 items-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("bold") ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink hover:bg-line/50"}`}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("italic") ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink hover:bg-line/50"}`}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("strike") ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink hover:bg-line/50"}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-line mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink hover:bg-line/50"}`}
          title="Heading"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList") ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink hover:bg-line/50"}`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("orderedList") ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink hover:bg-line/50"}`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} className="cursor-text bg-paper" />
    </div>
  );
}

export function RichTextDisplay({ content, className = "" }: { content: string; className?: string }) {
  if (!content) return null;
  // Use DOMPurify to sanitize HTML content safely
  const cleanHtml = DOMPurify.sanitize(content);
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-ink text-[13px] ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
