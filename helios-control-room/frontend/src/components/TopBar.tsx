"use client";

import { useHeliosStore } from "@/store/useHeliosStore";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import { FileText, Download, Activity, Sun, Moon, TrendingUp } from "lucide-react";
import { DecisionLogPanel } from "./DecisionLogPanel";

export function TopBar() {
    const { scenarioParams, setRegimeShiftActive, theme, setTheme } = useHeliosStore();
    const [status, setStatus] = useState<"checking" | "SYSTEM ERROR: FINANCIAL DATA LINK BROKEN" | "STAGE 3: OPTIMIZED & BOARD COMPLIANT">("checking");
    const [isLogOpen, setIsLogOpen] = useState(false);

    const isOptimized = scenarioParams.isOptimizationActive;
    const statusText = isOptimized ? "STAGE 3: OPTIMIZED & COMPLIANT" : "STAGE 2: FULLY OPERATIONAL";

    const handleExport = () => {
        window.open("http://localhost:8000/api/report/export", "_blank");
    };

    return (
        <>
            <header className={`h-[72px] border-b flex items-center justify-between px-8 sticky top-0 z-40 backdrop-blur-xl transition-all duration-300 ${theme === "light"
                ? "bg-white/70 border-slate-200/60 shadow-sm"
                : "bg-slate-950/70 border-slate-800/60 shadow-2xl"
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${theme === "light"
                        ? "bg-cyan-50 border-cyan-200"
                        : "bg-cyan-500/10 border-cyan-500/20"
                        }`}>
                        <TrendingUp className="text-cyan-400 w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className={`text-lg font-black tracking-tighter leading-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"
                            }`}>Helios <span className="text-cyan-500">Control Room</span></h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOptimized ? "bg-emerald-500 shadow-[0_0_12px_#10b981]" : "bg-cyan-500 shadow-[0_0_12px_#22d3ee]"}`} />
                            <span className={`text-[9px] uppercase tracking-[0.4em] font-black transition-colors ${isOptimized ? "text-emerald-500" : "text-cyan-500"}`}>
                                {statusText}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Theme Switcher */}
                    <button
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className={`p-2.5 rounded-xl border transition-all duration-300 ${theme === "light"
                            ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:shadow-lg shadow-sm"
                            : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    >
                        {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>

                    <div className={`w-px h-8 transition-colors ${theme === "light" ? "bg-slate-200" : "bg-slate-800"}`} />

                    {/* Scenario Toggle */}
                    <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border transition-all duration-500 shadow-inner ${theme === "light"
                        ? "bg-slate-100 border-slate-200"
                        : "bg-slate-950/50 border-slate-800/60"
                        }`}>
                        <button
                            onClick={() => setRegimeShiftActive(false)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!scenarioParams.isRegimeShiftActive
                                ? "bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20"
                                : "text-slate-500 hover:text-slate-400"
                                }`}
                        >
                            BASELINE
                        </button>
                        <button
                            onClick={() => setRegimeShiftActive(true)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${scenarioParams.isRegimeShiftActive
                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                                : "text-slate-500 hover:text-slate-400"
                                }`}
                        >
                            REGIME SHIFT
                        </button>
                    </div>

                    <div className={`w-px h-8 transition-colors ${theme === "light" ? "bg-slate-200" : "bg-slate-800"}`} />

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsLogOpen(true)}
                            className={`group flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === "light"
                                ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-cyan-500/40 shadow-sm"
                                : "bg-slate-800/20 hover:bg-slate-800/40 border-slate-700/30 text-slate-300 hover:border-cyan-500/50"
                                }`}
                        >
                            <FileText className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                            DECISION LOG
                        </button>
                        <button
                            onClick={handleExport}
                            className={`group flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === "light"
                                ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-cyan-500/40 shadow-sm"
                                : "bg-slate-800/20 hover:bg-slate-800/40 border-slate-700/30 text-slate-300 hover:border-cyan-500/50"
                                }`}
                        >
                            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform text-cyan-500" />
                            BOARD REPORT
                        </button>
                        <button
                            onClick={() => window.open(`http://localhost:8000/api/report/appendix?state=${scenarioParams.isRegimeShiftActive ? 'System' : ''}`, "_blank")}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-500/30 active:scale-95 shadow-lg shadow-cyan-500/10"
                        >
                            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            APPENDIX
                        </button>
                    </div>
                </div>
            </header>

            <DecisionLogPanel isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
        </>
    );
}
