"use client";

import { useEffect, useState, useCallback } from "react";
import { useHeliosStore } from "@/store/useHeliosStore";
import { getEmissionsData, StateEmissions } from "@/lib/data";
import { ComplianceHeatmap } from "@/components/charts/ComplianceHeatmap";
import { CloudLightning, RefreshCw, AlertCircle, Leaf, AlertTriangle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { KPICard } from "@/components/KPICard";

export default function EmissionsPage() {
    const { globalState, scenarioParams, theme } = useHeliosStore();
    const [data, setData] = useState<StateEmissions[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getEmissionsData(globalState.selectedState || undefined, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive);
            setData(result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to load emission data";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [globalState.selectedState, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive]);

    useEffect(() => { load(); }, [load]);

    // Aggregate stats
    const totalEmissions = data.reduce((s, d) => s + d.total_emission_tonnes, 0);
    const totalGen = data.reduce((s, d) => s + d.total_generation_mwh, 0);
    const avgIntensity = totalGen > 0 ? totalEmissions / totalGen : 0;
    const nonCompliantCount = data.filter(d => d.cap_utilisation_pct > 100).length;

    return (
        <div className="dashboard-content-wrapper animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header: Full Width */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className={`text-4xl font-black tracking-tighter mb-3 transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                        Emission <span className="text-cyan-500">Compliance</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                        {globalState.selectedState ? `${globalState.selectedState} Matrix — ` : "Global Network Matrix — "}
                        Real-time regulatory tracking and carbon cap utilization indices across the generation spectrum.
                    </p>
                </div>
                {loading && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-cyan-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        SYNCING NODES
                    </div>
                )}
            </header>

            {error && (
                <div className="mb-8 p-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-6">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <p className="font-black text-rose-500 uppercase tracking-widest text-xs">Synchronization Failure</p>
                        <p className="text-sm text-rose-400/80 mt-1 font-medium">{error}</p>
                    </div>
                    <button onClick={load} className="ml-auto px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-600 active:scale-95 shadow-lg shadow-rose-500/20">Retry Sync</button>
                </div>
            )}

            {/* KPI Row: Forced 4-Column Grid */}
            <div className="kpi-grid-pc">
                <KPICard title="Total Carbon" value={`${(totalEmissions / 1e6).toFixed(1)}M t`} icon={CloudLightning} theme={theme} color="rose" />
                <KPICard title="Total Generation" value={`${(totalGen / 1e6).toFixed(1)}M MWh`} icon={Activity} theme={theme} color="cyan" />
                <KPICard title="Avg Intensity" value={`${avgIntensity.toFixed(3)} t/M` + "Wh"} icon={Leaf} theme={theme} color="rose" />
                <KPICard title="Breach Status" value={`${nonCompliantCount} Nodes`} change={nonCompliantCount > 0 ? "CRITICAL" : "COMPLIANT"} trend={nonCompliantCount > 0 ? "down" : "up"} icon={AlertTriangle} theme={theme} color={nonCompliantCount > 0 ? "rose" : "emerald"} />
            </div>

            {/* Heatmap Section */}
            <section className="glass-card p-10 mt-8">
                <div className="flex items-center gap-4 mb-10">
                    <div className={`p-3 rounded-xl border transition-all ${theme === "light" ? "bg-cyan-50 border-cyan-100 shadow-sm" : "bg-cyan-500/5 border-cyan-500/20"}`}>
                        <CloudLightning className="text-cyan-400 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>Compliance Heatmap</h2>
                        <p className="subtle-label mt-2">Emission cap utilization vs regulatory thresholds</p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className={`h-64 rounded-2xl ${theme === "light" ? "bg-slate-100" : "bg-slate-800/20 shadow-inner"}`} />
                        ))}
                    </div>
                ) : (
                    <ComplianceHeatmap data={data} />
                )}
            </section>
        </div>
    );
}
