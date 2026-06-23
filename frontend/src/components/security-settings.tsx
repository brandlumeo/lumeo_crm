"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, Loader2, CheckCircle, XCircle, ShieldCheck, Mail,
  Smartphone, Lock, AlertTriangle, Laptop, RefreshCw, Key,
  Check, ArrowRight, Trash2, ShieldAlert
} from "lucide-react";
import { updatePassword, updateProfile } from "@/lib/api";
import { useCurrentUser } from "@/lib/queries";
import QRCode from "qrcode";

export function SecurityForm() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // General feedback
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 2FA states
  const [verificationMode, setVerificationMode] = useState<null | "email" | "google_authenticator">(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [qrSecret, setQrSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablingMethod, setDisablingMethod] = useState<"email" | "google_authenticator" | null>(null);

  // Mock Active Sessions
  const [sessions, setSessions] = useState([
    {
      id: "sess-1",
      device: "Windows PC",
      browser: "Google Chrome",
      location: "Bengaluru, India",
      ip: "192.168.1.45",
      isCurrent: true,
      lastActive: "Active now"
    },
    {
      id: "sess-2",
      device: "iPhone 15",
      browser: "Lumeo CRM iOS App",
      location: "Mumbai, India",
      ip: "103.45.67.12",
      isCurrent: false,
      lastActive: "2 hours ago"
    },
    {
      id: "sess-3",
      device: "Apple MacBook",
      browser: "Safari Browser",
      location: "Chennai, India",
      ip: "157.34.22.89",
      isCurrent: false,
      lastActive: "3 days ago"
    }
  ]);

  // Generate and format key for Google Authenticator when mode is selected
  useEffect(() => {
    if (verificationMode === "google_authenticator" && user?.two_factor_secret) {
      const secret = user.two_factor_secret;
      const formatted = secret.match(/.{1,4}/g)?.join(" ") || secret;
      setQrSecret(formatted);

      // Generate local QR Code
      const otpauthUri = `otpauth://totp/Lumeo%20CRM:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Lumeo%20CRM`;
      QRCode.toDataURL(otpauthUri, { width: 200, margin: 2 })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error("Failed to generate QR Code data URL", err);
        });
    } else {
      setQrSecret("");
      setQrCodeDataUrl("");
    }
    setVerificationCode("");
    setCodeError("");
  }, [verificationMode, user]);

  const getStrength = (pw: string) => {
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: "Weak", color: "bg-rose-500" };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-400" };
    if (score <= 3) return { score, label: "Good", color: "bg-amber-400" };
    if (score <= 4) return { score, label: "Strong", color: "bg-emerald-400" };
    return { score, label: "Very Strong", color: "bg-emerald-600" };
  };

  const strength = getStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const securityTips = [
    "Use at least 12 characters for maximum strength.",
    "Mix uppercase, lowercase, numbers & symbols.",
    "Never use personal info like names or birthdays.",
    "Never reuse passwords across different services.",
  ];

  // Mutation to update password
  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccessMsg("Password updated successfully.");
      setTimeout(() => setSuccessMsg(""), 5000);
    },
    onError: (err: any) => {
      const apiErr = err as { response?: { data?: { current_password?: string[] } } };
      setError(apiErr.response?.data?.current_password?.[0] || "Failed to update password.");
    },
  });

  // Mutation to update profile (2FA settings)
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["me"], updatedUser);
      setSuccessMsg("Two-Factor Authentication settings updated successfully.");
      setTimeout(() => setSuccessMsg(""), 5000);
      setVerificationMode(null);
      setShowDisableConfirm(false);
      setDisablingMethod(null);
      setVerificationCode("");
      setCodeError("");
    },
    onError: (err: any) => {
      const apiErr = err as { response?: { data?: { two_factor_code?: string[] } } };
      const codeErrMsg = apiErr.response?.data?.two_factor_code?.[0];
      if (codeErrMsg) {
        setCodeError(codeErrMsg);
      } else {
        setError("Failed to update security settings. Please try again.");
      }
    }
  });

  const handlePasswordSubmit = () => {
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError("");
    passwordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
  };

  const handle2FAVerify = () => {
    if (!verificationCode || verificationCode.length !== 6 || isNaN(Number(verificationCode))) {
      setCodeError("Please enter a valid 6-digit numeric verification code.");
      return;
    }
    setCodeError("");
    
    // Real validation of 2FA code
    const targetMethod = verificationMode === "email" ? "email" : "google_authenticator";
    profileMutation.mutate({
      two_factor_enabled: true,
      two_factor_method: targetMethod,
      two_factor_code: verificationCode
    });
  };

  const handle2FADisable = () => {
    profileMutation.mutate({
      two_factor_enabled: false,
      two_factor_method: "disabled"
    });
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setSuccessMsg("Session revoked successfully.");
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const handleRevokeAllOthers = () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    setSuccessMsg("All other sessions have been logged out.");
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  if (userLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const current2FAMethod = user?.two_factor_enabled ? user?.two_factor_method : "disabled";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-zinc-900 flex items-center justify-center border border-slate-600/50 shadow-inner shrink-0">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Security Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Manage multi-factor authentication, active sessions, and secure password updates.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications/Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise bg-emerald-50 text-emerald-800 border border-emerald-200/60">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise bg-rose-50 text-rose-800 border border-rose-200/60">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2FA Disable Modal Confirmation */}
      {showDisableConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-md w-full overflow-hidden animate-rise">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[16px] font-bold text-ink">Disable Two-Factor Authentication?</h4>
                <p className="text-[13.5px] text-muted leading-relaxed">
                  Disabling 2FA makes your account more vulnerable to unauthorized access. We highly recommend keeping it enabled.
                </p>
              </div>
            </div>
            <div className="bg-bone/50 px-6 py-4 border-t border-line flex items-center justify-end gap-3">
              <button 
                onClick={() => { setShowDisableConfirm(false); setDisablingMethod(null); }}
                className="btn bg-white hover:bg-bone border border-line h-10 px-4 rounded-xl text-sm font-medium text-ink-2"
              >
                Keep Enabled
              </button>
              <button
                onClick={handle2FADisable}
                disabled={profileMutation.isPending}
                className="btn bg-rose-600 hover:bg-rose-700 text-white h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Disable 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: 2FA + Sessions */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Card 1: Two-Factor Authentication */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-slate-500 to-zinc-400" />
            
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 shadow-inner">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-bold text-ink">Two-Factor Authentication</h4>
                    <p className="text-[12.5px] text-muted">Add an extra layer of security to your account.</p>
                  </div>
                </div>
                
                {/* 2FA Status Badge */}
                <div>
                  {user?.two_factor_enabled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Enabled (Authenticator App)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* 2FA Wizard / Mode Selector */}
              {verificationMode ? (
                <div className="bg-bone/40 border border-line rounded-xl p-5 sm:p-6 space-y-5 animate-rise">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[14.5px] font-bold text-ink flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-accent" /> Configure Authenticator App
                    </h5>
                    <button 
                      onClick={() => setVerificationMode(null)}
                      className="text-xs text-muted hover:text-ink font-medium"
                    >
                      Cancel Setup
                    </button>
                  </div>

                  {verificationMode === "google_authenticator" && (
                    <div className="space-y-5 text-sm text-ink-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">1</span>
                            <p className="leading-snug text-xs sm:text-[13px]">
                              Install Google Authenticator, Microsoft Authenticator, or Authy on your mobile phone.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">2</span>
                            <p className="leading-snug text-xs sm:text-[13px]">
                              Scan the QR Code on the right, or enter the secret key manually: <strong className="font-mono text-ink text-xs block mt-1 bg-white border border-line px-2.5 py-1 rounded select-all">{qrSecret}</strong>
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">3</span>
                            <p className="leading-snug text-xs sm:text-[13px]">
                              Enter the 6-digit confirmation code from your authenticator app below.
                            </p>
                          </div>
                        </div>

                        {/* Real Dynamic QR Code generated locally */}
                        <div className="flex flex-col items-center justify-center bg-white p-3 border border-line rounded-xl shadow-inner gap-2">
                          {qrCodeDataUrl ? (
                            <img
                              src={qrCodeDataUrl}
                              alt="Scan with App"
                              className="w-28 h-28 shrink-0 object-contain select-none"
                            />
                          ) : (
                            <div className="w-28 h-28 bg-bone animate-pulse rounded flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-muted" />
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Scan with App</span>
                        </div>
                      </div>

                      <div className="max-w-xs space-y-2 pt-2">
                        <label className="text-xs font-semibold text-ink">Authenticator Code</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="000000"
                            className="input text-center font-mono text-lg tracking-widest h-11 w-full bg-white"
                          />
                          <button
                            onClick={handle2FAVerify}
                            disabled={profileMutation.isPending || verificationCode.length !== 6}
                            className="btn bg-ink hover:bg-black text-white h-11 px-5 rounded-xl font-medium shrink-0 flex items-center gap-1.5"
                          >
                            {profileMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Activate <ArrowRight className="w-4 h-4" /></>
                            )}
                          </button>
                        </div>
                        {codeError && <p className="text-[12px] text-rose-600 font-medium">{codeError}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Setup Using Google Authenticator */}
                  <div className={`border rounded-2xl p-6 hover:border-slate-300 transition-colors space-y-4 ${
                    current2FAMethod === "google_authenticator" ? "border-emerald-200 bg-emerald-50/10" : "border-line"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5 text-ink-2" />
                        </div>
                        <div>
                          <h5 className="text-[14.5px] font-bold text-ink">Google Authenticator</h5>
                          <span className="text-[11.5px] text-muted block mt-0.5">Recommended for high security</span>
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          current2FAMethod === "google_authenticator" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${current2FAMethod === "google_authenticator" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          Status: {current2FAMethod === "google_authenticator" ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[13px] text-muted leading-relaxed">
                      Use an authenticator app (like Google Authenticator, Microsoft Authenticator, or Authy) to scan a QR code and get verification codes, even when your phone is offline.
                    </p>

                    <div className="pt-2 flex justify-start sm:justify-end border-t border-line/30">
                      {current2FAMethod === "google_authenticator" ? (
                        <button 
                          onClick={() => { setShowDisableConfirm(true); setDisablingMethod("google_authenticator"); }}
                          className="btn border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 h-9 px-5 rounded-xl text-xs font-bold transition-all"
                        >
                          Disable 2FA
                        </button>
                      ) : (
                        <button 
                          onClick={() => setVerificationMode("google_authenticator")}
                          className="btn bg-ink hover:bg-black text-white h-9 px-5 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          Configure & Enable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Active Devices & Sessions */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative hover:shadow-md transition-shadow">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Laptop className="w-5 h-5 text-ink-2" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-bold text-ink">Active Device Sessions</h4>
                    <p className="text-[12.5px] text-muted">Devices currently logged into your CRM account.</p>
                  </div>
                </div>

                {sessions.length > 1 && (
                  <button 
                    onClick={handleRevokeAllOthers}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Sign Out All Other Devices
                  </button>
                )}
              </div>

              {/* Sessions List */}
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-line rounded-xl hover:bg-bone/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        session.isCurrent ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-bone/50 border-line text-muted"
                      }`}>
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[13.5px] font-semibold text-ink flex items-center gap-2">
                          {session.device} ({session.browser})
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-muted leading-relaxed">
                          IP: {session.ip} &bull; {session.location} &bull; {session.lastActive}
                        </div>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-xs text-muted hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg border border-transparent hover:border-rose-100 transition-all font-semibold"
                        title="Revoke session"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Change Password + Security Tips */}
        <div className="space-y-6">
          
          {/* Change Password Card */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }}
            className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative hover:shadow-md transition-shadow"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-zinc-400" />
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-line">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-ink-2" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-ink">Change Password</h4>
                  <p className="text-[12px] text-muted">Use a strong, unique password.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="text-[13px] font-medium text-ink-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      autoComplete="current-password"
                      name="current-password"
                      id="current-password"
                      className="input w-full h-10 pr-9 bg-bone/30 focus:bg-white text-sm"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted hover:text-ink">
                      {showCurrent
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-[13px] font-medium text-ink-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      name="new-password"
                      id="new-password"
                      className="input w-full h-10 pr-9 bg-bone/30 focus:bg-white text-sm"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted hover:text-ink">
                      {showNew
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                  
                  {newPassword.length > 0 && (
                    <div className="mt-3 space-y-1.5 bg-bone/30 p-2.5 rounded-lg border border-line/50">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                           <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-line"}`} />
                        ))}
                      </div>
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[11px] text-muted">Password strength</span>
                        <span className={`text-[11px] font-bold ${
                          strength.score <= 1 ? "text-rose-600" : strength.score <= 2 ? "text-orange-600" : strength.score <= 3 ? "text-amber-600" : "text-emerald-600"
                        }`}>{strength.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[13px] font-medium text-ink-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      name="confirm-password"
                      id="confirm-password"
                      className={`input w-full h-10 pr-9 text-sm transition-all ${
                        passwordsMatch ? "border-emerald-400 focus:border-emerald-500 bg-emerald-50/10" :
                        passwordsMismatch ? "border-rose-400 focus:border-rose-500 bg-rose-50/10" : "bg-bone/30 focus:bg-white"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted hover:text-ink">
                      {showConfirm
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Passwords do not match</p>
                  )}
                  {passwordsMatch && (
                    <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Passwords match</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-bone/40 px-6 py-4 border-t border-line flex items-center justify-between mt-auto">
              <span className="text-[11.5px] text-muted">
                Will sign out other devices.
              </span>
              <button
                type="submit"
                disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword || passwordsMismatch}
                className="btn bg-ink hover:bg-black text-white px-4 h-9 shadow-sm hover:shadow-md transition-all rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {passwordMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...</>
                ) : (
                  <><Key className="w-3.5 h-3.5" /> Update Password</>
                )}
              </button>
            </div>
          </form>

          {/* Security Tips Card */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
            <div className="px-6 py-4 border-b border-line bg-gradient-to-r from-slate-50 to-zinc-50 flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span className="text-[13.5px] font-bold text-ink">Security Checklist</span>
            </div>
            <div className="p-6 space-y-4">
              {securityTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-700">{i + 1}</span>
                  </div>
                  <p className="text-[12.5px] text-muted leading-relaxed mt-0.5">{tip}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
