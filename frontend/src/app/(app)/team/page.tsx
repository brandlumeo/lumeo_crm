"use client";
import { toast } from "sonner";


import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users2, Mail, Plus, X, Loader2, Check } from "lucide-react";

import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { fetchTeam, inviteTeamMember, removeTeamMember, api } from "@/lib/api";
import { SkeletonTable } from "@/components/skeleton-table";

const getAvatarTint = (name: string) => {
  const char = name ? name[0].toUpperCase() : "?";
  const tints = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  return tints[char.charCodeAt(0) % tints.length];
};

const getRoleBadge = (roleName: string) => {
  const r = roleName.toLowerCase();
  if (r === "owner") return <span className="border border-line bg-paper px-3 py-1 rounded-full text-xs font-medium text-ink shadow-sm">Owner</span>;
  if (r === "it") return <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider">{roleName}</span>;
  if (r === "employee") return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">{roleName}</span>;
  if (r === "secondary admin" || r.includes("admin")) return <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">{roleName}</span>;
  if (r === "accounts") return <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">{roleName}</span>;
  return <span className="text-sm text-muted font-medium capitalize">{roleName}</span>;
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: company } = useCurrentCompany();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteDesignation, setInviteDesignation] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Team member removed successfully");
    },
    onError: () => {
      toast.error("Failed to remove team member");
    }
  });

  const inviteMutation = useMutation({
    mutationFn: (vars: {
      email: string;
      role: string;
      first_name?: string;
      last_name?: string;
      designation?: string;
      department?: string;
      personal_message?: string;
    }) => inviteTeamMember(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteDesignation("");
      setInviteDepartment("");
      setInviteMessage("");
      setInviteRole("employee");
      toast.success("Team invitation sent successfully.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to invite user.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; can_manage_team?: boolean; role?: string }) =>
      api.patch(`/accounts/team/${vars.id}/`, vars).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Team member updated.");
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
        <div className="space-y-10">
          {/* Active Users */}
          <div>
            <div className="mb-3 text-[11px] font-bold text-muted uppercase tracking-wider pl-1">Team Members</div>
            <div className="bg-paper border border-line rounded-[14px] overflow-hidden shadow-sm">
              <div className="divide-y divide-line">
                {data?.users?.map((user) => {
                  const isOwner = user.role === "owner";
                  const isCurrentUser = user.id === currentUser?.id;
                  const nameChar = (user.first_name?.[0] || user.username?.[0] || "?").toUpperCase();
                  
                  return (
                  <div key={user.id} className={`flex items-center justify-between px-5 py-4 ${isOwner ? "bg-[#FAF9F7]" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${getAvatarTint(nameChar)}`}>
                        {nameChar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-ink flex items-center gap-2">
                          {user.first_name} {user.last_name}
                          {isCurrentUser && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-muted">{user.email || user.username}</div>
                        {(user.designation || user.department) && (
                          <div className="flex items-center gap-2 mt-0.5 text-[12px] text-muted/80 font-serif italic">
                            {user.designation && <span>{user.designation}</span>}
                            {user.designation && user.department && <span>•</span>}
                            {user.department && <span>{user.department}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {isOwnerOrAdmin && user.role !== "admin" && user.role !== "owner" && user.role !== "manager" && user.role !== "customer" && user.role !== "client" && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-[12px] text-muted">Admin access</span>
                          <div className="relative inline-flex items-center h-4 rounded-full w-7">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={user.can_manage_team}
                              disabled={updateMutation.isPending}
                              onChange={(e) => updateMutation.mutate({ id: user.id, can_manage_team: e.target.checked })}
                            />
                            <div className="w-7 h-4 bg-bone-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                          </div>
                        </label>
                      )}
                      
                      <div className="flex items-center gap-3">
                        {isManagerOrAbove && user.role !== "admin" && user.role !== "owner" && user.role !== "client" ? (
                          <div className="relative group flex items-center">
                            <select
                              value={user.role}
                              disabled={updateMutation.isPending}
                              onChange={(e) => updateMutation.mutate({ id: user.id, role: e.target.value })}
                              className="bg-transparent border-none text-sm text-muted focus:ring-0 capitalize appearance-none cursor-pointer hover:text-ink transition-colors pl-0 pr-4"
                            >
                              {company?.roles?.map((r: any) => {
                                if (r.id === "client" || r.name.toLowerCase() === "client") return null;
                                if (r.id === "admin" || r.isAdmin) return null;
                                return <option key={r.id} value={r.id}>{r.name}</option>;
                              })}
                              {!company?.roles?.find((r: any) => r.id === user.role) && (
                                <option value={user.role}>{user.role}</option>
                              )}
                            </select>
                          </div>
                        ) : (
                          getRoleBadge(company?.roles?.find((r: any) => r.id === user.role)?.name || user.role)
                        )}
                        
                        {/* Remove Member Button */}
                        {isOwnerOrAdmin && !isCurrentUser && !isOwner && (
                          <button
                            disabled={removeMutation.isPending && removeMutation.variables === user.id}
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${user.first_name || user.email} from the team?`)) {
                                removeMutation.mutate(user.id);
                              }
                            }}
                            className="ml-2 w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 transition-colors"
                            title="Remove member"
                          >
                            {removeMutation.isPending && removeMutation.variables === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>

          {/* Pending Invites */}
          {data?.invites && data.invites.length > 0 && (
            <div>
              <div className="mb-3 text-[11px] font-bold text-muted uppercase tracking-wider pl-1">Pending Invites</div>
              <div className="bg-paper border border-line rounded-[14px] overflow-hidden shadow-sm opacity-90">
                <div className="divide-y divide-line">
                  {data.invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-line border-dashed flex items-center justify-center text-muted/60">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-ink">
                            {invite.first_name || invite.last_name ? `${invite.first_name || ""} ${invite.last_name || ""}`.trim() : invite.email}
                            {(invite.first_name || invite.last_name) && <span className="text-[13px] text-muted font-normal ml-2">({invite.email})</span>}
                          </div>
                          {(invite.designation || invite.department) && (
                            <div className="flex items-center gap-2 mt-0.5 text-[12px] text-muted/80 font-serif italic">
                              {invite.designation && <span>{invite.designation}</span>}
                              {invite.designation && invite.department && <span>•</span>}
                              {invite.department && <span>{invite.department}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-[12px] flex items-center gap-3">
                          {invite.is_expired ? (
                            <>
                              <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-medium">Expired</span>
                              <button 
                                onClick={() => {
                                  // Resend logic
                                  toast.success("Feature coming soon");
                                }}
                                className="text-blue-600 font-medium hover:underline"
                              >
                                Resend
                              </button>
                            </>
                          ) : invite.expires_at ? (
                            <span className="text-muted">Expires {new Date(invite.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          ) : (
                            <span className="text-muted">Pending acceptance</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {getRoleBadge(company?.roles?.find((r: any) => r.id === invite.role)?.name || invite.role)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)} />
          <div className="relative w-full max-w-lg bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
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
                inviteMutation.mutate({
                  email: inviteEmail,
                  role: inviteRole,
                  first_name: inviteFirstName,
                  last_name: inviteLastName,
                  designation: inviteDesignation,
                  department: inviteDepartment,
                  personal_message: inviteMessage,
                });
              }}
              className="p-5 flex-1 overflow-y-auto custom-scrollbar min-h-0"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      autoComplete="given-name"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      placeholder="Sarah"
                      className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      autoComplete="family-name"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      placeholder="Connor"
                      className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">
                    Email address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">
                      Designation / Title
                    </label>
                    <input
                      type="text"
                      value={inviteDesignation}
                      onChange={(e) => setInviteDesignation(e.target.value)}
                      placeholder="Senior Sales Executive"
                      className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={inviteDepartment}
                      onChange={(e) => setInviteDepartment(e.target.value)}
                      placeholder="Sales"
                      className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">
                    Role *
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

                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">
                    Personalized Welcome Message
                  </label>
                  <textarea
                    rows={3}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Welcome to the team! Here is your workspace access."
                    className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink transition-colors resize-none"
                  />
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
        </div>
      )}
    </div>
  );
}
