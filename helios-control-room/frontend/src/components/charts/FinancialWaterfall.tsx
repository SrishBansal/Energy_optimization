"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { StateFinancials } from "@/lib/data";
import { fmtINR } from "@/lib/utils";

interface Props {
    metrics: StateFinancials[];
}

export function FinancialWaterfall({ metrics }: Props) {
    const bars = useMemo(() => {
        if (!metrics.length) return [];
        const rev = metrics.reduce((s, m) => s + m.revenue, 0);
        const fuel = metrics.reduce((s, m) => s + m.base_fuel_cost + m.fuel_volatility_impact, 0);
        const carbon = metrics.reduce((s, m) => s + m.base_carbon_cost + m.carbon_burden, 0);
        const penalties = metrics.reduce((s, m) => s + m.penalties, 0);
        const ebitda = rev - fuel - carbon - penalties;

        return [
            { name: "Revenue", value: rev, start: 0, end: rev, fill: "#0ea5e9" },
            { name: "Fuel Cost", value: -fuel, start: rev - fuel, end: rev, fill: "#475569" },
            { name: "Carbon Cost", value: -carbon, start: ebitda + penalties, end: rev - fuel, fill: "#64748b" },
            { name: "Penalties", value: -penalties, start: ebitda, end: ebitda + penalties, fill: "#94a3b8" },
            { name: "EBITDA", value: ebitda, start: 0, end: ebitda, fill: "#38bdf8" },
        ];
    }, [metrics]);

    if (!bars.length) return (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No financial data available</div>
    );

    return (
        <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tickFormatter={fmtINR} tickLine={false} axisLine={false} width={80} tick={{ fontSize: 11 }} />
                    <Tooltip
                        formatter={(val: any, _: any, props: any) => [fmtINR(Math.abs(props.payload.value)), props.payload.name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    />
                    <Bar dataKey={(d: any) => [d.start, d.end]} radius={[4, 4, 4, 4]}>
                        {bars.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
