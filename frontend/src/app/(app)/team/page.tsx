"use client";
import { toast } from "sonner";


import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users2, Mail, Plus, X, Loader2, Check } from "lucide-react";

import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { fetchTeam, inviteTeamMember, api } from "@/lib/api";
import { SkeletonTable } from "@/components/skeleton-table";



export default function TeamPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: company } = useCurrentCompany();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string; role: string }) =>
      inviteTeamMember(vars.email, vars.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("employee");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to invite user.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; can_manage_team: boolean }) =>
      api.patch(`/accounts/team/${vars.id}/`, { can_manage_team: vars.can_manage_team }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Team management access updated.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update user.");
    },
  });

  const isOwnerOrAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";
  const isManagerOrAbove = isOwnerOrAdmin || currentUser?.role === "manager" || currentUser?.has_management_access;

  return (
    <div className="max-w-[1000px] mx-auto w-full pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-muted mb-1.5">
            <Users2 className="w-4 h-4" />
            <span className="text-[11px] font-mono tracking-wider uppercase">Workspace</span>
          </div>
          <h1 className="text-3xl font-serif text-ink tracking-tight">Team Management</h1>
          <p className="text-[13px] text-muted mt-1">
            Manage who has access to your company's workspace.
          </p>
        </div>
        {isManagerOrAbove && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite member
          </button>
        )}
      </div>

      {!mounted || isLoading ? (
        <div className="bg-paper border border-line rounded-lg overflow-hidden shadow-sm">
           <SkeletonTable columns={3} rows={5} />
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 py-12">Failed to load team data.</div>
      ) : (
        <div className="space-y-8">
          {/* Active Users */}
          <div className="bg-paper border border-line rounded-lg overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-line bg-bone/30">
              <h2 className="text-sm font-medium text-ink">Active Members</h2>
            </div>
            <div className="divide-y divide-line">
              {data?.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-bone border border-line flex items-center justify-center text-ink font-medium">
                      {(user.first_name?.[0] || user.username?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink">
                        {user.first_name} {user.last_name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-muted">{user.email || user.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {isOwnerOrAdmin && user.role !== "admin" && user.role !== "owner" && user.role !== "manager" && user.role !== "customer" && user.role !== "client" && (
                      <label className="flex items-center gap-2 cursor-pointer mr-2 border-r border-line pr-4">
                        <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Secondary Admin Access</span>
                        <div className="relative inline-flex items-center h-4 rounded-full w-7">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={user.can_manage_team}
                            disabled={updateMutation.isPending}
                            onChange={(e) => updateMutation.mutate({ id: user.id, can_manage_team: e.target.checked })}
                          />
                          <div className="w-7 h-4 bg-bone-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-ink"></div>
                        </div>
                      </label>
                    )}
                    <span className="capitalize text-muted">
                      {company?.roles?.find((r: any) => r.id === user.role)?.name || user.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invites */}
          {data?.invites && data.invites.length > 0 && (
            <div className="bg-paper border border-line rounded-lg overflow-hidden shadow-sm opacity-90">
              <div className="px-5 py-4 border-b border-line bg-bone/30">
                <h2 className="text-sm font-medium text-ink">Pending Invites</h2>
              </div>
              <div className="divide-y divide-line">
                {data.invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-bone-2 border border-line border-dashed flex items-center justify-center text-muted">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-ink">{invite.email}</div>
                        <div className="text-[12px] text-muted mt-0.5">
                          {invite.is_expired ? (
                            <span className="text-red-500">Expired</span>
                          ) : invite.expires_at ? (
                            <span>Expires {new Date(invite.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          ) : (
                            <span>Pending acceptance</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="capitalize text-muted">
                        {company?.roles?.find((r: any) => r.id === invite.role)?.name || invite.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <>
          <div className="modal-backdrop" onClick={() => setIsInviteOpen(false)} />
          <div className="modal-content animate-in zoom-in-95 duration-200 p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="text-base font-medium text-ink">Invite new member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
              }}
              className="p-5"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                  >
                    {company?.roles?.map((role: any) => {
                      // Exclude "client" from Team Invites
                      if (role.id === "client" || role.name.toLowerCase() === "client") {
                        return null;
                      }
                      
                      // Prevent inviting another Primary Admin (App Administrator)
                      if (role.id === "admin" || role.isAdmin) {
                        return null;
                      }
                      
                      // Non-admins cannot invite managers
                      if (!isOwnerOrAdmin && role.id === "manager") {
                        return null;
                      }
                      return (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Send invite
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
