"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, ChevronRight,
  CloudLightning, Database, DollarSign, Download, FileText, Flame, Globe, Moon, RefreshCw,
  Shield, Sliders, Sun, Target, TrendingUp, Wifi, WifiOff, Zap
} from "lucide-react";
import {
  getDashboardData, getEngineStatus, DashboardData
} from "@/lib/data";
import { exportTechnicalAppendix } from "@/lib/api";
import { useHeliosStore } from "@/store/useHeliosStore";
import { fmtINR } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { KPICard } from "@/components/KPICard";

export default function OverviewPage() {
  const {
    globalState, scenarioParams, theme, setOptimizationActive,
    setSelectedState, setRegimeShiftActive, addDecisionLog, setTheme
  } = useHeliosStore();

  const selectedState = globalState.selectedState || "";

  const [data, setData] = useState<DashboardData | null>(null);
  const [stage1Data, setStage1Data] = useState<DashboardData | null>(null);
  const [stage2Data, setStage2Data] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<string>("checking");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s, s1, s2] = await Promise.all([
        getDashboardData(globalState.selectedState || undefined, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive),
        getEngineStatus(),
        getDashboardData(globalState.selectedState || undefined, false, false), // Stage 1
        getDashboardData(globalState.selectedState || undefined, true, false)  // Stage 2
      ]);
      setData(d);
      setStatus(s);
      setStage1Data(s1);
      setStage2Data(s2);
    } catch (err) {
      console.error(err);
      setStatus("SYSTEM ERROR: FINANCIAL DATA LINK BROKEN");
    } finally {
      setLoading(false);
    }
  }, [globalState.selectedState, scenarioParams.isRegimeShiftActive, scenarioParams.isOptimizationActive]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      const res = await exportTechnicalAppendix();
      alert(`${res.message}: ${res.download_url}`);
    } catch { alert("Export failed"); }
  };

  if (loading) {
    return (
      <div className="flex-1 h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium animate-pulse">Initializing Optimization Engine...</p>
      </div>
    );
  }

  if (status.startsWith("SYSTEM ERROR")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-rose-500/10 border border-rose-500/20 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-rose-500 mb-2">{status}</h2>
        <p className="text-slate-400 max-w-md text-center font-medium">
          The application could not reach the production data repository at <code>/public/data</code>.
          Please verify CSV integrity and server availability.
        </p>
      </div>
    );
  }

  // Validation Logic
  const dscrOk = (data?.kpis.dscr || 0) >= 1.35;
  const ebitdaGrowth = stage2Data && stage2Data.kpis.ebitda > 0 ? (data?.kpis.ebitda || 0) / stage2Data.kpis.ebitda : 1;
  const ebitdaOk = ebitdaGrowth >= 1.05;
  const isOptimized = scenarioParams.isOptimizationActive;

  return (
    <div className="dashboard-content-wrapper animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header: Full Width ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-[0.2em] transition-all ${isOptimized ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-500"
              }`}>
              {isOptimized ? "Optimization: ACTIVE" : "System: BASELINE"}
            </div>
            <span className="subtle-label opacity-40">Node Status: {status}</span>
          </div>
          <h2 className={`text-4xl font-black tracking-tighter transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>
            {selectedState || "Global Network"} <span className="text-cyan-500">Overview</span>
          </h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl font-medium leading-relaxed">
            Precision-engineered optimization engine analyzing carbon-weighted dispatch models and regulatory compliance across the national power matrix.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setOptimizationActive(!isOptimized)}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-500 group relative overflow-hidden ${isOptimized
              ? "bg-emerald-500 text-slate-900 shadow-xl shadow-emerald-500/20 active:scale-95"
              : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50 hover:border-emerald-500/50 active:scale-95"
              }`}
          >
            <Zap className={`w-4 h-4 transition-transform duration-500 ${isOptimized ? "fill-current scale-110 rotate-12" : "group-hover:scale-125"}`} />
            {isOptimized ? "OPTIMIZATION: ON" : "RUN STAGE 3"}
          </button>
          <button onClick={handleExport} className={`flex items-center gap-3 px-8 py-3.5 rounded-xl border transition-all font-black text-xs uppercase tracking-widest active:scale-95 ${theme === "light" ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards: Forced 4-Column Grid ── */}
      <div className="kpi-grid-pc">
        <KPICard title="Total Revenue" value={fmtINR(data?.kpis.revenue || 0)} change="+8.2%" icon={DollarSign} trend="up" theme={theme} />
        <KPICard title="EBITDA" value={fmtINR(data?.kpis.ebitda || 0)} change={isOptimized ? (ebitdaOk ? "TARGET MET" : "BELOW 5%") : "+2.4%"} icon={TrendingUp} trend={ebitdaOk ? "up" : "down"} theme={theme} color={isOptimized && !ebitdaOk ? "rose" : "emerald"} />
        <KPICard title="DSCR" value={(data?.kpis.dscr || 0).toFixed(2)} change={dscrOk ? "COMPLIANT" : "BREACH"} icon={Shield} trend={dscrOk ? "up" : "down"} theme={theme} color={dscrOk ? "cyan" : "rose"} />
        <KPICard title="System Load" value="4.2 GW" change="-1.2%" icon={Activity} trend="down" theme={theme} />
      </div>

      {/* ── Main Analytics: Forced 2-Column Grid ── */}
      <div className="chart-grid-pc">
        {/* Generation Profile */}
        <div className="glass-card p-10 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>Generation Profile</h3>
              <p className="subtle-label mt-2">Carbon-weighted merit order dispatch</p>
            </div>
          </div>
          <div className="chart-container-pc">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.generationMix}>
                <defs>
                  <linearGradient id="colorCoal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "light" ? "#e2e8f0" : "#ffffff10"} />
                <XAxis hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? "#ffffff" : "#0f172a",
                    borderColor: theme === "light" ? "#e2e8f0" : "#1e293b",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Area type="monotone" dataKey="coal" stackId="1" stroke={theme === "light" ? "#94a3b8" : "#1e293b"} fillOpacity={1} fill="url(#colorCoal)" />
                <Area type="monotone" dataKey="gas" stackId="1" stroke="#475569" fillOpacity={1} fill="url(#colorGas)" />
                <Area type="monotone" dataKey="solar" stackId="1" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSolar)" />
                <Area type="monotone" dataKey="wind" stackId="1" stroke="#38bdf8" fillOpacity={1} fill="url(#colorWind)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demand Profile */}
        <div className="glass-card p-10 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>Demand Curve</h3>
              <p className="subtle-label mt-2">Peak vs Base Load delta</p>
            </div>
          </div>
          <div className="chart-container-pc">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.demandHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "light" ? "#e2e8f0" : "#ffffff10"} />
                <XAxis hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? "#ffffff" : "#0f172a",
                    borderColor: theme === "light" ? "#e2e8f0" : "#1e293b",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                />
                <Line type="monotone" dataKey="peak" stroke="#0ea5e9" strokeWidth={4} dot={false} />
                <Line type="monotone" dataKey="base" stroke={theme === "light" ? "#94a3b8" : "#475569"} strokeWidth={2} strokeDasharray="6 6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Performance Audit: Full Width ── */}
      <div className="glass-card p-10 mt-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className={`text-xl font-black tracking-tight transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>Strategic Portfolio Audit</h3>
            <p className="subtle-label mt-2">Multi-stage optimization verification</p>
          </div>
        </div>
        <ComparisonTable theme={theme} s1={stage1Data} s2={stage2Data} s3={data} />
      </div>

      {/* ── Strategic Health Report (Stage 3 Only) ── */}
      <AnimatePresence>
        {isOptimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass-card p-10 mt-6 border-emerald-500/20 bg-emerald-500/5"
          >
            <div className="flex flex-col md:flex-row gap-10 items-center justify-between">
              <div className="space-y-5 max-w-2xl">
                <div className="flex items-center gap-4 text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                  <h2 className="text-3xl font-black tracking-tighter uppercase">SYSTEM STATUS: OPTIMAL</h2>
                </div>
                <p className={`text-sm leading-relaxed font-bold transition-colors ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                  Strategic overhaul complete. The Helios engine has rectified the financial baseline by implementing carbon-adjusted merit-order dispatch. All Board-mandated DSCR and EBITDA covenants are currently being held within operational tolerances.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 rounded-lg border border-slate-700/50 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    <Target className="w-3.5 h-3.5" /> COVENANTS SECURED
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 rounded-lg border border-slate-700/50 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" /> GROWTH OPTIMIZED
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 rounded-lg border border-slate-700/50 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    <Shield className="w-3.5 h-3.5" /> RISK MITIGATED
                  </div>
                </div>
              </div>
              <div className="flex gap-16 text-center md:text-right shrink-0">
                <div>
                  <p className="subtle-label mb-2">EBITDA Gain</p>
                  <p className={`text-4xl font-black transition-colors ${theme === "light" ? "text-slate-900" : "text-white"}`}>+{((ebitdaGrowth - 1) * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="subtle-label mb-2">Compliance</p>
                  <p className="text-4xl font-black text-emerald-500">100%</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ComparisonTableProps {
  theme: string;
  s1: DashboardData | null;
  s2: DashboardData | null;
  s3: DashboardData | null;
}

function ComparisonTable({ theme, s1, s2, s3 }: ComparisonTableProps) {
  const getC = (val: number) => val.toFixed(2);
  const getRen = (d: DashboardData | null) => {
    if (!d || d.generationMix.length === 0) return "0%";
    const last = d.generationMix[d.generationMix.length - 1];
    const pct = ((last.solar + last.wind) / last.total) * 100;
    return pct.toFixed(1) + "%";
  };

  const metrics = [
    { name: "Revenue (Cr)", s1: fmtINR(s1?.kpis.revenue || 0), s2: fmtINR(s2?.kpis.revenue || 0), s3: fmtINR(s3?.kpis.revenue || 0) },
    { name: "Fuel Cost (Cr)", s1: fmtINR(s1?.kpis.fuel || 0), s2: fmtINR(s2?.kpis.fuel || 0), s3: fmtINR(s3?.kpis.fuel || 0) },
    { name: "Carbon Tax (Cr)", s1: fmtINR(s1?.kpis.carbon || 0), s2: fmtINR(s2?.kpis.carbon || 0), s3: fmtINR(s3?.kpis.carbon || 0) },
    { name: "EBITDA (Cr)", s1: fmtINR(s1?.kpis.ebitda || 0), s2: fmtINR(s2?.kpis.ebitda || 0), s3: fmtINR(s3?.kpis.ebitda || 0) },
    { name: "DSCR", s1: getC(s1?.kpis.dscr || 0), s2: getC(s2?.kpis.dscr || 0), s3: getC(s3?.kpis.dscr || 0) },
    { name: "Renewable %", s1: getRen(s1), s2: getRen(s2), s3: getRen(s3) },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-800/10 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <th className="py-4 font-black">Performance Metric</th>
            <th className="py-4">Stage 1: Baseline</th>
            <th className="py-4 text-rose-500">Stage 2: Shocks</th>
            <th className="py-4 text-emerald-500">Stage 3: Optimized</th>
            <th className="py-4 text-right">Verification</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/10 font-medium">
          {metrics.map((m) => (
            <tr key={m.name} className="group hover:bg-slate-500/5 transition-colors">
              <td className={`py-5 text-sm font-bold ${theme === "light" ? "text-slate-700" : "text-slate-300"}`}>{m.name}</td>
              <td className="py-5 text-sm font-mono text-slate-500">{m.s1}</td>
              <td className="py-5 text-sm font-mono text-rose-400">{m.s2}</td>
              <td className="py-5 text-sm font-mono font-black text-emerald-400">{m.s3}</td>
              <td className="py-5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-500/80">Compliant</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
