"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserCircle, Building2, Bell, Shield, Loader2, Layers, Zap, 
  CheckCircle, XCircle, Mail, Calendar, MapPin, MonitorSmartphone, 
  IndianRupee, CreditCard, DollarSign, FileSignature, Percent, 
  Ticket as TicketIcon, FolderOpen, Clock, CalendarDays, 
  ShieldCheck, Target, Timer, CheckSquare, Palette, Blocks, 
  Link, Receipt, Users, Search, FolderGit2,
  ChevronLeft, Copy, ExternalLink, Trash2, Plus
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateProfile, updateCompany, updatePassword } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsSettings } from "@/components/custom-fields-settings";
import { WorkflowsSettings } from "@/components/workflows-settings";
import { EmailSettings } from "@/components/email-settings";
import { CalendarSettings } from "@/components/calendar-settings";
import { HRSettings } from "@/components/hr-settings";
import { EmptyState } from "@/components/empty-state";
import { FinanceSettingsForm } from "@/components/finance-settings";
import { ContractSettingsForm } from "@/components/contract-settings";
import { TaxSettingsForm } from "@/components/tax-settings";
import { TicketSettingsForm } from "@/components/ticket-settings";
import { ProjectSettingsForm } from "@/components/project-settings";
import { AttendanceSettingsForm } from "@/components/attendance-settings";
import { LeavesSettingsForm } from "@/components/leaves-settings";
import { RolesPermissionsForm } from "@/components/roles-permissions-settings";
import { LeadSettingsForm } from "@/components/lead-settings";
import { TimeLogSettingsForm } from "@/components/time-log-settings";
import { TaskSettingsForm } from "@/components/task-settings";
import { AppSettingsForm } from "@/components/app-settings";
import { BusinessAddressForm } from "@/components/business-address-settings";
import { ProfileForm } from "@/components/profile-settings";
import { WorkspaceForm } from "@/components/workspace-settings";
import { SecurityForm } from "@/components/security-settings";
import { CurrencySettingsForm } from "@/components/currency-settings";
import { PaymentCredentialsForm } from "@/components/payment-credentials-settings";
import { ThemeSettingsForm } from "@/components/theme-settings";
import { ModuleSettingsForm } from "@/components/module-settings";
import { CustomLinkSettingsForm } from "@/components/custom-link-settings";
import { NotificationsForm } from "@/components/notifications-settings";
import { BillingSettings } from "@/components/billing-settings";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { id: "company", label: "Company Settings", icon: Building2 },
  { id: "business_address", label: "Business Address", icon: MapPin },
  { id: "app", label: "App Settings", icon: MonitorSmartphone },
  { id: "profile", label: "Profile Settings", icon: UserCircle },
  { id: "notifications", label: "Notification Settings", icon: Bell },
  { id: "currency", label: "Currency Settings", icon: IndianRupee },
  { id: "payment", label: "Payment Credentials", icon: CreditCard },
  { id: "finance", label: "Finance Settings", icon: DollarSign },
  { id: "contract", label: "Contract Settings", icon: FileSignature },
  { id: "tax", label: "Tax Settings", icon: Percent },
  { id: "ticket", label: "Ticket Settings", icon: TicketIcon },
  { id: "project", label: "Project Settings", icon: FolderOpen },
  { id: "attendance", label: "Attendance Settings", icon: Clock },
  { id: "leaves", label: "Leaves Settings", icon: CalendarDays },
  { id: "custom_fields", label: "Custom Fields", icon: Layers },
  { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
  { id: "lead", label: "Lead Settings", icon: Target },
  { id: "time_log", label: "Time Log Settings", icon: Timer },
  { id: "task", label: "Task Settings", icon: CheckSquare },
  { id: "security", label: "Security Settings", icon: Shield },
  { id: "theme", label: "Theme Settings", icon: Palette },
  { id: "module", label: "Module Settings", icon: Blocks },
  { id: "workflows", label: "Workflows", icon: Zap },
  { id: "hr", label: "HR & Staff", icon: Users },
  { id: "email", label: "Email Integrations", icon: Mail },
  { id: "google_calendar", label: "Google Calendar Settings", icon: Calendar },
  { id: "custom_link", label: "Custom Link Settings", icon: Link },
  { id: "billing", label: "Billing", icon: Receipt },
];

export default function SettingsPage() {
  const { data: user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("company");
  const [showMenuOnMobile, setShowMenuOnMobile] = useState(true);
  const [search, setSearch] = useState("");

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";
  const isManagerOrAbove = isOwnerOrAdmin || user?.role === "manager" || user?.has_management_access;

  const filteredTabs = SETTINGS_TABS.filter(tab => 
    tab.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-7 max-w-[1400px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 shrink-0 animate-rise">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
            <span className="w-[18px] h-px bg-accent" />
            System Preferences
          </div>
          <h1 className="font-serif text-[40px] md:text-[56px] leading-none text-ink">Settings</h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start animate-fade-in relative">
        
        {/* Sidebar Nav */}
        <div className={cn(
          "w-full md:w-64 shrink-0 flex flex-col md:sticky md:top-[100px] md:max-h-[calc(100vh-140px)] bg-paper rounded-xl border border-line shadow-sm overflow-hidden",
          showMenuOnMobile ? "block" : "hidden md:flex"
        )}>
          <div className="p-4 border-b border-line shrink-0 bg-bone/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search settings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                name="settings-search"
                id="settings-search"
                className="w-full pl-9 pr-3 py-2 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
            {filteredTabs.length === 0 && (
              <div className="text-center py-6 text-sm text-muted">
                No sections found.
              </div>
            )}
            {filteredTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              // Simple permission logic for demo
              const requiresAdmin = ["company", "custom_fields", "workflows", "roles", "billing", "hr"].includes(tab.id);
              if (requiresAdmin && !isOwnerOrAdmin) return null;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowMenuOnMobile(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors text-left",
                    isActive 
                      ? "bg-accent/10 text-accent font-semibold" 
                      : "text-ink-2 hover:bg-bone hover:text-ink"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isActive ? "text-accent" : "text-muted")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 w-full max-w-4xl relative animate-rise",
          showMenuOnMobile ? "hidden md:block" : "block",
          activeTab !== "notifications" 
            ? "bg-paper border border-line rounded-xl shadow-sm" 
            : ""
        )}>
          <div className={cn(activeTab !== "notifications" ? "p-8 md:p-10" : "h-full")}>
            
            {/* Back to Menu Button on Mobile */}
            {!showMenuOnMobile && (
              <button 
                onClick={() => setShowMenuOnMobile(true)}
                className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-accent mb-6 bg-bone-2 px-3 py-1.5 rounded-lg border border-line transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Settings Menu
              </button>
            )}

            {/* Active Component Routing */}
            {activeTab === "company" && <WorkspaceForm />}
            {activeTab === "business_address" && <BusinessAddressForm />}
            {activeTab === "app" && <AppSettingsForm />}
            {activeTab === "currency" && <CurrencySettingsForm />}
            {activeTab === "payment" && <PaymentCredentialsForm />}
            {activeTab === "finance" && <FinanceSettingsForm />}
            {activeTab === "contract" && <ContractSettingsForm />}
            {activeTab === "tax" && <TaxSettingsForm />}
            {activeTab === "ticket" && <TicketSettingsForm />}
            {activeTab === "project" && <ProjectSettingsForm />}
            {activeTab === "attendance" && <AttendanceSettingsForm />}
            {activeTab === "leaves" && <LeavesSettingsForm />}
            {activeTab === "roles" && <RolesPermissionsForm />}
            {activeTab === "lead" && <LeadSettingsForm />}
            {activeTab === "time_log" && <TimeLogSettingsForm />}
            {activeTab === "task" && <TaskSettingsForm />}
            {activeTab === "profile" && <ProfileForm />}
            {activeTab === "notifications" && <NotificationsForm />}
            {activeTab === "security" && <SecurityForm />}
            {activeTab === "theme" && <ThemeSettingsForm />}
            {activeTab === "module" && <ModuleSettingsForm />}
            {activeTab === "custom_fields" && <CustomFieldsSettings />}
            {activeTab === "workflows" && <WorkflowsSettings />}
            {activeTab === "hr" && <HRSettings />}
            {activeTab === "email" && <EmailSettings />}
            {activeTab === "google_calendar" && <CalendarSettings />}
            {activeTab === "custom_link" && <CustomLinkSettingsForm />}
            {activeTab === "billing" && <BillingSettings />}
            
            {/* Placeholder for unimplemented tabs */}
            {!["company", "business_address", "app", "currency", "payment", "finance", "contract", "tax", "ticket", "project", "attendance", "leaves", "roles", "lead", "time_log", "task", "profile", "notifications", "security", "theme", "module", "custom_fields", "workflows", "hr", "email", "google_calendar", "custom_link", "billing"].includes(activeTab) && (
              <PlaceholderForm tabId={activeTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderForm({ tabId }: { tabId: string }) {
  const tab = SETTINGS_TABS.find((t) => t.id === tabId);
  if (!tab) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">{tab.label}</h3>
        <p className="text-[14px] text-muted">Configure your preferences and options for {tab.label.toLowerCase()}.</p>
      </div>

      <div className="bg-paper border border-line rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-12 text-center relative">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-accent/5 opacity-40 blur-[100px]"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-paper to-bone border border-line shadow-sm grid place-items-center mb-6">
            <tab.icon className="w-8 h-8 text-ink/40" />
          </div>
          <h4 className="text-[17px] font-semibold text-ink tracking-tight mb-2">Under Construction</h4>
          <p className="text-[14px] text-muted max-w-md mx-auto leading-relaxed">
            The <span className="font-medium text-ink">{tab.label}</span> module is currently being built and will be available soon in the next release update. Our team is working hard to bring you these features.
          </p>
        </div>
      </div>
    </div>
  );
}
