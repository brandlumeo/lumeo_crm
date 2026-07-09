"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Clock, Loader2, CheckCircle, XCircle, Shield, 
  Timer, HelpCircle, Plus, Edit, Trash2, X, RotateCw, Settings
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentCompany, useCurrentUser, useTeam } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

type EmployeeShift = {
  id: string;
  name: string;
  color: string;
  startTime: string;
  halfDayTime: string;
  endTime: string;
  lateMarkAfter: number;
  maxCheckIn: number;
  officeOpensOn: string[];
  isDefault: boolean;
};

type ShiftRotation = {
  id: string;
  name: string;
  numberOfEmployees: number;
  replaceExisting: boolean;
  sendNotification: boolean;
  status: string;
};

type AutomatedShift = {
  id: string;
  department: string;
  employees: string[];
  rotationName: string;
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function AttendanceSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const { data: teamData } = useTeam();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("rotation");

  // Office Timings
  const [officeStartTime, setOfficeStartTime] = useState("09:00:00");
  const [officeEndTime, setOfficeEndTime] = useState("18:00:00");
  const [lateMarkAfter, setLateMarkAfter] = useState("15");

  // Advanced Attendance Settings
  const [allowShiftChange, setAllowShiftChange] = useState(true);
  const [saveClockInLocation, setSaveClockInLocation] = useState(true);
  const [allowSelfClockIn, setAllowSelfClockIn] = useState(true);
  const [autoClockInFirstSignIn, setAutoClockInFirstSignIn] = useState(false);
  const [clockInLocationRadius, setClockInLocationRadius] = useState(false);
  const [allowClockInOutsideShift, setAllowClockInOutsideShift] = useState(false);
  const [clockInIpAddress, setClockInIpAddress] = useState(false);
  const [sendMonthlyReport, setSendMonthlyReport] = useState(true);

  // Dropdowns and Toggles
  const [emailReportRole, setEmailReportRole] = useState("Primary Admin");
  const [weekStartsFrom, setWeekStartsFrom] = useState("Monday");
  const [reminderStatus, setReminderStatus] = useState(false);

  // Shifts State
  const shifts: EmployeeShift[] = company?.employee_shifts ?? [];
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
  
  const [shiftName, setShiftName] = useState("");
  const [shiftColor, setShiftColor] = useState("#3b82f6");
  const [shiftStartTime, setShiftStartTime] = useState("09:00");
  const [shiftHalfDayTime, setShiftHalfDayTime] = useState("13:00");
  const [shiftEndTime, setShiftEndTime] = useState("18:00");
  const [shiftLateMarkAfter, setShiftLateMarkAfter] = useState("30");
  const [shiftMaxCheckIn, setShiftMaxCheckIn] = useState("2");
  const [shiftOfficeOpensOn, setShiftOfficeOpensOn] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

  // Rotations State
  const rotations: ShiftRotation[] = company?.shift_rotations ?? [];
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false);
  const [editingRotationIndex, setEditingRotationIndex] = useState<number | null>(null);
  
  const [rotationName, setRotationName] = useState("");
  const [rotationEmployees, setRotationEmployees] = useState("0");
  const [rotationReplaceExisting, setRotationReplaceExisting] = useState(false);
  const [rotationSendNotification, setRotationSendNotification] = useState(false);
  const [rotationStatus, setRotationStatus] = useState("active");

  // Automate Shifts State
  const automatedShifts: AutomatedShift[] = company?.automated_shifts ?? [];
  const [isAutomateModalOpen, setIsAutomateModalOpen] = useState(false);
  
  const [automateDepartment, setAutomateDepartment] = useState("");
  const [automateEmployees, setAutomateEmployees] = useState<string[]>([]);
  const [automateRotationName, setAutomateRotationName] = useState("");

  // Weekend & Off-Day Policy
  const [weekendPolicy, setWeekendPolicy] = useState<Record<string, string[]>>({
    "0": [], "1": [], "2": [], "3": [], "4": [], "5": ["all"], "6": ["all"]
  });

  useEffect(() => {
    if (company) {
      setOfficeStartTime(company.office_start_time ?? "09:00:00");
      setOfficeEndTime(company.office_end_time ?? "18:00:00");
      setLateMarkAfter(company.late_mark_after_minutes?.toString() ?? "15");

      setAllowShiftChange(company.allow_shift_change_request ?? true);
      setSaveClockInLocation(company.save_clock_in_location ?? true);
      setAllowSelfClockIn(company.allow_self_clock_in ?? true);
      setAutoClockInFirstSignIn(company.auto_clock_in_first_sign_in ?? false);
      setClockInLocationRadius(company.clock_in_location_radius_check ?? false);
      setAllowClockInOutsideShift(company.allow_clock_in_outside_shift ?? false);
      setClockInIpAddress(company.clock_in_ip_address_check ?? false);
      setSendMonthlyReport(company.send_monthly_attendance_report ?? true);

      setEmailReportRole(company.email_report_role ?? "Primary Admin");
      setWeekStartsFrom(company.week_starts_from ?? "Monday");
      setReminderStatus(company.attendance_reminder_status ?? false);
      if (company.weekend_policy) {
        setWeekendPolicy(company.weekend_policy);
      }
    }
  }, [company]);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      toast.success("Attendance settings saved successfully.");
      setIsShiftModalOpen(false);
      setIsRotationModalOpen(false);
    },
    onError: () => {
      toast.error("Failed to update attendance settings. Please try again.");
    },
  });

  const handleSaveGeneral = () => {
    mutation.mutate({
      office_start_time: officeStartTime,
      office_end_time: officeEndTime,
      late_mark_after_minutes: parseInt(lateMarkAfter) || 0,
      
      allow_shift_change_request: allowShiftChange,
      save_clock_in_location: saveClockInLocation,
      allow_self_clock_in: allowSelfClockIn,
      auto_clock_in_first_sign_in: autoClockInFirstSignIn,
      clock_in_location_radius_check: clockInLocationRadius,
      allow_clock_in_outside_shift: allowClockInOutsideShift,
      clock_in_ip_address_check: clockInIpAddress,
      send_monthly_attendance_report: sendMonthlyReport,
      
      email_report_role: emailReportRole,
      week_starts_from: weekStartsFrom,
      attendance_reminder_status: reminderStatus,
      weekend_policy: weekendPolicy
    });
  };

  // Shift Handlers
  const handleOpenAddShift = () => {
    setEditingShiftIndex(null);
    setShiftName("");
    setShiftColor("#3b82f6");
    setShiftStartTime("09:00");
    setShiftHalfDayTime("13:00");
    setShiftEndTime("18:00");
    setShiftLateMarkAfter("30");
    setShiftMaxCheckIn("2");
    setShiftOfficeOpensOn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (index: number) => {
    const s = shifts[index];
    setEditingShiftIndex(index);
    setShiftName(s.name);
    setShiftColor(s.color || "#3b82f6");
    setShiftStartTime(s.startTime);
    setShiftHalfDayTime(s.halfDayTime);
    setShiftEndTime(s.endTime);
    setShiftLateMarkAfter(s.lateMarkAfter.toString());
    setShiftMaxCheckIn(s.maxCheckIn.toString());
    setShiftOfficeOpensOn(s.officeOpensOn || []);
    setIsShiftModalOpen(true);
  };

  const handleDeleteShift = (index: number) => {
    if (!isAdmin) return;
    if (shifts[index].isDefault) {
      alert("You cannot delete the default shift. Please set another shift as default first.");
      return;
    }
    if (confirm("Are you sure you want to remove this shift?")) {
      const newShifts = [...shifts];
      newShifts.splice(index, 1);
      mutation.mutate({ employee_shifts: newShifts });
    }
  };

  const handleSetDefaultShift = (index: number) => {
    if (!isAdmin) return;
    const newShifts = shifts.map((shift, i) => ({
      ...shift,
      isDefault: i === index
    }));
    mutation.mutate({ employee_shifts: newShifts });
  };

  const handleSaveShiftModal = () => {
    if (!shiftName) return;
    const newShifts = [...shifts];
    
    const shiftData: EmployeeShift = {
      id: editingShiftIndex !== null ? newShifts[editingShiftIndex].id : Date.now().toString(),
      name: shiftName,
      color: shiftColor,
      startTime: shiftStartTime,
      halfDayTime: shiftHalfDayTime,
      endTime: shiftEndTime,
      lateMarkAfter: parseInt(shiftLateMarkAfter) || 0,
      maxCheckIn: parseInt(shiftMaxCheckIn) || 0,
      officeOpensOn: shiftOfficeOpensOn,
      isDefault: editingShiftIndex !== null ? newShifts[editingShiftIndex].isDefault : newShifts.length === 0
    };

    if (editingShiftIndex !== null) {
      newShifts[editingShiftIndex] = shiftData;
    } else {
      newShifts.push(shiftData);
    }
    mutation.mutate({ employee_shifts: newShifts });
  };

  const toggleDay = (day: string) => {
    if (shiftOfficeOpensOn.includes(day)) {
      setShiftOfficeOpensOn(shiftOfficeOpensOn.filter(d => d !== day));
    } else {
      setShiftOfficeOpensOn([...shiftOfficeOpensOn, day]);
    }
  };

  // Rotation Handlers
  const handleOpenAddRotation = () => {
    setEditingRotationIndex(null);
    setRotationName("");
    setRotationEmployees("0");
    setRotationReplaceExisting(false);
    setRotationSendNotification(false);
    setRotationStatus("active");
    setIsRotationModalOpen(true);
  };

  const handleOpenEditRotation = (index: number) => {
    const r = rotations[index];
    setEditingRotationIndex(index);
    setRotationName(r.name);
    setRotationEmployees((r.numberOfEmployees || 0).toString());
    setRotationReplaceExisting(r.replaceExisting);
    setRotationSendNotification(r.sendNotification);
    setRotationStatus(r.status);
    setIsRotationModalOpen(true);
  };

  const handleDeleteRotation = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this shift rotation?")) {
      const newRotations = [...rotations];
      newRotations.splice(index, 1);
      mutation.mutate({ shift_rotations: newRotations }, {
        onSuccess: () => {
          toast.success("Shift rotation deleted successfully.");
        }
      });
    }
  };

  const handleSaveRotationModal = () => {
    if (!rotationName) return;
    const newRotations = [...rotations];
    
    const rotationData: ShiftRotation = {
      id: editingRotationIndex !== null ? newRotations[editingRotationIndex].id : Date.now().toString(),
      name: rotationName,
      numberOfEmployees: parseInt(rotationEmployees) || 0,
      replaceExisting: rotationReplaceExisting,
      sendNotification: rotationSendNotification,
      status: rotationStatus,
    };

    if (editingRotationIndex !== null) {
      newRotations[editingRotationIndex] = rotationData;
    } else {
      newRotations.push(rotationData);
    }
    mutation.mutate({ shift_rotations: newRotations }, {
      onSuccess: () => {
        setIsRotationModalOpen(false);
        toast.success(`Shift rotation ${editingRotationIndex !== null ? 'updated' : 'added'} successfully.`);
      }
    });
  };

  // Automate Shifts Handlers
  const handleSaveAutomateModal = () => {
    if (!automateRotationName) return;
    const newAutomatedShifts = [...automatedShifts];
    newAutomatedShifts.push({
      id: Date.now().toString(),
      department: automateDepartment,
      employees: automateEmployees,
      rotationName: automateRotationName
    });
    mutation.mutate({ automated_shifts: newAutomatedShifts }, {
      onSuccess: () => {
        setIsAutomateModalOpen(false);
        toast.success("Automated shift added successfully.");
      }
    });
  };

  const handleDeleteAutomatedShift = (index: number) => {
    const newAutomatedShifts = [...automatedShifts];
    newAutomatedShifts.splice(index, 1);
    mutation.mutate({ automated_shifts: newAutomatedShifts }, {
      onSuccess: () => {
        toast.success("Automated shift deleted successfully.");
      }
    });
  };


  // Helper to format time strings (e.g. "09:00" -> "09:00 am")
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const tabs = [
    { id: "attendance", label: "Attendance Settings" },
    { id: "shifts", label: "Employee Shifts" },
    { id: "rotation", label: "Shift Rotation" },
    { id: "qrcode", label: "QR Code" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Info */}
      <div className="flex items-start gap-5 pb-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center border border-cyan-500/20 shadow-inner shrink-0">
          <Clock className="w-7 h-7 text-cyan-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Attendance Settings</h3>
          <p className="text-[14px] text-muted max-w-lg leading-relaxed">
            Configure default office hours, attendance tracking policies, and shifts.
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify attendance settings.</span>
        </div>
      )}

      {/* Top Action Button Placeholder Container */}
      <div className="flex gap-2 mb-2 min-h-9">
        {isAdmin && activeTab === "shifts" && (
          <button onClick={handleOpenAddShift} className="btn btn-primary shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add New Shift
          </button>
        )}
        
        {isAdmin && activeTab === "rotation" && (
          <>
            <button onClick={handleOpenAddRotation} className="btn btn-primary shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
              <Plus className="w-4 h-4" /> Add New Shift Rotation
            </button>
            <button onClick={() => setIsAutomateModalOpen(true)} className="btn btn-primary shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
              <Settings className="w-4 h-4" /> Automate Shifts
            </button>
            <button onClick={() => alert("Rotation run successfully initiated.")} className="btn btn-primary shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
              <RotateCw className="w-4 h-4" /> Run Rotation
            </button>
          </>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-paper border border-line shadow-sm overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>
        
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-line px-2 mt-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-4 text-[13.5px] font-medium transition-colors whitespace-nowrap border-b-2",
                activeTab === tab.id 
                  ? "border-rose-500 text-rose-600" 
                  : "border-transparent text-muted hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-0 min-h-[400px]">
          
          {activeTab === "attendance" && (
            <div className="p-8 space-y-8">
              
              {/* Checkboxes List */}
              <div className="space-y-4">
                <CheckboxItem 
                  label="Allow employee to request shift change" 
                  checked={allowShiftChange} onChange={setAllowShiftChange} disabled={!isAdmin} 
                />
                <CheckboxItem 
                  label="Save Clock-In Location" 
                  checked={saveClockInLocation} onChange={setSaveClockInLocation} disabled={!isAdmin} 
                />
                <CheckboxItem 
                  label="Allowed Employee self Clock-In/Clock-Out" 
                  checked={allowSelfClockIn} onChange={setAllowSelfClockIn} disabled={!isAdmin} 
                />
                <CheckboxItem 
                  label="Auto clock-in employee by first sign in" 
                  checked={autoClockInFirstSignIn} onChange={setAutoClockInFirstSignIn} disabled={!isAdmin} 
                />
                <CheckboxItem 
                  label="Clock-in check with added location Radius" 
                  checked={clockInLocationRadius} onChange={setClockInLocationRadius} disabled={!isAdmin} 
                />
                <CheckboxItem 
                  label="Allow clock-in outside shift hours" 
                  checked={allowClockInOutsideShift} onChange={setAllowClockInOutsideShift} disabled={!isAdmin} 
                />
                <CheckboxItem 
                  label="Clock-in check with added IP address" 
                  checked={clockInIpAddress} onChange={setClockInIpAddress} disabled={!isAdmin} 
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sendMonthlyReport}
                    onChange={(e) => setSendMonthlyReport(e.target.checked)}
                    disabled={!isAdmin}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label className="text-[13px] text-ink flex items-center gap-1.5 cursor-pointer">
                    Send monthly attendance report email
                    <HelpCircle className="w-4 h-4 text-muted/70" />
                  </label>
                </div>
              </div>

              {/* Weekend Policy */}
              <div className="border-t border-line/60 pt-8 mt-8">
                <h4 className="text-[14px] font-semibold text-ink mb-1">Global Weekend & Off-Day Policy</h4>
                <p className="text-[13px] text-muted mb-4">Select which weeks of the month each day is considered a day off.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    { id: "0", label: "Monday" },
                    { id: "1", label: "Tuesday" },
                    { id: "2", label: "Wednesday" },
                    { id: "3", label: "Thursday" },
                    { id: "4", label: "Friday" },
                    { id: "5", label: "Saturday" },
                    { id: "6", label: "Sunday" }
                  ].map(day => (
                    <div key={day.id} className="bg-paper border border-line rounded-lg p-3">
                      <label className="text-[13px] font-medium text-ink block mb-2">{day.label}</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "all", label: "All Weeks" },
                          { id: "1", label: "1st" },
                          { id: "2", label: "2nd" },
                          { id: "3", label: "3rd" },
                          { id: "4", label: "4th" },
                          { id: "5", label: "5th" },
                        ].map(opt => {
                          const isSelected = weekendPolicy[day.id]?.includes(opt.id) || (opt.id !== 'all' && weekendPolicy[day.id]?.includes('all'));
                          return (
                            <button
                              key={opt.id}
                              disabled={!isAdmin}
                              onClick={() => {
                                setWeekendPolicy(prev => {
                                  const current = prev[day.id] || [];
                                  let next = [...current];
                                  if (opt.id === 'all') {
                                    next = current.includes('all') ? [] : ['all'];
                                  } else {
                                    if (next.includes('all')) next = [];
                                    if (next.includes(opt.id)) {
                                      next = next.filter(i => i !== opt.id);
                                    } else {
                                      next.push(opt.id);
                                    }
                                  }
                                  return { ...prev, [day.id]: next };
                                });
                              }}
                              className={cn(
                                "px-2 py-1 text-[11px] font-medium rounded transition-colors",
                                isSelected 
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                  : "bg-bone-2 text-muted border border-transparent hover:bg-bone"
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles & Week Start & Reminder Row */}
              <div className="space-y-6 pt-2">
                <div className="space-y-1.5 max-w-md">
                  <label className="text-[13px] text-muted flex items-center gap-1">
                    Choose roles for email report <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={emailReportRole}
                    onChange={(e) => setEmailReportRole(e.target.value)}
                    disabled={!isAdmin}
                    className="input w-full h-11 bg-paper text-[13.5px]"
                  >
                    <option value="Primary Admin">Primary Admin</option>
                    <option value="Secondary Admin">Secondary Admin</option>
                    <option value="HR">HR</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-12">
                  <div className="space-y-1.5 w-64">
                    <label className="text-[13px] text-muted flex items-center gap-1">
                      Week Starts From <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={weekStartsFrom}
                      onChange={(e) => setWeekStartsFrom(e.target.value)}
                      disabled={!isAdmin}
                      className="input w-full h-11 bg-paper text-[13.5px]"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Sunday">Sunday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[13px] text-muted block mt-1">
                      Attendance Reminder Status
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reminderStatus}
                        disabled={!isAdmin}
                        onChange={(e) => setReminderStatus(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Legacy Office Timings */}
              <div className="border-t border-line/60 pt-8 mt-8 hidden">
                <h4 className="text-[14px] font-semibold text-ink mb-4">Standard Office Timings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-muted" /> Start Time
                    </label>
                    <input
                      type="time" step="60" value={officeStartTime} onChange={(e) => setOfficeStartTime(e.target.value)} disabled={!isAdmin}
                      className="input w-full h-10 bg-bone/30 focus:bg-paper font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-muted" /> End Time
                    </label>
                    <input
                      type="time" step="60" value={officeEndTime} onChange={(e) => setOfficeEndTime(e.target.value)} disabled={!isAdmin}
                      className="input w-full h-10 bg-bone/30 focus:bg-paper font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">Late Mark After (min)</label>
                    <input
                      type="number" min="0" value={lateMarkAfter} onChange={(e) => setLateMarkAfter(e.target.value)} disabled={!isAdmin}
                      className="input w-full h-10 bg-bone/30 focus:bg-paper font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {isAdmin && (
                <div className="pt-6">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={mutation.isPending}
                    className="btn btn-primary shadow-sm transition-all h-10 px-6 rounded font-medium flex items-center gap-2"
                  >
                    {mutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Save</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "shifts" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-paper border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-4 px-6 w-40">Name</th>
                      <th className="py-4 px-6 w-48">Time</th>
                      <th className="py-4 px-6">Others</th>
                      <th className="py-4 px-6 text-right w-40">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Clock className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No employee shifts added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      shifts.map((shift, index) => (
                        <tr key={shift.id} className="hover:bg-bone/30 transition-colors group">
                          <td className="py-4 px-6 align-top">
                            <span 
                              className="px-2.5 py-1 text-white text-[12.5px] rounded whitespace-nowrap inline-block"
                              style={{ backgroundColor: shift.color || "#3b82f6" }}
                            >
                              {shift.name}
                            </span>
                          </td>
                          <td className="py-4 px-6 align-top space-y-1.5 text-ink/80 text-[12.5px] whitespace-nowrap">
                            <div><span className="text-muted">Start Time:</span> {formatTime(shift.startTime)}</div>
                            <div><span className="text-muted">Half Day:</span> {formatTime(shift.halfDayTime)}</div>
                            <div><span className="text-muted">End Time:</span> {formatTime(shift.endTime)}</div>
                          </td>
                          <td className="py-4 px-6 align-top space-y-1.5 text-ink/80 text-[12.5px]">
                            <div><span className="text-muted">Late mark after (minutes):</span> {shift.lateMarkAfter}</div>
                            <div><span className="text-muted">Maximum check-in allowed in a day:</span> {shift.maxCheckIn}</div>
                            <div><span className="text-muted">Office opens on:</span> {shift.officeOpensOn?.join(" ") || "None"}</div>
                          </td>
                          <td className="py-4 px-6 align-top">
                            <div className="flex flex-col items-end justify-start h-full gap-3">
                              <label className="flex items-center gap-2 cursor-pointer w-fit group/radio">
                                <input 
                                  type="radio" 
                                  name="defaultShift"
                                  checked={shift.isDefault}
                                  onChange={() => handleSetDefaultShift(index)}
                                  disabled={!isAdmin}
                                  className={cn(
                                    "w-4 h-4 cursor-pointer",
                                    shift.isDefault ? "text-rose-500 border-rose-500 focus:ring-rose-500" : "text-muted border-gray-300"
                                  )}
                                />
                                <span className={cn(
                                  "text-[13px]",
                                  shift.isDefault ? "text-ink font-medium" : "text-muted group-hover/radio:text-ink transition-colors"
                                )}>
                                  Default
                                </span>
                              </label>

                              {isAdmin && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditShift(index)}
                                    className="flex items-center justify-center w-8 h-8 border border-line rounded bg-paper hover:bg-bone text-muted hover:text-ink transition-colors"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  {!shift.isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteShift(index)}
                                      className="flex items-center justify-center w-8 h-8 border border-line rounded bg-paper hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "rotation" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-paper border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-4 px-6">Rotation Name</th>
                      <th className="py-4 px-6 text-center">No. of Employees</th>
                      <th className="py-4 px-6 text-center">Replace existing shift of employees</th>
                      <th className="py-4 px-6 text-center">Send rotation notification</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rotations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <RotateCw className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No data available in table -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rotations.map((rotation, index) => (
                        <tr key={rotation.id} className="hover:bg-bone/30 transition-colors group">
                          <td className="py-4 px-6 text-ink font-medium">{rotation.name}</td>
                          <td className="py-4 px-6 text-center text-muted">{rotation.numberOfEmployees || 0}</td>
                          <td className="py-4 px-6 text-center">
                            {rotation.replaceExisting ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted/50 mx-auto" />}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {rotation.sendNotification ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted/50 mx-auto" />}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[12px] font-medium uppercase tracking-wider",
                              rotation.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {rotation.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRotation(index)}
                                  className="flex items-center justify-center w-8 h-8 border border-line rounded bg-paper hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRotation(index)}
                                  className="flex items-center justify-center w-8 h-8 border border-line rounded bg-paper hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                
                {/* Automated Shifts Table */}
                {automatedShifts.length > 0 && (
                  <div className="mt-12">
                    <h4 className="text-[14px] font-semibold text-ink mb-4 px-2">Automated Shifts</h4>
                    <table className="w-full text-left text-[13px] border-t border-line">
                      <thead className="bg-paper border-b border-line text-muted/80 font-medium">
                        <tr>
                          <th className="py-4 px-6">Department</th>
                          <th className="py-4 px-6 text-center">Employees</th>
                          <th className="py-4 px-6">Rotation Name</th>
                          <th className="py-4 px-6 text-right w-32">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {automatedShifts.map((shift, index) => (
                          <tr key={shift.id} className="hover:bg-bone/30 transition-colors group">
                            <td className="py-4 px-6 text-ink font-medium">{shift.department || "All"}</td>
                            <td className="py-4 px-6 text-center text-muted">
                              {shift.employees?.length} Employee(s)
                            </td>
                            <td className="py-4 px-6 text-ink font-medium">{shift.rotationName}</td>
                            <td className="py-4 px-6 text-right">
                              {isAdmin && (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAutomatedShift(index)}
                                    className="flex items-center justify-center w-8 h-8 border border-line rounded bg-paper hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination Placeholder */}
                <div className="border-t border-line px-6 py-4 flex items-center justify-between text-[13px] text-muted">
                  <div className="flex items-center gap-2">
                    Show 
                    <select className="border border-line rounded px-1.5 py-1 bg-paper focus:outline-none">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                    </select>
                    entries
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Showing {rotations.length > 0 ? 1 : 0} to {rotations.length} of {rotations.length} entries</span>
                    <div className="flex items-center gap-1">
                      <button className="px-3 py-1.5 border border-line rounded bg-paper hover:bg-bone disabled:opacity-50" disabled>Previous</button>
                      <button className="px-3 py-1.5 border border-line rounded bg-paper hover:bg-bone disabled:opacity-50" disabled>Next</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab !== "attendance" && activeTab !== "shifts" && activeTab !== "rotation" && (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <span className="text-muted/70 text-[13px]">Placeholder for {tabs.find(t => t.id === activeTab)?.label} configuration.</span>
            </div>
          )}
        </div>
      </div>

      {/* Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-2xl my-8 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
              <h3 className="text-[15px] font-semibold text-ink">
                {editingShiftIndex !== null ? "Edit Shift" : "Add Shift"}
              </h3>
              <button 
                onClick={() => setIsShiftModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Shift Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="input w-full h-10 bg-paper"
                    placeholder="e.g. General Shift"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={shiftColor}
                      onChange={(e) => setShiftColor(e.target.value)}
                      className="w-10 h-10 rounded border border-line cursor-pointer p-0.5 bg-paper shrink-0"
                    />
                    <input
                      type="text"
                      value={shiftColor}
                      onChange={(e) => setShiftColor(e.target.value)}
                      className="input w-full h-10 bg-paper font-mono text-[13px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Start Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time" step="60" value={shiftStartTime} onChange={(e) => setShiftStartTime(e.target.value)}
                    className="input w-full h-10 bg-paper font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Half Day Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time" step="60" value={shiftHalfDayTime} onChange={(e) => setShiftHalfDayTime(e.target.value)}
                    className="input w-full h-10 bg-paper font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">End Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time" step="60" value={shiftEndTime} onChange={(e) => setShiftEndTime(e.target.value)}
                    className="input w-full h-10 bg-paper font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Late mark after (minutes) <span className="text-rose-500">*</span></label>
                  <input
                    type="number" min="0" value={shiftLateMarkAfter} onChange={(e) => setShiftLateMarkAfter(e.target.value)}
                    className="input w-full h-10 bg-paper"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Maximum check-in allowed in a day <span className="text-rose-500">*</span></label>
                  <input
                    type="number" min="1" value={shiftMaxCheckIn} onChange={(e) => setShiftMaxCheckIn(e.target.value)}
                    className="input w-full h-10 bg-paper"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-ink">Office opens on <span className="text-rose-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "px-3 py-1.5 text-[12.5px] font-medium rounded border transition-colors",
                        shiftOfficeOpensOn.includes(day) 
                          ? "bg-blue-50 border-blue-200 text-blue-700" 
                          : "bg-paper border-line text-muted hover:bg-bone"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="btn bg-paper border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShiftModal}
                disabled={mutation.isPending || !shiftName}
                className="btn btn-primary shadow-sm h-9 px-5 rounded font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotation Modal */}
      {isRotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-md my-8 overflow-hidden animate-scale-in flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
              <h3 className="text-[15px] font-semibold text-ink">
                {editingRotationIndex !== null ? "Edit Shift Rotation" : "Add Shift Rotation"}
              </h3>
              <button 
                onClick={() => setIsRotationModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Rotation Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={rotationName}
                  onChange={(e) => setRotationName(e.target.value)}
                  className="input w-full h-10 bg-paper"
                  placeholder="e.g. Weekly Rotation"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">No. of Employees</label>
                <input
                  type="number"
                  min="0"
                  value={rotationEmployees}
                  onChange={(e) => setRotationEmployees(e.target.value)}
                  className="input w-full h-10 bg-paper"
                  placeholder="e.g. 5"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={rotationReplaceExisting}
                    onChange={(e) => setRotationReplaceExisting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-ink">Replace existing shift of employees</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={rotationSendNotification}
                    onChange={(e) => setRotationSendNotification(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-ink">Send rotation notification</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Status <span className="text-rose-500">*</span></label>
                <select
                  value={rotationStatus}
                  onChange={(e) => setRotationStatus(e.target.value)}
                  className="input w-full h-10 bg-paper"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsRotationModalOpen(false)}
                className="btn bg-paper border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRotationModal}
                disabled={mutation.isPending || !rotationName}
                className="btn btn-primary shadow-sm h-9 px-5 rounded font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Automate Shifts Modal */}
      {isAutomateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-2xl my-8 overflow-hidden animate-scale-in flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
              <h3 className="text-[15px] font-semibold text-ink">
                Add Automate Shift
              </h3>
              <button 
                onClick={() => setIsAutomateModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 max-h-[60vh]">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Department</label>
                  <input
                    type="text"
                    list="departments-list"
                    value={automateDepartment}
                    onChange={(e) => setAutomateDepartment(e.target.value)}
                    placeholder="Type or select a department..."
                    className="input w-full h-10 bg-paper"
                  />
                  <datalist id="departments-list">
                    {Array.from(new Set(teamData?.map(u => u.department).filter(Boolean))).map(dept => (
                      <option key={dept as string} value={dept as string} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted mt-1">
                    Select a department to filter employees, or type a new one to categorize this shift.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink flex items-center gap-1">
                    Employees <span className="text-rose-500">*</span>
                  </label>
                  <div className="border border-line rounded-lg max-h-48 overflow-y-auto p-2 bg-bone/30">
                    {!teamData || teamData.length === 0 ? (
                      <div className="text-[13px] text-muted p-2">No team members found</div>
                    ) : (
                      teamData.map(user => (
                        <label key={user.id} className="flex items-center gap-2 p-1.5 hover:bg-paper rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={automateEmployees.includes(user.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAutomateEmployees([...automateEmployees, user.id.toString()]);
                              } else {
                                setAutomateEmployees(automateEmployees.filter(id => id !== user.id.toString()));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-[13px] text-ink">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ""} ${user.last_name || ""}`.trim() 
                              : user.email || user.username || "Unknown User"}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Rotation Name <span className="text-rose-500">*</span></label>
                <select
                  value={automateRotationName}
                  onChange={(e) => setAutomateRotationName(e.target.value)}
                  className="input w-full h-10 bg-paper"
                >
                  <option value="">Nothing selected</option>
                  {rotations.map(rot => (
                    <option key={rot.id} value={rot.name}>{rot.name}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-start gap-3 shrink-0">
              <button
                onClick={handleSaveAutomateModal}
                disabled={mutation.isPending || !automateRotationName || automateEmployees.length === 0}
                className="btn btn-primary bg-rose-500 border-rose-500 hover:bg-rose-600 text-white dark:text-white dark:bg-rose-600 dark:hover:bg-rose-700 shadow-sm h-9 px-5 rounded font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <CheckCircle className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => setIsAutomateModalOpen(false)}
                className="text-muted hover:text-ink text-[13px] transition-colors font-medium ml-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function CheckboxItem({ label, checked, onChange, disabled }: CheckboxItemProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
      />
      <span className="text-[13px] text-ink">{label}</span>
    </label>
  );
}

