"use client";

import { useState } from "react";
import { useCampaigns, useCreateCampaign, useSendCampaign, useDeleteCampaign, useUpdateCampaign, useSendTestCampaign, useScheduleCampaign } from "@/lib/queries";
import { Plus, Send, Trash2, Mail, Clock, Search, Loader2, Edit2, X, Copy, CalendarClock } from "lucide-react";
import { ConfirmationModal } from "@/components/confirmation-modal";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCampaigns({ search, page });
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const sendMutation = useSendCampaign();
  const deleteMutation = useDeleteCampaign();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", from_name: "", from_email: "", body_html: "", target_audience: "all_leads" });
  const [confirmSendId, setConfirmSendId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  
  const sendTestMutation = useSendTestCampaign();
  const scheduleMutation = useScheduleCampaign();
  
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testCampaignId, setTestCampaignId] = useState<number | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleCampaignId, setScheduleCampaignId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");

  const campaigns = data?.results || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editCampaignId) {
      updateMutation.mutate({ id: editCampaignId, payload: newCampaign }, {
        onSuccess: () => {
          setIsDrawerOpen(false);
          setEditCampaignId(null);
          setNewCampaign({ name: "", subject: "", from_name: "", from_email: "", body_html: "", target_audience: "all_leads" });
        }
      });
    } else {
      createMutation.mutate(newCampaign, {
        onSuccess: () => {
          setIsDrawerOpen(false);
          setNewCampaign({ name: "", subject: "", from_name: "", from_email: "", body_html: "", target_audience: "all_leads" });
        }
      });
    }
  };

  const openEditDrawer = (campaign: any) => {
    setEditCampaignId(campaign.id);
    setNewCampaign({
      name: campaign.name,
      subject: campaign.subject,
      from_name: campaign.from_name || "",
      from_email: campaign.from_email || "",
      body_html: campaign.body_html || "",
      target_audience: campaign.target_audience || "all_leads",
    });
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setEditCampaignId(null);
    setNewCampaign({ name: "", subject: "", from_name: "", from_email: "", body_html: "", target_audience: "all_leads" });
    setIsDrawerOpen(true);
  };

  const handleDuplicate = (campaign: any) => {
    setEditCampaignId(null); // It's a new campaign
    setNewCampaign({
      name: `${campaign.name} (Copy)`,
      subject: campaign.subject,
      from_name: campaign.from_name || "",
      from_email: campaign.from_email || "",
      body_html: campaign.body_html || "",
      target_audience: campaign.target_audience || "all_leads",
    });
    setIsDrawerOpen(true);
  };

  const handleSend = (id: number) => {
    setConfirmSendId(id);
  };

  const confirmSend = () => {
    if (confirmSendId !== null) {
      sendMutation.mutate(confirmSendId, {
        onSuccess: () => setConfirmSendId(null),
        onError: () => setConfirmSendId(null)
      });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId !== null) {
      deleteMutation.mutate(confirmDeleteId, {
        onSuccess: () => setConfirmDeleteId(null),
        onError: () => setConfirmDeleteId(null)
      });
    }
  };

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (testCampaignId && testEmailAddress) {
      sendTestMutation.mutate({ id: testCampaignId, email: testEmailAddress }, {
        onSuccess: () => {
          setTestEmailOpen(false);
          setTestEmailAddress("");
          setTestCampaignId(null);
        }
      });
    }
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduleCampaignId && scheduledAt) {
      scheduleMutation.mutate({ id: scheduleCampaignId, scheduled_at: new Date(scheduledAt).toISOString() }, {
        onSuccess: () => {
          setScheduleOpen(false);
          setScheduledAt("");
          setScheduleCampaignId(null);
        }
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-serif text-ink tracking-tight">Marketing Campaigns</h1>
          <p className="text-muted text-[13px] mt-1">Design and blast email campaigns to your audience.</p>
        </div>
        <button
          onClick={openCreateDrawer}
          className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="bg-paper border border-line rounded-[14px] overflow-hidden shadow-sm animate-rise">
        <div className="p-5 border-b border-line flex items-center gap-3 bg-surface-muted/30">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input w-full pl-9 bg-paper"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-bone-2 rounded-full flex items-center justify-center mb-4 border border-line shadow-sm">
              <Mail className="w-8 h-8 text-muted" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-ink">No campaigns yet</h3>
            <p className="text-muted text-[13px] mt-1 mb-6 max-w-sm">Create your first marketing campaign to start engaging with your leads and customers.</p>
            <button
              onClick={openCreateDrawer}
              className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium gap-2"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bone text-muted/80 uppercase tracking-wider text-[11px] font-semibold border-b border-line">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Target</th>
                  <th className="px-6 py-3 font-medium">Status / Performance</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((campaign: any) => (
                  <tr key={campaign.id} className="group hover:bg-bone-2/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink">{campaign.name}</div>
                      <div className="text-muted text-xs truncate max-w-[200px] mt-0.5">{campaign.subject}</div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {campaign.target_audience.replace("_", " ")}
                    </td>
                  <td className="px-6 py-4">
                    {campaign.status === "completed" ? (
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600 font-medium">{campaign.sent_count} sent</span>
                        {campaign.failed_count > 0 && <span className="text-red-600">{campaign.failed_count} failed</span>}
                      </div>
                    ) : campaign.status === "scheduled" ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Scheduled for {new Date(campaign.scheduled_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    ) : campaign.status === "sending" ? (
                       <span className="text-blue-600 font-medium">Sending...</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleDuplicate(campaign)}
                        className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors"
                        title="Duplicate Campaign"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {campaign.status === "draft" && (
                        <>
                          <button
                            onClick={() => openEditDrawer(campaign)}
                            className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors"
                            title="Edit Draft"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTestCampaignId(campaign.id);
                              setTestEmailOpen(true);
                            }}
                            className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors"
                            title="Send Test Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setScheduleCampaignId(campaign.id);
                              setScheduleOpen(true);
                            }}
                            className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors"
                            title="Schedule for Later"
                          >
                            <CalendarClock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSend(campaign.id)}
                            disabled={sendMutation.isPending}
                            className="p-1.5 text-ink hover:bg-bone rounded transition-colors"
                            title="Send Now"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-line flex items-center justify-between text-sm text-muted bg-bone-2/30">
            <div>
              Showing {campaigns.length} of {data?.count ?? 0}
            </div>
            <div className="flex gap-2">
              <button
                disabled={!data?.previous}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-md border border-line bg-paper hover:bg-bone disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <button
                disabled={!data?.next}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-md border border-line bg-paper hover:bg-bone disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
          </div>
        )}
      </div>

      <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed right-0 top-0 h-full w-[500px] max-w-[90vw] bg-paper shadow-2xl z-50 border-l border-line flex flex-col animate-slide-in-right">
            
            <div className="flex items-center justify-between p-5 border-b border-line bg-surface-muted/30">
              <div>
                <Dialog.Title className="font-serif text-[20px] text-ink">
                  {editCampaignId ? "Edit Campaign" : "New Campaign"}
                </Dialog.Title>
                <p className="text-[13px] text-muted mt-1">Configure your email blast parameters.</p>
              </div>
              <Dialog.Close asChild>
                <button className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="campaign-form" onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Campaign Name *</label>
                  <input
                    required
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Summer Promo 2024"
                    className="input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Email Subject *</label>
                  <input
                    required
                    type="text"
                    value={newCampaign.subject}
                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                    placeholder="Check out our new features, {{name}}!"
                    className="input w-full"
                  />
                  <p className="text-[12px] text-muted mt-1">Placeholders available: <code className="bg-bone px-1 rounded text-ink font-medium">{'{{name}}'}</code>, <code className="bg-bone px-1 rounded text-ink font-medium">{'{{company_name}}'}</code></p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">From Name</label>
                    <input
                      type="text"
                      value={newCampaign.from_name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, from_name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="input w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">From Email</label>
                    <input
                      type="email"
                      value={newCampaign.from_email}
                      onChange={(e) => setNewCampaign({ ...newCampaign, from_email: e.target.value })}
                      placeholder="john@example.com"
                      className="input w-full"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Target Audience</label>
                  <select
                    value={newCampaign.target_audience}
                    onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                    className="select w-full"
                  >
                    <option value="all_leads">All Leads</option>
                    <option value="qualified_leads">Qualified Leads Only</option>
                    <option value="all_customers">All Customers</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Email Body *</label>
                  <div className="border border-line rounded-md overflow-hidden bg-paper">
                    <RichTextEditor
                      value={newCampaign.body_html}
                      onChange={(html) => setNewCampaign({ ...newCampaign, body_html: html })}
                      placeholder="Compose your email here. Use {{name}} to greet the recipient!"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-line bg-bone-2/30 flex justify-end gap-3 sticky bottom-0">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 rounded-lg text-[13px] font-bold text-ink-2 hover:bg-bone transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                form="campaign-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium px-6 py-2"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Draft"}
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmationModal
        open={confirmSendId !== null}
        onClose={() => setConfirmSendId(null)}
        onConfirm={confirmSend}
        title="Send Campaign"
        description="Are you sure you want to send this campaign now? This cannot be undone and will immediately dispatch emails to your target audience."
        confirmText="Send Campaign"
        cancelText="Cancel"
        variant="info"
        loading={sendMutation.isPending}
      />

      <ConfirmationModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? Any performance history will be lost."
        confirmText="Delete Campaign"
        cancelText="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <Dialog.Root open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl z-50 border border-line rounded-[14px] p-6 animate-zoom-in">
            <Dialog.Title className="font-serif text-[20px] text-ink mb-1">
              Send Test Email
            </Dialog.Title>
            <Dialog.Description className="text-[13px] text-muted mb-5">
              Send a test version of this campaign to verify formatting and content before blasting your audience.
            </Dialog.Description>
            
            <form onSubmit={handleSendTest} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Test Email Address</label>
                <input
                  required
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="you@example.com"
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 rounded-lg text-[13px] font-bold text-ink-2 hover:bg-bone transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={sendTestMutation.isPending || !testEmailAddress}
                  className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium px-6 py-2"
                >
                  {sendTestMutation.isPending ? "Sending..." : "Send Test"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl z-50 border border-line rounded-[14px] p-6 animate-zoom-in">
            <Dialog.Title className="font-serif text-[20px] text-ink mb-1">
              Schedule Campaign
            </Dialog.Title>
            <Dialog.Description className="text-[13px] text-muted mb-5">
              Pick a date and time to automatically send this campaign to your audience.
            </Dialog.Description>
            
            <form onSubmit={handleSchedule} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Date & Time</label>
                <input
                  required
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 rounded-lg text-[13px] font-bold text-ink-2 hover:bg-bone transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending || !scheduledAt}
                  className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium px-6 py-2"
                >
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
