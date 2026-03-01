"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string;
    change?: string;
    icon: React.ElementType;
    trend?: "up" | "down";
    theme: string;
    color?: "cyan" | "emerald" | "rose" | "amber";
    className?: string;
}

export function KPICard({
    title,
    value,
    change,
    icon: Icon,
    trend,
    theme,
    color = "cyan",
    className = ""
}: KPICardProps) {
    const isUp = trend === "up";
    const colors: Record<string, string> = {
        cyan: theme === "light" ? "text-cyan-600 bg-cyan-50" : "text-cyan-400 bg-cyan-400/10",
        emerald: theme === "light" ? "text-emerald-600 bg-emerald-50" : "text-emerald-400 bg-emerald-400/10",
        rose: theme === "light" ? "text-rose-600 bg-rose-50" : "text-rose-400 bg-rose-400/10",
        amber: theme === "light" ? "text-amber-600 bg-amber-50" : "text-amber-400 bg-amber-400/10",
    };

    return (
        <div className={`p-6 transition-all duration-500 hover:scale-[1.02] glass-card group ${className}`}>
            <div className="flex items-center justify-between mb-5">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${colors[color] || colors.cyan} group-hover:scale-110 shadow-sm`}>
                    <Icon className="w-5 h-5" />
                </div>
                {change && (
                    <div className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full transition-all ${isUp ? "text-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "text-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]"}`}>
                        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span className="tracking-widest uppercase">{change}</span>
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="subtle-label opacity-60">{title}</p>
                <p className={`text-2xl font-black leading-none tracking-tighter transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>{value}</p>
            </div>
        </div>
    );
}
