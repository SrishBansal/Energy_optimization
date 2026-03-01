"use client";

import { StateEmissions } from "@/lib/data";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
    data: StateEmissions[];
}

export function ComplianceHeatmap({ data }: Props) {
    if (!data.length) return (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No emission data available</div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.map((s, idx) => {
                const isCompliant = s.compliance_gap >= 0;
                const barWidth = Math.min(s.actual_renewable_pct, 100);

                return (
                    <motion.div
                        key={s.state}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className="p-6 rounded-2xl glass-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                    >
                        {/* Status Glow */}
                        {!isCompliant && (
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl animate-pulse" />
                        )}

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-sm tracking-tight text-white">{s.state}</h3>
                            {!isCompliant
                                ? <AlertTriangle className="w-4 h-4 text-rose-400" />
                                : <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                            }
                        </div>

                        {/* Renewable Mix Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                                <span>Renewable Mix</span>
                                <span className={`font-mono font-black ${!isCompliant ? "text-rose-400" : "text-emerald-400"}`}>
                                    {s.actual_renewable_pct.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barWidth}%` }}
                                    transition={{ duration: 1, delay: 0.2 + idx * 0.07 }}
                                    className={`h-full rounded-full ${!isCompliant ? "bg-rose-500" : "bg-emerald-500"}`}
                                />
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-y-3 text-[11px] font-medium text-slate-400">
                            <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-0.5">Cap Util</p>
                                <p className="font-mono text-slate-200">{(s.cap_utilisation_pct).toFixed(1)}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-0.5">Target</p>
                                <p className="font-mono text-slate-200">{s.renewable_target_pct}%</p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-0.5">Intensity</p>
                                <p className="font-mono text-slate-200">{s.emission_intensity.toFixed(3)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-0.5">Gap</p>
                                <p className={`font-mono font-bold ${!isCompliant ? "text-rose-400" : "text-emerald-400"}`}>
                                    {isCompliant ? "+" : ""}{s.compliance_gap.toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Status Label */}
                        <div className={`mt-6 py-2 rounded-xl text-[9px] font-black tracking-[0.2em] text-center uppercase border ${!isCompliant
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-slate-800/40 text-slate-500 border-slate-700/50"
                            }`}>
                            {!isCompliant ? "Regulatory Breach" : "Compliant"}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
