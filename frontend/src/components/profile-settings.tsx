"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserCircle, Loader2, CheckCircle, XCircle, User, 
  MapPin, Clock, ShieldCheck, Mail, Lock, Phone, Globe, Languages,
  Bell, Calendar, UploadCloud, Plus, FileText, HeartPulse
} from "lucide-react";
import { useCurrentUser } from "@/lib/queries";
import { updateProfile } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ProfileForm() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"profile" | "emergency" | "documents">("profile");

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "UTC");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [prefix, setPrefix] = useState(user?.prefix ?? "Mr");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [country, setCountry] = useState(user?.country ?? "India");
  const [language, setLanguage] = useState(user?.language ?? "English");
  const [gender, setGender] = useState(user?.gender ?? "Male");
  const [receiveEmailNotifications, setReceiveEmailNotifications] = useState(user?.receive_email_notifications ?? true);
  const [enableGoogleCalendar, setEnableGoogleCalendar] = useState(user?.enable_google_calendar ?? false);
  const [password, setPassword] = useState("");
  const [newEmergencyContact, setNewEmergencyContact] = useState({ name: "", relationship: "", mobile: "", email: "" });
  
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
      setPassword(""); // Clear password field after save
      setTimeout(() => setProfileMsg(null), 4000);
    },
    onError: () => {
      setProfileMsg({ type: "error", text: "Failed to update profile. Please try again." });
    },
  });

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading profile...</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner shrink-0">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Profile Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Manage your personal information, emergency contacts, and documents.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-line">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn("pb-3 text-[14px] font-semibold transition-colors border-b-2", activeTab === "profile" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink")}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("emergency")}
          className={cn("pb-3 text-[14px] font-semibold transition-colors border-b-2", activeTab === "emergency" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink")}
        >
          Emergency Contacts
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={cn("pb-3 text-[14px] font-semibold transition-colors border-b-2", activeTab === "documents" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink")}
        >
          Documents
        </button>
      </div>

      {profileMsg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          profileMsg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {profileMsg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {profileMsg.text}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="space-y-8 animate-fade-in">
          {/* Avatar Section */}
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-8 items-start sm:items-center flex-1 pt-9">
              <div className="relative group">
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-b from-bone to-bone-2 grid place-items-center overflow-hidden shadow-md border-[3px] border-white ring-1 ring-line shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-14 h-14 text-muted/60" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-paper rounded-full p-1.5 shadow-sm border border-line">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className="block text-[14px] font-semibold text-ink mb-1.5">Avatar URL</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="input w-full max-w-md h-11 bg-bone/30 focus:bg-paper"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <p className="text-[13px] text-muted">Provide a valid image URL to update your profile picture across the workspace.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            {/* Personal Info */}
            <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow relative">
              <div className="p-6 sm:p-8 space-y-8 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-ink">Personal Info</h4>
                    <p className="text-[13px] text-muted">Update your identity and details.</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink">Prefix</label>
                      <select value={prefix} onChange={e => setPrefix(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper cursor-pointer">
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink">First Name</label>
                      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper" />
                    </div>
                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink">Last Name</label>
                      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted" /> Mobile
                      </label>
                      <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper" placeholder="+91 9876543210" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">Gender</label>
                      <select value={gender} onChange={e => setGender(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper cursor-pointer">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow relative">
              <div className="p-6 sm:p-8 space-y-8 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Lock className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-ink">Account Settings</h4>
                    <p className="text-[13px] text-muted">Login, password, and region.</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">Email Address</label>
                    <div className="relative">
                      <input type="email" value={user.email} disabled className="input w-full h-11 bg-bone text-muted cursor-not-allowed opacity-80 pl-10" />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                        <Mail className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">Your Password</label>
                    <div className="relative">
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="input w-full h-11 bg-bone/30 focus:bg-paper pl-10" />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[12px] text-muted mt-1">Must have at least 8 characters.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted" /> Country
                      </label>
                      <select value={country} onChange={e => setCountry(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper cursor-pointer">
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Canada">Canada</option>
                        <option value="Germany">Germany</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                        <Languages className="w-4 h-4 text-muted" /> Language
                      </label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} className="input w-full h-11 bg-bone/30 focus:bg-paper cursor-pointer">
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted" /> Timezone
                    </label>
                    <div className="relative">
                      <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10">
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrations & Notifications */}
            <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow relative lg:col-span-2">
              <div className="p-6 sm:p-8 space-y-8 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-ink">Integrations & Notifications</h4>
                    <p className="text-[13px] text-muted">Manage calendar and email preferences.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Email Notifications */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-line bg-bone/20">
                    <div>
                      <h5 className="text-[14.5px] font-semibold text-ink mb-1">Receive email notifications?</h5>
                      <p className="text-[13px] text-muted">Get daily digests and important alerts.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={receiveEmailNotifications} onChange={() => setReceiveEmailNotifications(true)} className="w-4 h-4 text-accent border-line focus:ring-accent" />
                        <span className="text-[13px] font-medium text-ink">Enable</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!receiveEmailNotifications} onChange={() => setReceiveEmailNotifications(false)} className="w-4 h-4 text-accent border-line focus:ring-accent" />
                        <span className="text-[13px] font-medium text-ink">Disable</span>
                      </label>
                    </div>
                  </div>

                  {/* Google Calendar */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-line bg-bone/20">
                    <div>
                      <h5 className="text-[14.5px] font-semibold text-ink mb-1">Enable Google Calendar</h5>
                      <p className="text-[13px] text-muted">Sync your schedule automatically.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={enableGoogleCalendar} onChange={() => setEnableGoogleCalendar(true)} className="w-4 h-4 text-accent border-line focus:ring-accent" />
                        <span className="text-[13px] font-medium text-ink">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!enableGoogleCalendar} onChange={() => setEnableGoogleCalendar(false)} className="w-4 h-4 text-accent border-line focus:ring-accent" />
                        <span className="text-[13px] font-medium text-ink">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button
              onClick={() => mutation.mutate({ 
                first_name: firstName, 
                last_name: lastName, 
                timezone,
                avatar,
                prefix,
                mobile,
                country,
                language,
                gender,
                receive_email_notifications: receiveEmailNotifications,
                enable_google_calendar: enableGoogleCalendar
              })}
              disabled={mutation.isPending}
              className="btn btn-primary shadow-md hover:shadow-lg transition-all h-11 px-8 rounded-xl font-semibold flex items-center gap-2 "
            >
              {mutation.isPending ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "emergency" && (
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-line flex items-center justify-between bg-bone/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <HeartPulse className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Emergency Contacts</h4>
                <p className="text-[13px] text-muted">People to contact in case of an emergency.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowEmergencyModal(true)}
              className="btn btn-primary h-9 px-4 rounded-lg text-[13px] btn-primary bg-rose-500 border-rose-500 hover:bg-rose-600 text-white dark:text-white dark:bg-rose-600 dark:hover:bg-rose-700 flex items-center gap-2 shadow-sm border border-rose-600/50"
            >
              <Plus className="w-4 h-4" /> Create New
            </button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-bone/30">
                  <th className="py-3 px-6 text-[12px] font-semibold text-muted uppercase tracking-wider">Name</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-muted uppercase tracking-wider">Email</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-muted uppercase tracking-wider">Mobile</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-muted uppercase tracking-wider">Relationship</th>
                  <th className="py-3 px-6 text-[12px] font-semibold text-muted uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {user.emergency_contacts && user.emergency_contacts.length > 0 ? (
                  user.emergency_contacts.map((contact, idx) => (
                    <tr key={idx} className="border-b border-line hover:bg-bone/30 transition-colors">
                      <td className="py-3 px-6 text-[13px] text-ink font-medium">{contact.name}</td>
                      <td className="py-3 px-6 text-[13px] text-muted">{contact.email || "-"}</td>
                      <td className="py-3 px-6 text-[13px] text-muted">{contact.mobile}</td>
                      <td className="py-3 px-6 text-[13px] text-muted">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          {contact.relationship}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-[13px] text-right">
                        <button 
                          onClick={() => {
                            const newContacts = [...user.emergency_contacts];
                            newContacts.splice(idx, 1);
                            mutation.mutate({ emergency_contacts: newContacts } as any);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-muted">
                      <div className="flex flex-col items-center justify-center">
                        <HeartPulse className="w-8 h-8 text-muted/30 mb-3" />
                        <p className="text-[13px]">- No record found. -</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-line flex items-center justify-between bg-bone/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Personal Documents</h4>
                <p className="text-[13px] text-muted">Upload and manage your identity documents.</p>
              </div>
            </div>
            <button className="btn btn-primary h-9 px-4 rounded-lg text-[13px] btn-primary flex items-center gap-2 shadow-sm border border-indigo-600/50">
              <Plus className="w-4 h-4" /> Add Files
            </button>
          </div>
          <div className="py-24 flex flex-col items-center justify-center text-muted bg-bone/10">
            <UploadCloud className="w-10 h-10 text-muted/30 mb-3" />
            <p className="text-[13px]">- No file uploaded. -</p>
          </div>
        </div>
      )}

      {/* Emergency Contact Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowEmergencyModal(false)} />
          <div className="relative w-full max-w-md bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-rise" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="p-5 border-b border-line flex items-center justify-between bg-bone/20 shrink-0">
              <h3 className="font-serif text-[18px] text-ink flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                Add Emergency Contact
              </h3>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-1.5 hover:bg-bone-2 rounded-md border border-transparent hover:border-line text-muted hover:text-ink transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[13px] font-medium text-ink-2 block mb-1.5">Contact Name</span>
                  <input type="text" className="input" placeholder="e.g., John Doe" value={newEmergencyContact.name} onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[13px] font-medium text-ink-2 block mb-1.5">Relationship</span>
                  <select className="input" value={newEmergencyContact.relationship} onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, relationship: e.target.value })}>
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[13px] font-medium text-ink-2 block mb-1.5">Mobile Number</span>
                  <input type="tel" className="input" placeholder="e.g., +1 234 567 890" value={newEmergencyContact.mobile} onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, mobile: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[13px] font-medium text-ink-2 block mb-1.5">Email (Optional)</span>
                  <input type="email" className="input" placeholder="e.g., john@example.com" value={newEmergencyContact.email} onChange={(e) => setNewEmergencyContact({ ...newEmergencyContact, email: e.target.value })} />
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-line bg-bone flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowEmergencyModal(false)} 
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!newEmergencyContact.name || !newEmergencyContact.mobile) {
                    setProfileMsg({ type: "error", text: "Name and Mobile are required for an emergency contact." });
                    return;
                  }
                  
                  const updatedContacts = [...(user.emergency_contacts || []), newEmergencyContact];
                  mutation.mutate({ emergency_contacts: updatedContacts } as any);
                  setNewEmergencyContact({ name: "", relationship: "", mobile: "", email: "" });
                  setShowEmergencyModal(false);
                }} 
                className="btn btn-primary bg-rose-500 border-rose-500 hover:bg-rose-600 text-white dark:text-white dark:bg-rose-600 dark:hover:bg-rose-700 text-sm"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
