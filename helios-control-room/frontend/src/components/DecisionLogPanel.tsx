"use client";

import { useState } from "react";
import { useHeliosStore } from "@/store/useHeliosStore";
import { Save, Trash2, Download, FileText, X } from "lucide-react";

interface DecisionLogPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DecisionLogPanel({ isOpen, onClose }: DecisionLogPanelProps) {
    const { decisionLogs, addDecisionLog, removeDecisionLog, clearDecisionLogs } = useHeliosStore();
    const [note, setNote] = useState("");

    const handleAdd = () => {
        if (!note.trim()) return;
        addDecisionLog(note.trim());
        setNote("");
    };

    const handleExport = () => {
        if (!decisionLogs.length) return;

        const headers = ["Timestamp", "Scenario_State", "Decision_Note"];
        const rows = decisionLogs.map(log => [
            new Date(log.timestamp).toISOString(),
            `"${log.scenario}"`,
            `"${log.note.replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `helios_decision_log_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop overlay */}
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <FileText className="text-cyan-400" />
                        <h2 className="text-lg font-semibold text-slate-200">Decision Log</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {decisionLogs.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">
                            No assumptions logged yet.
                        </div>
                    ) : (
                        decisionLogs.map((log) => (
                            <div key={log.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-[10px] text-slate-500 font-mono">
                                        {new Date(log.timestamp).toLocaleTimeString()} - {new Date(log.timestamp).toLocaleDateString()}
                                    </div>
                                    <button
                                        onClick={() => removeDecisionLog(log.id)}
                                        className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-200 mb-3">{log.note}</p>
                                <div className="text-[10px] text-cyan-500/80 font-mono bg-cyan-500/10 p-2 rounded-lg break-words">
                                    {log.scenario}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 blur-backdrop-xl">
                    <div className="flex flex-col gap-3">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAdd())}
                            placeholder="Record assumption (e.g., Target renewables to 50%...)"
                            className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:ring-cyan-500 focus:border-cyan-500 min-h-[80px] resize-none"
                        />
                        <div className="flex justify-between items-center">
                            <button
                                onClick={handleExport}
                                disabled={decisionLogs.length === 0}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!note.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-lg shadow-cyan-900/20"
                            >
                                <Save className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
