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
        <div className="space-y-8">
          {/* Active Users */}
          <div className="bg-paper border border-line rounded-lg overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-line bg-bone/30">
              <h2 className="text-sm font-medium text-ink">Active Members</h2>
            </div>
            <div className="divide-y divide-line">
              {data?.users?.map((user) => (
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
                      {(user.designation || user.department) && (
                        <div className="flex items-center gap-2 mt-1 text-[12px] text-muted/80 font-serif italic">
                          {user.designation && <span>{user.designation}</span>}
                          {user.designation && user.department && <span>•</span>}
                          {user.department && <span>{user.department}</span>}
                        </div>
                      )}
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
                    {isManagerOrAbove && user.role !== "admin" && user.role !== "owner" && user.role !== "client" ? (
                      <div className="relative group flex items-center">
                        <select
                          value={user.role}
                          disabled={updateMutation.isPending}
                          onChange={(e) => updateMutation.mutate({ id: user.id, role: e.target.value })}
                          className="bg-transparent border-none text-[13px] text-muted focus:ring-0 capitalize appearance-none cursor-pointer hover:text-ink transition-colors pl-0 pr-4"
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
                        <div className="absolute bottom-full left-1/4 -translate-x-1/2 mb-1 px-2 py-1 bg-ink text-white text-[10px] font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10 pointer-events-none shadow-md">
                          Change Role
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-ink"></div>
                        </div>
                      </div>
                    ) : (
                      <span className="capitalize text-muted">
                        {company?.roles?.find((r: any) => r.id === user.role)?.name || user.role}
                      </span>
                    )}
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
