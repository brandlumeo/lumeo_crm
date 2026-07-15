"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, CheckCircle, Plus, Copy, ExternalLink, Trash2, Blocks } from "lucide-react";
import { useCurrentCompany, useUpdateCompany } from "@/lib/queries";

export function CustomLinkSettingsForm() {
  const { data: company, isLoading } = useCurrentCompany();
  const updateCompany = useUpdateCompany();
  
  const [links, setLinks] = useState<{ id: number; label: string; url: string; type: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", url: "", type: "website" });
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (company?.custom_links) {
      setLinks(company.custom_links);
    }
  }, [company?.custom_links]);

  type LinkType = { id: string; label: string; gradient: string; bg: string; border: string; color: string; placeholder: string; icon: React.ReactNode };

  const LINK_TYPES: LinkType[] = [
    {
      id: "website",
      label: "Website",
      gradient: "from-blue-400 to-indigo-500",
      bg: "bg-blue-50", border: "border-blue-200", color: "text-blue-700",
      placeholder: "https://yourcompany.com",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      ),
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      gradient: "from-blue-600 to-blue-700",
      bg: "bg-blue-50", border: "border-blue-200", color: "text-blue-700",
      placeholder: "https://linkedin.com/company/...",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
      ),
    },
    {
      id: "twitter",
      label: "X / Twitter",
      gradient: "from-slate-700 to-slate-900",
      bg: "bg-slate-100", border: "border-slate-200", color: "text-slate-700",
      placeholder: "https://x.com/yourhandle",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      ),
    },
    {
      id: "instagram",
      label: "Instagram",
      gradient: "from-pink-500 via-red-500 to-yellow-400",
      bg: "bg-pink-50", border: "border-pink-200", color: "text-pink-700",
      placeholder: "https://instagram.com/yourprofile",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
      ),
    },
    {
      id: "github",
      label: "GitHub",
      gradient: "from-gray-700 to-gray-900",
      bg: "bg-gray-100", border: "border-gray-200", color: "text-gray-700",
      placeholder: "https://github.com/yourorg",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
      ),
    },
    {
      id: "other",
      label: "Other",
      gradient: "from-violet-400 to-purple-600",
      bg: "bg-violet-50", border: "border-violet-200", color: "text-violet-700",
      placeholder: "https://example.com",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      ),
    },
  ];

  const getTypeMeta = (type: string) => LINK_TYPES.find(t => t.id === type) ?? LINK_TYPES[0];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim() || !company) return;
    
    let finalUrl = form.url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    const newLinks = [...links, { id: Date.now(), ...form, url: finalUrl }];
    setLinks(newLinks);
    updateCompany.mutate({ id: company.id, custom_links: newLinks }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
    
    setForm({ label: "", url: "", type: "website" });
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    if (!company) return;
    const newLinks = links.filter(l => l.id !== id);
    setLinks(newLinks);
    updateCompany.mutate({ id: company.id, custom_links: newLinks }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  };

  const handleCopy = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) return <div className="p-8 text-center text-muted">Loading settings...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center border border-violet-500/20 shadow-inner shrink-0">
            <LinkIcon className="w-7 h-7 text-violet-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Custom Link Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Add and manage quick-access links for your company profile — websites, social media, and more.
            </p>
          </div>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden "
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <Plus className="w-4 h-4" /> Add New Link
          </button>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-3 text-[13.5px] rounded-xl px-5 py-4 bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium shadow-sm animate-rise">
          <CheckCircle className="w-5 h-5 shrink-0" /> Links updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main links list */}
        <div className="xl:col-span-2 space-y-6">
          {/* Add form */}
          {showForm && (
            <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative group/card hover:shadow-md transition-shadow animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-indigo-500" />
              <div className="p-6 sm:p-8 pt-9">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-sm">
                    <LinkIcon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-ink">New Custom Link</div>
                    <div className="text-[13px] text-muted">Select a type and fill in the details.</div>
                  </div>
                </div>

                <form onSubmit={handleAdd} className="space-y-6">
                  {/* Type picker */}
                  <div>
                    <label className="block text-[13.5px] font-semibold text-ink uppercase tracking-widest mb-3">Link Type</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {LINK_TYPES.map(t => (
                         <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, type: t.id }))}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                            form.type === t.id
                              ? `${t.bg} border-transparent ring-2 ring-violet-500 ring-offset-1 shadow-sm transform scale-[1.02]`
                              : "border-line hover:border-slate-300 bg-bone/30 hover:bg-paper"
                          }`}
                        >
                          <div className={`${form.type === t.id ? t.color : "text-slate-400"} transition-colors`}>{t.icon}</div>
                          <span className="text-[10.5px] font-bold text-ink truncate w-full text-center uppercase tracking-wider">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-bone/30 p-5 rounded-xl border border-line">
                    <div>
                      <label className="block text-[13px] font-medium text-ink mb-1.5">Display Label</label>
                      <input
                        required
                        value={form.label}
                        onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
                        placeholder={`e.g. ${getTypeMeta(form.type).label}`}
                        className="input w-full h-11 bg-paper"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-ink mb-1.5">URL</label>
                      <input
                        required
                        type="text"
                        value={form.url}
                        onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                        placeholder={getTypeMeta(form.type).placeholder}
                        className="input w-full h-11 font-mono text-[13px] bg-paper"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary h-11 px-6 font-medium">Cancel</button>
                    <button type="submit" className="btn btn-primary h-11 px-6 font-medium shadow-md hover:shadow-lg  flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Save Link
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Links list card */}
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative group/card hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-600 via-slate-400 to-zinc-300" />

            <div className="px-6 py-5 pt-8 border-b border-line bg-bone/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-5 h-5 text-slate-500" />
                <span className="text-[14px] font-bold text-ink uppercase tracking-widest">Configured Links</span>
                {links.length > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 shadow-inner">{links.length}</span>
                )}
              </div>
            </div>

            {links.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center space-y-4 px-6 bg-paper">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-sm">
                  <LinkIcon className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-ink mb-1">No links added yet</div>
                  <p className="text-[13.5px] text-muted max-w-sm mx-auto leading-relaxed">Add your company website, social media, or any custom URL to display on your public profile.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn  h-10 px-6 mt-2 flex items-center gap-2 shadow-sm font-medium rounded-xl">
                  <Plus className="w-4 h-4" /> Add first link
                </button>
              </div>
            ) : (
              <div className="divide-y divide-line bg-paper">
                {links.map(link => {
                  const meta = getTypeMeta(link.type);
                  return (
                    <div key={link.id} className="flex items-center gap-5 px-6 py-5 hover:bg-bone/40 transition-colors group">
                      {/* Icon tile */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm group-hover:scale-105 transition-transform ${meta.bg} ${meta.border}`}>
                        <div className={meta.color}>{meta.icon}</div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="text-[14.5px] font-bold text-ink truncate">{link.label}</div>
                          <span className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${meta.bg} ${meta.border} ${meta.color} shrink-0`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-[12.5px] text-muted font-mono truncate hover:text-blue-600 transition-colors cursor-pointer" onClick={() => window.open(link.url, '_blank')}>{link.url}</div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(link.url, link.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-transparent hover:border-slate-200 hover:bg-paper hover:shadow-sm text-muted hover:text-ink transition-all"
                          title="Copy URL"
                        >
                          {copiedId === link.id
                            ? <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                            : <Copy className="w-4.5 h-4.5" />
                          }
                        </button>
                        <a
                          href={link.url} target="_blank" rel="noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-transparent hover:border-slate-200 hover:bg-paper hover:shadow-sm text-muted hover:text-ink transition-all"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4.5 h-4.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 hover:shadow-sm text-muted hover:text-red-600 transition-all ml-1"
                          title="Delete link"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar preview */}
        <div className="space-y-6">
          {/* Profile preview card */}
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow">
            <div className="px-5 py-4 border-b border-line bg-bone/40 flex items-center gap-2">
              <Blocks className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-semibold text-ink uppercase tracking-widest">Profile Widget</span>
            </div>
            <div className="p-6">
              {/* Mini profile card */}
              <div className="bg-paper rounded-2xl p-5 border border-line text-center mb-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-red-500"></div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-[18px] mx-auto mb-3 shadow-inner">
                  {company?.name ? company.name.charAt(0).toUpperCase() : "W"}
                </div>
                <div className="text-[14px] font-bold text-ink">{company?.name || "Your Workspace"}</div>
                <div className="text-[11.5px] font-medium text-emerald-600 mt-1">Active Profile</div>
              </div>

              <div className="space-y-2.5">
                {links.length === 0 ? (
                  <div className="text-[12.5px] text-muted text-center py-4 bg-bone/30 rounded-xl border border-dashed border-line">No links to display</div>
                ) : (
                  links.map(link => {
                    const meta = getTypeMeta(link.type);
                    return (
                      <div key={link.id} className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer ${meta.bg} ${meta.border} text-left`}>
                        <div className={`shrink-0 ${meta.color}`}>{meta.icon}</div>
                        <span className={`text-[12.5px] font-bold truncate ${meta.color}`}>{link.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Tips card */}
          <div className="bg-slate-800 text-white rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-md">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-700 rounded-full opacity-50 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 relative z-10 mb-1">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shadow-inner">
                <LinkIcon className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-[14px] font-bold">{links.length} active link{links.length !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-[12.5px] text-slate-300 leading-relaxed relative z-10">
              Custom links appear on your public company profile and client-facing pages (like proposals and invoices).
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
