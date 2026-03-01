"use client";

import { useHeliosStore } from "@/store/useHeliosStore";
import { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } from "recharts";

interface ComplianceGaugeProps {
    systemEmissionIntensity: number;
    systemRenewablePct: number;
    maxEmissionCap: number;
}

export function ComplianceGauge({ systemEmissionIntensity, systemRenewablePct, maxEmissionCap }: ComplianceGaugeProps) {
    const { scenarioParams } = useHeliosStore();

    // Data for the radial chart
    const data = [
        {
            name: "Emission Limits",
            value: (systemEmissionIntensity / maxEmissionCap) * 100,
            fill: "#0ea5e9",
        },
        {
            name: "Renewable Target",
            value: systemRenewablePct,
            fill: "#38bdf8",
        }
    ];

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-xl p-6 h-80 flex flex-col justify-between">
            <h3 className="text-slate-400 font-semibold mb-2">Regulatory Tracking</h3>

            <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="100%"
                        barSize={20}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <RadialBar
                            background={{ fill: '#1e293b' }}
                            dataKey="value"
                            cornerRadius={10}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#e2e8f0' }}
                            formatter={(val: number | string | Array<number | string> | undefined) => `${Number(val || 0).toFixed(1)}%`}
                        />
                        <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ bottom: -20, fontSize: '12px', color: '#cbd5e1' }} />
                    </RadialBarChart>
                </ResponsiveContainer>

                {/* Center Text displaying overall health visually */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
                    <span className="text-2xl font-bold text-white">
                        {Math.max(data[0].value, data[1].value).toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-500">Max Pressure</span>
                </div>
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-400 mt-6 pt-4 border-t border-slate-800">
                <div>Cap: {systemEmissionIntensity.toFixed(2)} / {maxEmissionCap} t/MWh</div>
                <div>Ren: {systemRenewablePct.toFixed(1)}% / {scenarioParams.renewableObligationPct}%</div>
            </div>
        </div>
    );
}
