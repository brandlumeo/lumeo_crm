"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Settings as SettingsIcon, ShieldAlert, Sparkles, Server, Check } from "lucide-react";

export default function SaasSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    api.get("/saas/settings/").then(res => setSettings(res.data)).catch(console.error);
  };

  const handleToggle = (key: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("/saas/settings/", settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="h-[400px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <SettingsIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Platform Settings</h1>
            <p className="text-white/50 text-sm mt-1">Global configuration, feature flags, and keys.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {success ? <Check className="w-4 h-4" /> : null}
          {saving ? "Saving..." : success ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-6">
        {/* Core Settings */}
        <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
            <Server className="w-4 h-4 text-white/40" />
            <h2 className="font-semibold text-white">System Access</h2>
          </div>
          <div className="p-6 space-y-6">
            <ToggleRow 
              title="Maintenance Mode" 
              desc="When enabled, only Superadmins can log in. All other users will see a maintenance screen."
              active={settings.maintenance_mode}
              onClick={() => handleToggle("maintenance_mode")}
              danger
            />
            <ToggleRow 
              title="Allow New Registrations" 
              desc="If disabled, the public sign-up page will block new tenant creation."
              active={settings.allow_new_registrations}
              onClick={() => handleToggle("allow_new_registrations")}
            />
            <ToggleRow 
              title="Require Email Verification" 
              desc="Users must verify their email address before accessing the platform."
              active={settings.require_email_verification}
              onClick={() => handleToggle("require_email_verification")}
            />
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/40" />
            <h2 className="font-semibold text-white">Feature Flags</h2>
          </div>
          <div className="p-6 space-y-6">
            <ToggleRow 
              title="Enable AI Features" 
              desc="Globally enable or disable Lumeo AI writing assistants and prediction tools."
              active={settings.enable_ai_features}
              onClick={() => handleToggle("enable_ai_features")}
            />
            <ToggleRow 
              title="Enable Custom Domains" 
              desc="Allow tenants to configure custom domain routing."
              active={settings.enable_custom_domains}
              onClick={() => handleToggle("enable_custom_domains")}
            />
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white/40" />
            <h2 className="font-semibold text-white">Credentials & Keys</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Stripe/Razorpay Public Key</label>
              <input 
                type="text" 
                value={settings.stripe_public_key}
                onChange={(e) => handleChange("stripe_public_key", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Global Support Email</label>
              <input 
                type="email" 
                value={settings.support_email}
                onChange={(e) => handleChange("support_email", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, active, onClick, danger }: any) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-sm text-white/40 mt-1 leading-relaxed max-w-lg">{desc}</p>
      </div>
      <button 
        onClick={onClick}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          active 
            ? (danger ? 'bg-red-500' : 'bg-indigo-500') 
            : 'bg-white/10'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
          active ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
