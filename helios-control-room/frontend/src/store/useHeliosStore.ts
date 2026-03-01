import { create } from 'zustand';

export interface DecisionLog {
    id: string;
    timestamp: number;
    scenario: string;
    note: string;
}

interface ScenarioParams {
    appMode: 'Baseline' | 'Shock' | 'Optimized';
    isRegimeShiftActive: boolean;
    isOptimizationActive: boolean;
    fuelPriceMultiplier: number;
    capacityDerate: number;
    renewableObligationPct: number;
    carbonPriceMultiplier: number;
    penaltyPerExcessTon: number;
    coalPriceVolatility: number;
    gasPriceVolatility: number;
    spotPriceMultiplier: number;
}

interface GlobalState {
    selectedState: string | null;
    dateFrom: string;
    dateTo: string;
}

interface HeliosStore {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    globalState: GlobalState;
    setSelectedState: (state: string | null) => void;
    setDateRange: (from: string, to: string) => void;
    scenarioParams: ScenarioParams;
    setAppMode: (mode: 'Baseline' | 'Shock' | 'Optimized') => void;
    setRegimeShiftActive: (isShift: boolean) => void;
    setOptimizationActive: (isOpt: boolean) => void;
    setFuelPriceMultiplier: (mult: number) => void;
    setCapacityDerate: (derate: number) => void;
    setRenewableObligationPct: (pct: number) => void;
    setCarbonPriceMultiplier: (mult: number) => void;
    setPenaltyPerExcessTon: (penalty: number) => void;
    setCoalPriceVolatility: (v: number) => void;
    setGasPriceVolatility: (v: number) => void;
    setSpotPriceMultiplier: (mult: number) => void;
    decisionLogs: DecisionLog[];
    addDecisionLog: (note: string) => void;
    removeDecisionLog: (id: string) => void;
    clearDecisionLogs: () => void;
}

export const useHeliosStore = create<HeliosStore>((set) => ({
    theme: 'dark',
    setTheme: (theme) => set({ theme }),

    globalState: {
        selectedState: null,
        dateFrom: '2020-01-01',
        dateTo: '2020-12-31',
    },
    setSelectedState: (selectedState) =>
        set((state) => ({ globalState: { ...state.globalState, selectedState } })),
    setDateRange: (dateFrom, dateTo) =>
        set((state) => ({ globalState: { ...state.globalState, dateFrom, dateTo } })),

    scenarioParams: {
        appMode: 'Baseline',
        isRegimeShiftActive: false,
        isOptimizationActive: false,
        fuelPriceMultiplier: 1.0,
        capacityDerate: 0.0,
        renewableObligationPct: 30.0,
        carbonPriceMultiplier: 1.0,
        penaltyPerExcessTon: 0.0,
        coalPriceVolatility: 0,
        gasPriceVolatility: 0,
        spotPriceMultiplier: 1.0,
    },
    setAppMode: (appMode) =>
        set((state) => ({
            scenarioParams: {
                ...state.scenarioParams,
                appMode,
                isRegimeShiftActive: appMode !== 'Baseline',
                isOptimizationActive: appMode === 'Optimized',
                fuelPriceMultiplier: appMode !== 'Baseline' ? 1.5 : 1.0,
                capacityDerate: appMode !== 'Baseline' ? 0.2 : 0.0,
                renewableObligationPct: appMode !== 'Baseline' ? 45.0 : 30.0,
                carbonPriceMultiplier: appMode !== 'Baseline' ? 2.5 : 1.0,
                penaltyPerExcessTon: appMode !== 'Baseline' ? 50.0 : 0.0,
                spotPriceMultiplier: appMode !== 'Baseline' ? 1.5 : 1.0,
            }
        })),
    setRegimeShiftActive: (isShift) =>
        set((state) => ({
            scenarioParams: {
                ...state.scenarioParams,
                isRegimeShiftActive: isShift,
                isOptimizationActive: isShift ? state.scenarioParams.isOptimizationActive : false,
                appMode: isShift ? (state.scenarioParams.isOptimizationActive ? 'Optimized' : 'Shock') : 'Baseline',
                fuelPriceMultiplier: isShift ? 1.5 : 1.0,
                capacityDerate: isShift ? 0.2 : 0.0,
                renewableObligationPct: isShift ? 45.0 : 30.0,
                carbonPriceMultiplier: isShift ? 2.5 : 1.0,
                penaltyPerExcessTon: isShift ? 50.0 : 0.0,
                spotPriceMultiplier: isShift ? 1.5 : 1.0,
            },
        })),
    setOptimizationActive: (isOpt) =>
        set((state) => ({
            scenarioParams: {
                ...state.scenarioParams,
                isOptimizationActive: isOpt,
                isRegimeShiftActive: isOpt ? true : state.scenarioParams.isRegimeShiftActive,
                appMode: isOpt ? 'Optimized' : (state.scenarioParams.isRegimeShiftActive ? 'Shock' : 'Baseline'),
            }
        })),
    setFuelPriceMultiplier: (mult) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, fuelPriceMultiplier: mult },
        })),
    setCapacityDerate: (derate) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, capacityDerate: derate },
        })),
    setRenewableObligationPct: (pct) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, renewableObligationPct: pct },
        })),
    setCarbonPriceMultiplier: (mult) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, carbonPriceMultiplier: mult },
        })),
    setPenaltyPerExcessTon: (penalty) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, penaltyPerExcessTon: penalty },
        })),
    setCoalPriceVolatility: (v: number) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, coalPriceVolatility: v },
        })),
    setGasPriceVolatility: (v: number) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, gasPriceVolatility: v },
        })),
    setSpotPriceMultiplier: (mult: number) =>
        set((state) => ({
            scenarioParams: { ...state.scenarioParams, spotPriceMultiplier: mult },
        })),

    decisionLogs: [],
    addDecisionLog: (note) =>
        set((state) => {
            const scenarioSummary = `Fuel: ${state.scenarioParams.fuelPriceMultiplier}x | Ren: ${state.scenarioParams.renewableObligationPct}% | Carbon: ${state.scenarioParams.carbonPriceMultiplier}x | Penalty: ₹${state.scenarioParams.penaltyPerExcessTon}`;
            const newLog: DecisionLog = {
                id: Math.random().toString(36).substring(2, 9),
                timestamp: Date.now(),
                scenario: scenarioSummary,
                note,
            };
            return { decisionLogs: [newLog, ...state.decisionLogs] };
        }),
    removeDecisionLog: (id) =>
        set((state) => ({
            decisionLogs: state.decisionLogs.filter((log) => log.id !== id),
        })),
    clearDecisionLogs: () => set({ decisionLogs: [] }),
}));
