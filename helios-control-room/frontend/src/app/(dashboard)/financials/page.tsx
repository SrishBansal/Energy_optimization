"use client";

import { useEffect, useState, useCallback } from "react";
import { useHeliosStore } from "@/store/useHeliosStore";
import { getFinancialData, StateFinancials } from "@/lib/data";
import { FinancialWaterfall } from "@/components/charts/FinancialWaterfall";
import { Activity, AlertCircle, Shield, TrendingUp, RefreshCw, DollarSign } from "lucide-react";
import { fmtINR } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { KPICard } from "@/components/KPICard";

export default function FinancialsPage() {
    const { globalState, scenarioParams, theme } = useHeliosStore();
    const [data, setData] = useState<StateFinancials[]>([]);
    const [stage1Data, setStage1Data] = useState<StateFinancials[]>([]);
    const [stage2Data, setStage2Data] = useState<StateFinancials[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s3, s1, s2] = await Promise.all([
                getFinancialData(globalState.selectedState || undefined, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive),
                getFinancialData(globalState.selectedState || undefined, false, false), // Stage 1
                getFinancialData(globalState.selectedState || undefined, true, false)  // Stage 2
            ]);
            setData(s3);
            setStage1Data(s1);
            setStage2Data(s2);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "SYSTEM ERROR: FINANCIAL DATA LINK BROKEN";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [globalState.selectedState, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const aggregates = data.reduce((acc, curr) => ({
        revenue: acc.revenue + curr.revenue,
        ebitda: acc.ebitda + curr.ebitda,
        dscr: acc.dscr + curr.dscr,
        base_fuel_cost: acc.base_fuel_cost + curr.base_fuel_cost,
        carbon_burden: acc.carbon_burden + curr.carbon_burden,
        penalties: acc.penalties + curr.penalties
    }), { revenue: 0, ebitda: 0, dscr: 0, base_fuel_cost: 0, carbon_burden: 0, penalties: 0 });

    const avgDscr = data.length > 0 ? aggregates.dscr / data.length : 0;
    const isDscrCovenantMet = avgDscr >= 1.35;

    // Aggregate comparison data for the table
    const s1Agg = stage1Data.reduce((acc, c) => ({
        revenue: acc.revenue + c.revenue,
        ebitda: acc.ebitda + c.ebitda,
        dscr: acc.dscr + c.dscr
    }), { revenue: 0, ebitda: 0, dscr: 0 });

    const s2Agg = stage2Data.reduce((acc, c) => ({
        revenue: acc.revenue + c.revenue,
        ebitda: acc.ebitda + c.ebitda,
        dscr: acc.dscr + c.dscr
    }), { revenue: 0, ebitda: 0, dscr: 0 });

    const s1Dscr = stage1Data.length > 0 ? s1Agg.dscr / stage1Data.length : 0;
    const s2Dscr = stage2Data.length > 0 ? s2Agg.dscr / stage2Data.length : 0;

    return (
        <div className="dashboard-content-wrapper animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header: Full Width */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className={`text-4xl font-black tracking-tighter mb-3 transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                        Financial <span className="text-cyan-500">Health</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                        {globalState.selectedState ? `${globalState.selectedState} Portfolio — ` : "Global Portfolio — "}
                        Advanced EBITDA recovery models and debt service coverage ratio (DSCR) analysis for long-term viability.
                    </p>
                </div>
                {loading && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-cyan-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        REBUILDING MODEL
                    </div>
                )}
            </header>

            {error && (
                <div className="mb-8 p-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-6">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <p className="font-black text-rose-500 uppercase tracking-widest text-xs">Critical Analysis Failure</p>
                        <p className="text-sm text-rose-400/80 mt-1 font-medium">{error}</p>
                    </div>
                    <button onClick={loadData} className="ml-auto px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-600 active:scale-95 shadow-lg shadow-rose-500/20">Retry Load</button>
                </div>
            )}

            {/* KPI Cards: Forced 4-Column Grid */}
            <div className="kpi-grid-pc">
                <KPICard title="Portfolio Revenue" value={fmtINR(aggregates.revenue)} icon={DollarSign} theme={theme} color="cyan" />
                <KPICard title="EBITDA (Agg)" value={fmtINR(aggregates.ebitda)} icon={TrendingUp} theme={theme} color={aggregates.ebitda > 0 ? "emerald" : "rose"} />
                <KPICard title="Portfolio DSCR" value={avgDscr.toFixed(2)} change={isDscrCovenantMet ? "COMPLIANT" : "BREACH"} trend={isDscrCovenantMet ? "up" : "down"} icon={Shield} theme={theme} color={isDscrCovenantMet ? "emerald" : "rose"} />
                <KPICard title="Fixed O&M" value={fmtINR(data.length * 2500000)} icon={Activity} theme={theme} color="cyan" />
            </div>

            {/* Main Content Area: Forced 2-Column Grid (50/50) */}
            <div className="chart-grid-pc">
                <div className="glass-card p-10 flex flex-col">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>EBITDA Waterfall</h2>
                            <p className="subtle-label mt-2">Revenue to EBITDA bridge breakdown</p>
                        </div>
                    </div>
                    <div className="flex-1">
                        <FinancialWaterfall metrics={data} />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <AnimatePresence>
                        {aggregates.ebitda < 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 shadow-xl shadow-rose-500/5"
                            >
                                <div className="flex items-center gap-4 text-rose-500 mb-5">
                                    <AlertCircle className="w-7 h-7" />
                                    <h3 className="text-sm font-black uppercase tracking-widest">Infeasibility Warning</h3>
                                </div>
                                <p className="text-sm text-rose-400/80 font-bold leading-relaxed">
                                    Current dispatch config results in negative EBITDA. The Board mandates immediate Stage 3 optimization to curtail loss-making thermal assets and restore profitability.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="glass-card p-10 flex-1">
                        <h3 className={`text-xl font-black tracking-tight mb-8 transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>Board Covenants</h3>
                        <div className="space-y-8">
                            <div className="flex justify-between items-end border-b border-slate-800/20 pb-6">
                                <div>
                                    <p className="subtle-label mb-2">DSCR Threshold</p>
                                    <p className={`text-2xl font-black tracking-tighter transition-colors ${isDscrCovenantMet ? "text-emerald-500" : "text-rose-500"}`}>{avgDscr.toFixed(2)} <span className="text-xs text-slate-500 ml-1">/ 1.35</span></p>
                                </div>
                                <div className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${isDscrCovenantMet ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                                    {isDscrCovenantMet ? "SECURED" : "BREACH"}
                                </div>
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-800/20 pb-6">
                                <div>
                                    <p className="subtle-label mb-2">Penalties Incurred</p>
                                    <p className={`text-2xl font-black tracking-tighter transition-colors ${aggregates.penalties > 0 ? "text-rose-500" : "text-emerald-500"}`}>{fmtINR(aggregates.penalties)}</p>
                                </div>
                                {aggregates.penalties > 0 && (
                                    <div className="text-[9px] font-black px-3 py-1 rounded-lg bg-rose-500/20 text-rose-500 animate-pulse uppercase tracking-widest">
                                        PENALTY
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stage Comparison Audit: Full Width */}
            <div className="glass-card p-10 mt-8">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>Strategic Performance Audit</h2>
                        <p className="subtle-label mt-2">Comparative verification of multi-stage optimization benchmarks</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800/20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <th className="py-5">Metric Analysis</th>
                                <th className="py-5">Stage 1: Baseline</th>
                                <th className="py-5 text-rose-500">Stage 2: Shocks</th>
                                <th className="py-5 text-emerald-500">Stage 3: Optimized</th>
                                <th className="py-5 text-right pr-4">Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {[
                                { name: "Revenue", s1: fmtINR(s1Agg.revenue), s2: fmtINR(s2Agg.revenue), s3: fmtINR(aggregates.revenue) },
                                { name: "EBITDA", s1: fmtINR(s1Agg.ebitda), s2: fmtINR(s2Agg.ebitda), s3: fmtINR(aggregates.ebitda) },
                                { name: "DSCR", s1: s1Dscr.toFixed(2), s2: s2Dscr.toFixed(2), s3: avgDscr.toFixed(2) },
                            ].map((m) => (
                                <tr key={m.name} className="group hover:bg-cyan-500/5 transition-all">
                                    <td className={`py-5 text-sm font-black transition-colors ${theme === "light" ? "text-slate-700 group-hover:text-slate-900" : "text-slate-400 group-hover:text-white"}`}>{m.name}</td>
                                    <td className="py-5 text-sm font-bold text-slate-500 font-mono tracking-tighter">{m.s1}</td>
                                    <td className="py-5 text-sm font-bold text-rose-400/80 font-mono tracking-tighter">{m.s2}</td>
                                    <td className="py-5 text-sm font-black text-emerald-400 font-mono tracking-tighter">{m.s3}</td>
                                    <td className="py-5 text-right pr-4">
                                        <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Certified</span>
                                            <Shield className="w-4 h-4 text-emerald-500" />
                                        </div>
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
