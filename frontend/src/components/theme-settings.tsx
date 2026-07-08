"use client";

import { useState } from "react";
import { Palette, CheckCircle } from "lucide-react";

export function ThemeSettingsForm() {
  const getStored = (key: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    return localStorage.getItem(key) ?? fallback;
  };

  const [colorScheme, setColorScheme] = useState(() => getStored("theme_color", "orange"));
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  const [fontSize, setFontSize] = useState(() => getStored("theme_font_size", "medium"));
  const [saved, setSaved] = useState(false);

  const colorSchemes = [
    { id: "orange", label: "Ember", hex: "#FF5B1F", desc: "The default warm brand accent.", gradient: "from-orange-400 to-red-500" },
    { id: "blue", label: "Ocean", hex: "#2A4E8C", desc: "A calm, professional deep blue.", gradient: "from-blue-500 to-indigo-600" },
    { id: "violet", label: "Violet", hex: "#7C3AED", desc: "Bold and creative purple energy.", gradient: "from-violet-500 to-purple-700" },
    { id: "emerald", label: "Forest", hex: "#059669", desc: "Fresh, growth-focused green.", gradient: "from-emerald-400 to-teal-600" },
    { id: "rose", label: "Rose", hex: "#E11D48", desc: "Vibrant, energetic rose-red.", gradient: "from-rose-500 to-pink-600" },
    { id: "amber", label: "Amber", hex: "#D97706", desc: "Warm golden amber sunshine.", gradient: "from-amber-400 to-yellow-500" },
  ];

  const fontSizes = [
    { id: "small", label: "Small", size: "13px", preview: "Aa" },
    { id: "medium", label: "Medium", size: "14px", preview: "Aa" },
    { id: "large", label: "Large", size: "16px", preview: "Aa" },
  ];

  const currentScheme = colorSchemes.find(s => s.id === colorScheme) ?? colorSchemes[0];

  const applyTheme = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme_color", colorScheme);
      localStorage.setItem("theme_font_size", fontSize);
      if (darkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme_dark", "true");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme_dark", "false");
      }
      const fontMap: Record<string, string> = { small: "13px", medium: "14px", large: "16px" };
      document.documentElement.style.fontSize = fontMap[fontSize] ?? "14px";
      
      const colors: Record<string, string> = {
        orange: "255 91 31",
        blue: "42 78 140",
        violet: "124 58 237",
        emerald: "5 150 105",
        rose: "225 29 72",
        amber: "217 119 6"
      };
      
      const softColors: Record<string, string> = {
        orange: "255 230 217",
        blue: "216 226 242",
        violet: "237 224 255",
        emerald: "209 250 229",
        rose: "255 228 230",
        amber: "254 243 199"
      };

      if (colors[colorScheme]) {
        document.documentElement.style.setProperty("--color-accent", colors[colorScheme]);
        document.documentElement.style.setProperty("--color-accent-soft", softColors[colorScheme]);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <Palette className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Theme Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Personalize your workspace appearance, accent color and reading comfort.
            </p>
          </div>
        </div>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="flex items-center gap-3 text-[13.5px] rounded-xl px-5 py-4 bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium shadow-sm animate-rise">
          <CheckCircle className="w-5 h-5 shrink-0" />
          Theme applied! Your workspace has been updated.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main settings card */}
        <div className="xl:col-span-2 space-y-6">
          {/* Color Scheme Picker */}
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative group/card hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentScheme.gradient}`} />
            <div className="p-6 sm:p-8 pt-9">
              <div className="mb-6">
                <label className="block text-[13.5px] font-semibold text-ink uppercase tracking-widest mb-1.5">Accent Color</label>
                <p className="text-[13px] text-muted">Choose a primary color for highlights, buttons, and interactive elements.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {colorSchemes.map(scheme => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => setColorScheme(scheme.id)}
                    className={`relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all duration-150 group ${
                      colorScheme === scheme.id
                        ? "border-transparent shadow-md scale-[1.02] ring-2 ring-offset-2"
                        : "border-line bg-bone/30 hover:border-slate-300 hover:shadow-sm opacity-90 hover:opacity-100 hover:bg-paper"
                    }`}
                    style={colorScheme === scheme.id ? { "--tw-ring-color": scheme.hex, backgroundColor: `${scheme.hex}08` } as React.CSSProperties : undefined}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl shrink-0 bg-gradient-to-br ${scheme.gradient} shadow-sm border border-black/5`}
                    />
                    <div className="min-w-0 text-left">
                      <div className="text-[14px] font-semibold text-ink truncate mb-0.5">{scheme.label}</div>
                      <div className="text-[11.5px] text-muted truncate leading-tight hidden sm:block">{scheme.desc}</div>
                    </div>
                    {colorScheme === scheme.id && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm" style={{ background: scheme.hex }}>
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dark Mode + Font Size row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Dark Mode toggle */}
            <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative group/card hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-500" />
              <div className="p-6 pt-8 h-full flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${darkMode ? "bg-slate-800 border-slate-700 shadow-inner" : "bg-amber-50 border-amber-200 shadow-sm"}`}>
                    {darkMode
                      ? <svg className="w-5 h-5 text-amber-200" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                      : <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    }
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-[14px] font-semibold text-ink mb-1">Dark Mode</div>
                    <div className="text-[12.5px] text-muted leading-snug">{darkMode ? "Dark theme is active." : "Light theme is active."}</div>
                  </div>
                </div>
                <div className="mt-auto flex justify-end">
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-bone-2 border border-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800 peer-checked:border-slate-700 shadow-inner"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Font Size selector */}
            <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative group/card hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-indigo-500" />
              <div className="p-6 pt-8 h-full flex flex-col">
                <div className="text-[13.5px] font-semibold text-ink uppercase tracking-widest mb-1.5">Font Size</div>
                <p className="text-[12.5px] text-muted mb-5">Adjust text size for comfortable reading.</p>
                <div className="flex gap-2 mt-auto">
                  {fontSizes.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontSize(f.id)}
                      className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${
                        fontSize === f.id
                          ? "border-indigo-400 bg-indigo-50/50 text-indigo-700 shadow-inner ring-1 ring-indigo-400"
                          : "border-line bg-bone/30 text-muted hover:border-slate-300 hover:bg-paper"
                      }`}
                    >
                      <span className="font-bold" style={{ fontSize: f.size }}>{f.preview}</span>
                      <span className="text-[11px] font-medium uppercase tracking-wider">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar preview */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line bg-bone/40 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-semibold text-ink uppercase tracking-widest">Live Preview</span>
            </div>
            <div className={`p-6 space-y-5 transition-colors duration-300 ${darkMode ? "bg-[#161616]" : "bg-[#faf9f7]"}`}>
              {/* Topbar preview */}
              <div className={`rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm ${darkMode ? "bg-[#222] border border-[#333]" : "bg-paper border border-[#eaeaea]"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md shadow-sm" style={{ background: currentScheme.hex }} />
                  <div className={`text-[12px] font-bold tracking-tight ${darkMode ? "text-[#f4efe6]" : "text-[#1a1714]"}`}>Lumeo CRM</div>
                </div>
                <div className={`w-6 h-6 rounded-full ${darkMode ? "bg-[#333]" : "bg-slate-100"}`} />
              </div>
              
              <div className={`p-4 rounded-xl space-y-4 border ${darkMode ? "bg-[#222] border-[#333]" : "bg-paper border-[#eaeaea]"}`}>
                {/* Sample text */}
                <div className="space-y-2">
                  <div className={`h-2.5 rounded-full w-full ${darkMode ? "bg-[#333]" : "bg-slate-200"}`} />
                  <div className={`h-2.5 rounded-full w-4/5 ${darkMode ? "bg-[#333]" : "bg-slate-200"}`} />
                  <div className={`h-2.5 rounded-full w-3/5 ${darkMode ? "bg-[#2a2a2a]" : "bg-slate-100"}`} />
                </div>
                
                {/* Badges */}
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-white shadow-sm" style={{ background: currentScheme.hex }}>Active</span>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${darkMode ? "bg-[#2a2a2a] text-[#aaa] border-[#444]" : "bg-slate-50 text-slate-500 border-slate-200"}`}>Draft</span>
                </div>
                
                {/* Sample button */}
                <button className="w-full py-2.5 rounded-lg text-[12.5px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: currentScheme.hex }}>
                  Primary Action
                </button>
              </div>
            </div>
          </div>

          {/* Apply button */}
          <button
            onClick={applyTheme}
            className={`w-full py-3.5 rounded-xl text-white text-[14.5px] font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 bg-gradient-to-r ${currentScheme.gradient}`}
          >
            Apply Theme
          </button>

          <p className="text-center text-[12.5px] text-muted px-4 leading-relaxed">Changes apply immediately across your local workspace.</p>
        </div>
      </div>
    </div>
  );
}
