"use client";

import { useEffect, useState } from "react";
import { useHeliosStore } from "@/store/useHeliosStore";
import { getAssetHealthData, AssetHealthResponse } from "@/lib/data";
import { AlertTriangle, CheckCircle2, TrendingDown, RefreshCw, Shield } from "lucide-react";
import { fmtINR } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { KPICard } from "@/components/KPICard";

export default function AssetHealthPage() {
    const { globalState, scenarioParams, theme } = useHeliosStore();
    const [data, setData] = useState<AssetHealthResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getAssetHealthData(globalState.selectedState || undefined, globalState.dateFrom, globalState.dateTo, scenarioParams.isRegimeShiftActive)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [globalState.selectedState, globalState.dateFrom, globalState.dateTo, scenarioParams.isRegimeShiftActive]);

    const assets = data?.assets || [];
    const underperforming = assets.filter(a => a.is_underperforming);
    const healthy = assets.filter(a => !a.is_underperforming);

    return (
        <div className="dashboard-content-wrapper animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className={`text-4xl font-black tracking-tighter mb-3 transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                        Asset <span className="text-cyan-500">Health</span> Tracker
                    </h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl">
                        High-fidelity monitoring of plant-level Forced Outage Rates and Capacity Utilization across the operational network.
                    </p>
                </div>
                {loading && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-cyan-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        SCANNING ASSETS
                    </div>
                )}
            </header>

            {/* KPI Cards: Forced 4-Column Grid */}
            <div className="kpi-grid-pc">
                <KPICard title="Total Assets" value={assets.length.toString()} icon={Shield} theme={theme} color="cyan" />
                <KPICard title="Underperforming" value={underperforming.length.toString()} icon={AlertTriangle} change="FLAGGED" trend="down" theme={theme} color="rose" />
                <KPICard title="Healthy Assets" value={healthy.length.toString()} icon={CheckCircle2} change="OPTIMAL" trend="up" theme={theme} color="emerald" />
                {/* Empty slot for 4-col balance */}
                <div className="hidden lg:block h-full" />
            </div>

            {/* Details Table: Full Width */}
            <div className="glass-card overflow-hidden mt-8">
                <div className={`p-10 border-b transition-colors ${theme === "light" ? "bg-slate-50 border-slate-200" : "border-slate-800/60"}`}>
                    <h2 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                        Plant Performance Matrix
                    </h2>
                    <p className="subtle-label mt-2">Detailed reliability metrics and capacity benchmarking</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800/20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <th className="px-10 py-6">Operational Status</th>
                                <th className="px-6 py-6 font-black">Plant ID</th>
                                <th className="px-6 py-6">Region</th>
                                <th className="px-6 py-6">Fuel Type</th>
                                <th className="px-6 py-6">Capacity</th>
                                <th className="px-6 py-6">Outage Rate</th>
                                <th className="px-10 py-6 text-right">Utilization</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10 font-medium">
                            {assets.map((asset) => (
                                <tr
                                    key={asset.plant_id}
                                    className={`group transition-all duration-300 hover:bg-cyan-500/5 ${asset.is_underperforming ? 'bg-rose-500/5' : ''}`}
                                >
                                    <td className="px-10 py-6">
                                        {asset.is_underperforming ? (
                                            <div className="flex items-center gap-3 text-rose-400 font-black text-[10px] uppercase tracking-widest">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" /> BREACH
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> NOMINAL
                                            </div>
                                        )}
                                    </td>
                                    <td className={`px-6 py-6 font-mono text-xs font-black transition-colors ${theme === "light" ? "text-slate-900" : "text-slate-200"}`}>{asset.plant_id}</td>
                                    <td className="px-6 py-6 text-sm font-bold text-slate-500">{asset.state}</td>
                                    <td className="px-6 py-6">
                                        <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-500/10 text-slate-400 border border-slate-500/10">
                                            {asset.plant_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-sm font-black text-slate-500 font-mono">{asset.installed_capacity_mw.toLocaleString()} <span className="text-[10px] opacity-60">MW</span></td>
                                    <td className={`px-6 py-6 font-mono font-bold ${asset.forced_outage_rate > 0.15 ? 'text-rose-400' : 'text-slate-500'}`}>
                                        {(asset.forced_outage_rate * 100).toFixed(1)}%
                                    </td>
                                    <td className={`px-10 py-6 text-right font-mono font-bold ${asset.capacity_utilization_pct < 20 && ["Coal", "Gas"].includes(asset.plant_type) ? 'text-rose-400' : 'text-slate-200'}`}>
                                        {asset.capacity_utilization_pct.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
