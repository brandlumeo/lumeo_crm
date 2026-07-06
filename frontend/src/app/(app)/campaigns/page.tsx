"use client";

import { useState } from "react";
import { useCampaigns, useCreateCampaign, useSendCampaign, useDeleteCampaign } from "@/lib/queries";
import { Plus, Send, Trash2, Mail, Clock, Search, Loader2 } from "lucide-react";
import { ConfirmationModal } from "@/components/confirmation-modal";

export default function CampaignsPage() {
  const { data, isLoading } = useCampaigns();
  const createMutation = useCreateCampaign();
  const sendMutation = useSendCampaign();
  const deleteMutation = useDeleteCampaign();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", body_html: "", target_audience: "all_leads" });
  const [confirmSendId, setConfirmSendId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const campaigns = data?.results || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newCampaign, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewCampaign({ name: "", subject: "", body_html: "", target_audience: "all_leads" });
      }
    });
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

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Marketing Campaigns</h1>
          <p className="text-muted text-sm mt-1">Design and blast email campaigns to your audience.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-4 py-2 bg-bone-2 border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-bone-2 rounded-full flex items-center justify-center mb-4 border border-line">
              <Mail className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-ink">No campaigns yet</h3>
            <p className="text-muted text-sm mt-1 mb-6 max-w-sm">Create your first marketing campaign to start engaging with your leads and customers.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-ink text-paper px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bone-2 text-muted border-b border-line">
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
                  <tr key={campaign.id} className="hover:bg-bone-2/50 transition-colors">
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
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {campaign.status === "draft" && (
                        <button
                          onClick={() => handleSend(campaign.id)}
                          disabled={sendMutation.isPending}
                          className="p-2 text-ink hover:bg-bone-2 rounded-md transition-colors"
                          title="Send Campaign"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-line flex justify-between items-center bg-bone">
              <h2 className="text-lg font-semibold text-ink">New Campaign</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink text-xl font-light">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Campaign Name</label>
                <input
                  required
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., Summer Promo 2024"
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Email Subject</label>
                <input
                  required
                  type="text"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  placeholder="Check out our new features, {{name}}!"
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                />
                <p className="text-xs text-muted mt-1">You can use {'{{name}}'} and {'{{company_name}}'} as placeholders.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Target Audience</label>
                <select
                  value={newCampaign.target_audience}
                  onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors"
                >
                  <option value="all_leads">All Leads</option>
                  <option value="qualified_leads">Qualified Leads Only</option>
                  <option value="all_customers">All Customers</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Email Body (HTML)</label>
                <textarea
                  required
                  value={newCampaign.body_html}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body_html: e.target.value })}
                  rows={8}
                  placeholder="<p>Hi {{name}},</p><p>We are excited to share...</p>"
                  className="w-full px-3 py-2 bg-bone border border-line rounded-md text-sm outline-none focus:border-ink transition-colors font-mono resize-y"
                />
              </div>
            </form>
            <div className="p-5 border-t border-line bg-bone flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
