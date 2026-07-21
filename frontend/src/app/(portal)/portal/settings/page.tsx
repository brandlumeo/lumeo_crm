"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageShell } from "@/components/page-shell";

export default function PortalSettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put("/accounts/password/", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const msg =
        error.response?.data?.old_password?.[0] ||
        error.response?.data?.detail ||
        "Failed to update password. Please check your current password.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell title="Settings" eyebrow="Client Portal">
      <div className="max-w-md w-full animate-rise">
        <div className="card">
          <div className="px-5 py-4 border-b border-line bg-bone-2">
            <h3 className="font-semibold text-ink">Change Password</h3>
            <p className="text-xs text-muted mt-1">Update your portal access password.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                required
                className="input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            
            <div className="h-px bg-line my-4" />
            
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                required
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>
            
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                required
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={8}
              />
            </div>
            
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto"
                disabled={isSubmitting || !oldPassword || !newPassword || !confirmPassword}
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
