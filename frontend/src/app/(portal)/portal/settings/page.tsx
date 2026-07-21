"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { Eye, EyeOff } from "lucide-react";

export default function PortalSettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
        current_password: oldPassword,
        new_password: newPassword,
      });
      toast.success("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      const msg =
        error.response?.data?.current_password?.[0] ||
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
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  required
                  className="input pr-10"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="h-px bg-line my-4" />
            
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  className="input pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="input pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
