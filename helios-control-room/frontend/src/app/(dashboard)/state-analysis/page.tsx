"use client";

import { useEffect, useState, useCallback } from "react";
import { useHeliosStore } from "@/store/useHeliosStore";
import { getStateSummaryData, StateSummary, getDashboardData, DashboardData } from "@/lib/data";
import { BarChart3, Activity, TrendingUp, Zap } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function StateAnalysisPage() {
    const { globalState, setSelectedState, scenarioParams, theme } = useHeliosStore();
    const selectedState = globalState.selectedState || "Maharashtra";
    const [data, setData] = useState<StateSummary | null>(null);
    const [chartData, setChartData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (state: string) => {
        setLoading(true);
        try {
            const [summary, dashboard] = await Promise.all([
                getStateSummaryData(state),
                getDashboardData(state, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive)
            ]);
            setData(summary);
            setChartData(dashboard);
        } catch (error) {
            console.error("Failed to load state metrics:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(selectedState);
    }, [selectedState, loadData]);

    return (
        <div className="dashboard-content-wrapper animate-in fade-in duration-700">
            <header className={`flex flex-col md:flex-row md:items-end justify-between gap-8 border-b pb-12 mb-8 transition-colors ${theme === "light" ? "border-slate-200" : "border-slate-800/60"}`}>
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse" />
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest font-mono">Terminal_Node_Active</span>
                    </div>
                    <h1 className={`text-4xl font-black tracking-tighter uppercase mb-3 transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                        {selectedState} Analysis
                    </h1>
                    <p className="text-slate-500 text-sm max-w-xl font-medium tracking-tight leading-relaxed">
                        Granular diagnostic of regional energy flows, generation efficiency, and market sensitivity across the {selectedState} node.
                    </p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Analysis Node</span>
                    <div className="relative group">
                        <select
                            className={`appearance-none bg-slate-950/20 border border-slate-800/50 text-white text-[10px] font-black p-4 pr-12 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 uppercase tracking-widest cursor-pointer shadow-2xl transition-all ${theme === "light" ? "bg-white border-slate-200 text-slate-900 shadow-xl" : ""}`}
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                        >
                            {["Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Rajasthan"].map(s => (
                                <option key={s} value={s}>{s.toUpperCase()}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-cyan-500 transition-colors">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </header>

            {/* KPI Row: Forced 4-Column Grid */}
            <div className="kpi-grid-pc mb-8">
                {loading ? (
                    <>
                        <Skeleton className="h-40 rounded-2xl bg-slate-800/10 shadow-inner" />
                        <Skeleton className="h-40 rounded-2xl bg-slate-800/10 shadow-inner" />
                        <Skeleton className="h-40 rounded-2xl bg-slate-800/10 shadow-inner" />
                        <Skeleton className="h-40 rounded-2xl bg-slate-800/10 shadow-inner" />
                    </>
                ) : data && (
                    <>
                        <KPICard label="Avg_Peak_Load" value={`${data?.avg_peak_load_mw?.toLocaleString() || '0'} MW`} sub="System Peak" icon={TrendingUp} color="cyan" />
                        <KPICard label="Base_Flow" value={`${data?.avg_base_load_mw?.toLocaleString() || '0'} MW`} sub="Critical Load" icon={Activity} color="white" />
                        <KPICard label="EV_Penetration" value={`${data?.avg_ev_load_mw?.toLocaleString() || '0'} MW`} sub="Network Load" icon={Zap} color="emerald" />
                        <KPICard label="Demand_Growth" value={`${data?.avg_demand_growth_pct?.toFixed(2) || '0'}%`} sub="Annual Delta" icon={BarChart3} color="amber" />
                    </>
                )}
            </div>

            {/* Charts Row: Forced 2-Column Grid */}
            <div className="chart-grid-pc">
                <div className="glass-card p-10 flex flex-col">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4 mb-10 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" /> Generation_Mix_Telemetry
                    </h3>
                    <div className="chart-container-pc">
                        {loading ? <Skeleton className="h-full w-full rounded-2xl bg-slate-800/10" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData?.generationMix}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "light" ? "#e2e8f0" : "#1e293b"} vertical={false} />
                                    <XAxis dataKey="date" stroke={theme === "light" ? "#64748b" : "#475569"} fontSize={10} axisLine={false} tickLine={false} tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                                    <YAxis stroke={theme === "light" ? "#64748b" : "#475569"} fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: theme === "light" ? "#ffffff" : "#020617", border: theme === "light" ? "1px solid #e2e8f0" : "1px solid #1e293b", borderRadius: "12px", fontSize: "11px" }}
                                        cursor={{ fill: 'rgba(0, 255, 255, 0.05)' }}
                                    />
                                    <Bar dataKey="coal" fill={theme === "light" ? "#94a3b8" : "#334155"} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="gas" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="solar" fill="#eab308" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="wind" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="glass-card p-10 flex flex-col">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4 mb-10 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" /> Historical_Demand_Trajectory
                    </h3>
                    <div className="chart-container-pc">
                        {loading ? <Skeleton className="h-full w-full rounded-2xl bg-slate-800/10" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData?.demandHistory}>
                                    <defs>
                                        <linearGradient id="analytLine" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "light" ? "#e2e8f0" : "#1e293b"} vertical={false} />
                                    <XAxis dataKey="date" stroke={theme === "light" ? "#64748b" : "#475569"} fontSize={10} axisLine={false} tickLine={false} tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                                    <YAxis stroke={theme === "light" ? "#64748b" : "#475569"} fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: theme === "light" ? "#ffffff" : "#020617", border: theme === "light" ? "1px solid #e2e8f0" : "1px solid #1e293b", borderRadius: "12px", fontSize: "11px" }} />
                                    <Area type="monotone" dataKey="peak" stroke="#06b6d4" fill="url(#analytLine)" strokeWidth={4} />
                                    <Area type="monotone" dataKey="base" stroke={theme === "light" ? "#94a3b8" : "#475569"} fill="transparent" strokeDasharray="6 6" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface StateKPICardProps {
    label: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    color: "cyan" | "emerald" | "amber" | "white";
}

function KPICard({ label, value, sub, icon: Icon, color }: StateKPICardProps) {
    const { theme } = useHeliosStore();
    const colorMap: Record<string, string> = {
        cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        white: "text-white bg-white/5 border-white/10"
    };

    return (
        <div className={`p-6 rounded-[28px] border backdrop-blur-md transition-colors ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : colorMap[color]
            }`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl transition-colors ${theme === "light" ? "bg-slate-100" : "bg-black/20"
                    }`}>
                    <Icon className={`w-5 h-5 transition-colors ${theme === "light" ? "text-slate-600" : "text-slate-100"
                        }`} />
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">{sub}</div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">{label}</div>
            <div className={`text-2xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : ""
                }`}>{value}</div>
        </div>
    );
}
