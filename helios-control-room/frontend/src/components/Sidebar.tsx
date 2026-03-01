"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, CloudLightning, DollarSign, Database, Target, ChevronRight, Globe, Zap, Shield } from "lucide-react";
import { useHeliosStore } from "@/store/useHeliosStore";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    { name: "Overview", href: "/", icon: Activity },
    { name: "State Analysis", href: "/state-analysis", icon: BarChart3 },
    { name: "Emissions", href: "/emissions", icon: CloudLightning },
    { name: "Financials", href: "/financials", icon: DollarSign },
    { name: "Asset Health", href: "/asset-health", icon: Shield },
];

const STATES = ["Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Rajasthan"];

export function Sidebar() {
    const pathname = usePathname();
    const { theme, globalState, setSelectedState, scenarioParams, setOptimizationActive } = useHeliosStore();
    const selectedState = globalState.selectedState;
    const isOptimizationActive = scenarioParams.isOptimizationActive;

    return (
        <aside className={`w-[260px] flex-shrink-0 border-r flex flex-col transition-colors duration-300 z-30 ${theme === "light" ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
            }`}>
            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Logo Header: Precise Alignment Padding */}
                <div className="flex items-center gap-3 w-full pt-6 pb-6 pl-6 pr-0">
                    <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${theme === "light" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        }`}>
                        <Database className="w-5 h-5" />
                    </div>
                    <h1 className={`text-xl font-black tracking-tighter transition-colors ${theme === "light" ? "text-slate-900" : "text-white"
                        }`}>PROJECT_HELIOS</h1>
                </div>

                <nav className="flex-1 space-y-8 mt-4">
                    {/* Navigation Section */}
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-6 mb-4 ${theme === "light" ? "text-slate-400" : "text-slate-500"
                            }`}>Navigation</p>
                        <div className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`
                                            group relative flex items-center gap-3 w-[calc(100%-32px)] mx-4 px-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300
                                            ${isActive
                                                ? (theme === "light" ? "bg-slate-100 text-cyan-600 shadow-sm" : "bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]")
                                                : (theme === "light" ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900" : "text-slate-500 hover:bg-white/5 hover:text-white")
                                            }
                                        `}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeBar"
                                                className="absolute left-0 w-1 h-4 bg-cyan-500 rounded-full"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-cyan-500" : "group-hover:text-cyan-400"}`} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Market Nodes: 24px Alignment Padding */}
                    <div className="mt-10 px-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Market Nodes</h3>
                        </div>
                        <ul className="space-y-2">
                            {["Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Rajasthan"].map((state) => {
                                const isSelected = globalState.selectedState === state;
                                return (
                                    <li
                                        key={state}
                                        onClick={() => setSelectedState(state)}
                                        className={`
                                            group flex items-center justify-between w-[calc(100%-8px)] px-2 py-3 rounded-xl cursor-pointer transition-all duration-300
                                            ${isSelected
                                                ? (theme === "light" ? "bg-slate-100 text-cyan-600" : "bg-cyan-500/10 text-cyan-400")
                                                : (theme === "light" ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900" : "text-slate-400 hover:bg-white/5 hover:text-white")
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isSelected ? "bg-cyan-500 scale-150" : "bg-slate-700 group-hover:bg-cyan-500"}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{state}</span>
                                        </div>
                                        {isSelected && <Zap className="w-3 h-3 text-cyan-500 animate-pulse" />}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Strategic Controls */}
                    <div className="pt-4 px-4 mt-auto">
                        <button
                            onClick={() => setOptimizationActive(!isOptimizationActive)}
                            className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border transition-all duration-300 group ${isOptimizationActive
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-xl shadow-emerald-500/5"
                                : (theme === "light" ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-slate-800/40 border-slate-700/50 text-slate-500 hover:text-slate-300")
                                }`}
                        >
                            <div className="flex flex-col items-start gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Optimization</span>
                                <span className="text-[8px] opacity-60 font-bold uppercase tracking-tighter">Stage 3 Active</span>
                            </div>
                            <div className={`w-9 h-5 rounded-full relative transition-all ${isOptimizationActive ? "bg-emerald-500" : "bg-slate-700"}`}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isOptimizationActive ? "left-5" : "left-1"}`} />
                            </div>
                        </button>
                    </div>
                </nav>
            </div>

            <div className={`px-6 py-6 border-t text-[10px] font-black uppercase tracking-[0.2em] text-center transition-colors ${theme === "light" ? "border-slate-100 text-slate-400" : "border-slate-800/50 text-slate-600"
                }`}>
                {isOptimizationActive ? "STAGE 3: OPTIMIZED" : "STAGE 2: OPERATIONAL"}
            </div>
        </aside>
    );
}
