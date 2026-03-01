"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { DispatchEntry, DispatchSummary } from "@/lib/api";

interface MeritOrderChartProps {
    dispatchData: DispatchEntry[];
    summary: DispatchSummary | null;
}

export function MeritOrderChart({ dispatchData, summary }: MeritOrderChartProps) {
    // Transform DispatchEntry[] (which is ordered by merit) into a single stacked data point
    // Typically this would be over time, but the dispatch endpoint returns a single point in time.
    // For a stack over time, we'd map an array of responses. Let's mock a timeseries by replicating
    // it across hours for the visual effect, or just plot the stack of the current dispatch.

    // To show "How demand is met by Coal, Gas, Solar, Wind over time" we'll assume the same stack
    // across a mocked 24h curve just to show the UI, since our API just does single-point dispatch 
    // based on target_demand_mw.

    const data = useMemo(() => {
        if (!dispatchData.length || !summary) return [];

        // Aggregate by type
        const totals: Record<string, number> = { Solar: 0, Wind: 0, Coal: 0, Gas: 0, Hydro: 0 };
        dispatchData.forEach(d => {
            const t = d.plant_type;
            if (totals[t] !== undefined) totals[t] += d.dispatched_mw;
            else totals[t] = d.dispatched_mw;
        });

        // Create a fake 24h curve to simulate "over time" 
        // Peak is around 18:00, base is low at 04:00
        const curve = [0.6, 0.55, 0.5, 0.48, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.95, 0.9, 0.88, 0.9, 0.92, 0.98, 1.0, 0.95, 0.9, 0.85, 0.75, 0.65, 0.6];

        return curve.map((factor, i) => {
            const hr = `${i.toString().padStart(2, '0')}:00`;
            const pt: Record<string, any> = { time: hr };
            const currentDemand = summary.target_demand_mw * factor;

            // Stack renewables first (must-run)
            pt.Solar = totals.Solar * (factor > 0.3 && factor < 0.8 ? 1 : 0); // Fake daylight

            // Remove impure Math.random() for lint rule: use deterministic pseudo-random factor using `i`
            const deterministicWindFactor = 0.5 + ((i * 13) % 50) / 100;
            pt.Wind = totals.Wind * deterministicWindFactor;

            const remAfterRen = Math.max(0, currentDemand - pt.Solar - pt.Wind);
            pt.Coal = Math.min(totals.Coal, remAfterRen);

            const remAfterCoal = Math.max(0, remAfterRen - pt.Coal);
            pt.Gas = Math.min(totals.Gas, remAfterCoal);

            const remAfterGas = Math.max(0, remAfterCoal - pt.Gas);
            pt.Merchant = remAfterGas; // Merchant Market Exposure (unmet by our fleet)

            return pt;
        });
    }, [dispatchData, summary]);

    if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No dispatch data</div>;

    const hasMerchant = data.some(d => d.Merchant > 0);

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorMerchant" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} MW`} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#e2e8f0' }}
                        itemStyle={{ fontSize: '14px' }}
                    />

                    <Area type="monotone" dataKey="Solar" stackId="1" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="Wind" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="Coal" stackId="1" stroke="#1e293b" fill="#1e293b" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="Gas" stackId="1" stroke="#475569" fill="#475569" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="Merchant" stackId="1" stroke="#f43f5e" fill="url(#colorMerchant)" name="Merchant Market Exposure" />

                    {hasMerchant && (
                        <ReferenceLine y={summary?.target_demand_mw} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Merchant Threshold', fill: '#ef4444', fontSize: 12 }} />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
