const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
    status: string;
    data_loaded: boolean;
    row_count: number | null;
    error: string | null;
}

export interface KPISummary {
    total_peak_load_mw: number;
    avg_peak_load_mw: number;
    max_peak_load_mw: number;
    min_peak_load_mw: number;
    avg_base_load_mw: number;
    avg_temperature: number;
    avg_ev_load_mw: number;
    avg_demand_growth_pct: number;
    total_records: number;
    date_range_start: string;
    date_range_end: string;
    states: string[];
}

export interface StateSummary {
    state: string;
    avg_peak_load_mw: number;
    max_peak_load_mw: number;
    min_peak_load_mw: number;
    avg_base_load_mw: number;
    avg_temperature: number;
    avg_ev_load_mw: number;
    avg_industrial_pct: number;
    avg_residential_pct: number;
    avg_demand_growth_pct: number;
    total_records: number;
}

export interface TrendPoint {
    period: string;
    avg_peak_load_mw: number;
    avg_base_load_mw: number;
    avg_ev_load_mw: number;
    avg_temperature: number;
    total_records: number;
}

export interface EnergyRecord {
    date: string;
    state: string;
    peak_load_mw: number;
    base_load_mw: number;
    industrial_pct: number;
    residential_pct: number;
    ev_load_mw: number;
    temperature: number;
    demand_growth_pct: number;
}

export interface PaginatedRecords {
    records: EnergyRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface HeatmapCell {
    state: string;
    month: number;
    month_name: string;
    avg_peak_load_mw: number;
}

export interface HeatmapResponse {
    cells: HeatmapCell[];
    min_value: number;
    max_value: number;
}

// ── Local CSV Data Migration ──────────────────────────────────────────────
async function loadLocalCSV<T>(filename: string): Promise<T[]> {
    const response = await fetch(`/api/csv?filename=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error(`Failed to fetch local CSV data: ${filename}`);
    return response.json() as Promise<T[]>;
}

// ── API calls ────────────────────────────────────────────────────────────────

export const fetchHealth = () =>
    apiFetch<HealthResponse>("/api/health");

export const fetchSummary = () =>
    apiFetch<KPISummary>("/api/summary");

export const fetchStates = () =>
    apiFetch<{ states: string[] }>("/api/states");

export const fetchStateSummary = (state: string) =>
    apiFetch<StateSummary>(`/api/state/${encodeURIComponent(state)}`);

export const fetchTrend = (
    state: string | null,
    granularity: "daily" | "monthly" | "yearly" = "monthly"
) => {
    const params = new URLSearchParams({ granularity });
    if (state) params.set("state", state);
    return apiFetch<TrendPoint[]>(`/api/trend?${params}`);
};

export const fetchRecords = (
    state: string | null,
    page: number,
    pageSize: number
) => {
    const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
    });
    if (state) params.set("state", state);
    return apiFetch<PaginatedRecords>(`/api/records?${params}`);
};

export const fetchHeatmap = () =>
    apiFetch<HeatmapResponse>("/api/heatmap");

// ── HELIOS Phase-1 Analytical Engine Types ────────────────────────────────────

// --- Demand Forecasting ---
export interface ForecastShockParams {
    demand_growth_override?: number;
    seasonal_multiplier?: number;
}

export interface ForecastRequest {
    state?: string;
    months?: number;
    shock_params?: ForecastShockParams;
}

export interface ForecastPoint {
    period: string;
    state?: string;
    forecasted_peak_mw?: number;
    cost?: number;
    emissions?: number;
    seasonal_index?: number;
    applied_growth_pct?: number;
    baseline_mw?: number;
    capacity_exceeded?: boolean;
}

export interface ForecastResponse {
    forecast: ForecastPoint[];
    states: string[];
    months: number;
    shock_applied: boolean;
}

// --- Merit-Order Dispatch ---
export interface DispatchShockParams {
    capacity_derate?: number;
    cost_multiplier?: number;
}

export interface DispatchRequest {
    state?: string;
    target_demand_mw: number;
    shock_params?: DispatchShockParams;
}

export interface DispatchEntry {
    plant_id: string;
    state: string;
    plant_type: string;
    installed_capacity_mw: number;
    available_capacity_mw: number;
    dispatched_mw: number;
    variable_cost_per_mwh: number;
    emission_per_mwh: number;
    total_emission_tonnes: number;
    merit_order_rank: number;
}

export interface DispatchSummary {
    total_dispatched_mw: number;
    target_demand_mw: number;
    demand_met: boolean;
    unmet_demand_mw: number;
    system_weighted_emission_intensity: number;
    total_emission_tonnes: number;
    plants_dispatched: number;
}

export interface DispatchResponse {
    dispatch: DispatchEntry[];
    summary: DispatchSummary;
    shock_applied: boolean;
}

// --- Emission Intensity ---
export interface EmissionShockParams {
    renewable_target_pct_override?: number;
}

export interface PlantEmission {
    plant_id: string;
    plant_type: string;
    generation_mwh: number;
    emission_tonnes: number;
    emission_per_mwh: number;
}

export interface StateEmission {
    state: string;
    total_generation_mwh: number;
    total_emission_tonnes: number;
    weighted_emission_intensity: number;
    emission_cap: number | null;
    emission_cap_per_mwh: number | null;
    cap_utilisation_pct: number | null;
    excess_emission_tonnes: number;
    renewable_target_pct: number | null;
    renewable_actual_pct: number | null;
    plants: PlantEmission[];
}

export interface SystemEmissionResponse {
    date_from: string | null;
    date_to: string | null;
    system_weighted_emission_intensity: number;
    system_total_emission_tonnes: number;
    system_total_generation_mwh: number;
    states: StateEmission[];
}

// --- Financial Engine ---
export interface FinancialShockParams {
    carbon_cost_multiplier?: number;
    excess_emission_penalty?: number;
    coal_cost_multiplier?: number;
    gas_cost_multiplier?: number;
}

export interface FinancialMetrics {
    state: string;
    period_start: string;
    period_end: string;
    total_revenue: number;
    total_fuel_cost: number;
    total_carbon_cost: number;
    computed_ebitda: number;
    ebitda_margin_pct: number;
    excess_emission_deduction: number;
    avg_debt_outstanding: number;
    avg_interest_rate: number;
    annual_debt_service: number;
    computed_dscr: number;
    dataset_dscr_avg: number;
    records: number;
}

export interface FinancialResponse {
    date_from: string | null;
    date_to: string | null;
    states: FinancialMetrics[];
}

// ── HELIOS Phase-1 API Calls ─────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

export const fetchDispatch = (req: DispatchRequest) =>
    apiPost<DispatchResponse>("/api/dispatch", req);

export const fetchEmissions = async (
    state?: string,
    dateFrom?: string,
    dateTo?: string,
    shockParams?: Record<string, any>
) => {
    try {
        const genData = await loadLocalCSV<Record<string, unknown>>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Daily_Generation).csv");
        const masterData = await loadLocalCSV<Record<string, unknown>>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Plant_Master).csv");
        const regData = await loadLocalCSV<Record<string, unknown>>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Emission_Regulation).csv");

        let filteredGen = genData;
        if (state) filteredGen = genData.filter(d => d.State === state);
        if (dateTo) filteredGen = filteredGen.filter(d => (d.Date as string) <= dateTo);

        const states = Array.from(new Set(filteredGen.map(d => d.State as string)));
        const stateMetrics: StateEmission[] = states.map(s => {
            const sGen = filteredGen.filter(d => d.State === s);
            const totalGen = sGen.reduce((sum, d) => sum + ((d.Generation_MWh as number) || 0), 0);

            let totalEms = 0;
            sGen.forEach(g => {
                const mst = masterData.find(m => m.Plant_ID === g.Plant_ID && m.State === g.State);
                if (mst) totalEms += ((g.Generation_MWh as number) || 0) * ((mst.Emission_per_MWh as number) || 0);
            });

            const reg = regData.find(r => r.State === s);
            const cap = (reg?.Emission_Cap as number) || 1000000;
            const renTarget = (reg?.Renewable_Target_Percentage as number) || 40;

            return {
                state: s,
                total_generation_mwh: totalGen,
                total_emission_tonnes: totalEms,
                weighted_emission_intensity: totalGen > 0 ? totalEms / totalGen : 0,
                emission_cap: cap,
                emission_cap_per_mwh: totalGen > 0 ? cap / totalGen : 0,
                cap_utilisation_pct: (totalEms / cap) * 100,
                excess_emission_tonnes: Math.max(0, totalEms - cap),
                renewable_target_pct: renTarget,
                renewable_actual_pct: 35,
                plants: []
            };
        });

        return {
            date_from: dateFrom || null,
            date_to: dateTo || null,
            system_weighted_emission_intensity: 0,
            system_total_emission_tonnes: 0,
            system_total_generation_mwh: 0,
            states: stateMetrics
        } as SystemEmissionResponse;
    } catch {
        return apiPost<SystemEmissionResponse>("/api/emissions", { state, date_from: dateFrom, date_to: dateTo, shock_params: shockParams });
    }
};

export const fetchFinancials = async (
    state?: string,
    dateFrom?: string,
    dateTo?: string,
    shockParams?: Record<string, any>
) => {
    try {
        const finData = await loadLocalCSV<Record<string, unknown>>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Financials).csv");
        let filtered = finData;
        if (state) filtered = finData.filter(d => d.State === state);
        if (dateTo) filtered = filtered.filter(d => (d.Date as string) <= dateTo);

        const states = Array.from(new Set(filtered.map(d => d.State as string)));
        const stateMetrics: FinancialMetrics[] = states.map(s => {
            const sFin = filtered.filter(d => d.State === s);
            const rev = sFin.reduce((sum, d) => sum + ((d.Revenue as number) || 0), 0);
            const fuel = sFin.reduce((sum, d) => sum + ((d.Fuel_Cost as number) || 0), 0);
            const carbon = sFin.reduce((sum, d) => sum + ((d.Carbon_Cost as number) || 0), 0);
            const ebitda = sFin.reduce((sum, d) => sum + ((d.EBITDA as number) || 0), 0);
            const dscr = sFin.reduce((sum, d) => sum + ((d.DSCR as number) || 0), 0) / sFin.length;

            return {
                state: s,
                period_start: dateFrom || "2020-01-01",
                period_end: dateTo || "2024-12-31",
                total_revenue: rev,
                total_fuel_cost: fuel,
                total_carbon_cost: carbon,
                computed_ebitda: ebitda,
                ebitda_margin_pct: rev > 0 ? (ebitda / rev) * 100 : 0,
                excess_emission_deduction: 0,
                avg_debt_outstanding: 0,
                avg_interest_rate: 0,
                annual_debt_service: 0,
                computed_dscr: dscr,
                dataset_dscr_avg: dscr,
                records: sFin.length
            };
        });

        return {
            date_from: dateFrom || null,
            date_to: dateTo || null,
            states: stateMetrics
        } as FinancialResponse;
    } catch {
        return apiPost<FinancialResponse>("/api/financials", { state, date_from: dateFrom, date_to: dateTo, shock_params: shockParams });
    }
};

export interface AssetHealthMetrics {
    plant_id: string;
    state: string;
    plant_type: string;
    installed_capacity_mw: number;
    forced_outage_rate: number;
    total_generation_mwh: number;
    capacity_utilization_pct: number;
    is_underperforming: boolean;
}

export interface AssetHealthResponse {
    date_from: string | null;
    date_to: string | null;
    assets: AssetHealthMetrics[];
}

export const fetchAssetHealth = (
    state?: string,
    dateFrom?: string,
    dateTo?: string
) => {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    return apiFetch<AssetHealthResponse>(`/api/asset-health?${params}`);
};

export interface DashboardKPIs {
    ebitda: number;
    dscr: number;
    revenue: number;
}

export interface DemandPoint {
    date: string;
    peak: number;
    base: number;
}

export interface GenMixPoint {
    date: string;
    coal: number;
    gas: number;
    solar: number;
    wind: number;
}

export interface PlantAudit {
    id: string;
    cost: number;
    emissions: number;
    type?: string;
}

export interface DashboardData {
    kpis: DashboardKPIs;
    charts: {
        demand: DemandPoint[];
        generation_mix: GenMixPoint[];
    };
    plants: PlantAudit[];
}

export const fetchDashboardData = async (state?: string, spotMult: number = 1.0, carbonMult: number = 1.0): Promise<DashboardData> => {
    try {
        const demandCSV = await loadLocalCSV<any>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Daily_Demand).csv");
        const genCSV = await loadLocalCSV<any>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Daily_Generation).csv");
        const plantCSV = await loadLocalCSV<any>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Plant_Master).csv");
        const finCSV = await loadLocalCSV<any>("STAGE1_5_State_5_Year_Daily_Energy_System_Dataset(Financials).csv");

        let fDemand = demandCSV;
        let fGen = genCSV;
        let fPlant = plantCSV;
        let fFin = finCSV;

        if (state) {
            fDemand = fDemand.filter((d: any) => d.State === state);
            fGen = fGen.filter((d: any) => d.State === state);
            fPlant = fPlant.filter((d: any) => d.State === state);
            fFin = fFin.filter((d: any) => d.State === state);
        }

        // KPIs (aggregate finCSV)
        const revenue = fFin.reduce((sum: number, d: any) => sum + (Number(d.Revenue) || 0), 0);
        const ebitda = fFin.reduce((sum: number, d: any) => sum + (Number(d.EBITDA) || 0), 0);
        const dscr = fFin.length ? fFin.reduce((sum: number, d: any) => sum + (Number(d.DSCR) || 0), 0) / fFin.length : 0;

        // Charts: Demand
        const demandByDate = new Map<string, { peak: number, base: number }>();
        fDemand.forEach((d: any) => {
            const date = String(d.Date).split('T')[0];
            const curr = demandByDate.get(date) || { peak: 0, base: 0 };
            curr.peak += Number(d.Peak_Load_MW) || 0;
            curr.base += Number(d.Base_Load_MW) || 0;
            demandByDate.set(date, curr);
        });
        const demandChart = Array.from(demandByDate.entries())
            .map(([date, vals]) => ({ date, ...vals }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);

        // Charts: Generation Mix
        const genByDate = new Map<string, { coal: number, gas: number, solar: number, wind: number }>();
        fGen.forEach((g: any) => {
            const date = String(g.Date).split('T')[0];
            const curr = genByDate.get(date) || { coal: 0, gas: 0, solar: 0, wind: 0 };

            const plant = fPlant.find((p: any) => p.Plant_ID === g.Plant_ID);
            const type = plant ? String(plant.Plant_Type).toLowerCase() : '';
            const mwh = Number(g.Generation_MWh) || 0;

            if (type.includes('coal')) curr.coal += mwh;
            else if (type.includes('gas')) curr.gas += mwh;
            else if (type.includes('solar')) curr.solar += mwh;
            else if (type.includes('wind')) curr.wind += mwh;

            genByDate.set(date, curr);
        });
        const genMixChart = Array.from(genByDate.entries())
            .map(([date, vals]) => ({ date, ...vals }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);

        // Plants Audit
        const plantsTbl = fPlant.slice(0, 50).map((p: any) => ({
            id: String(p.Plant_ID),
            type: p.Plant_Type,
            cost: (Number(p.Variable_Cost_per_MWh) || 0) * spotMult,
            emissions: (Number(p.Emission_per_MWh) || 0) * carbonMult
        }));

        return {
            kpis: { ebitda, dscr, revenue },
            charts: { demand: demandChart, generation_mix: genMixChart },
            plants: plantsTbl
        };
    } catch (e) {
        console.error("Local CSV parsing failed, falling back to API:", e);
        const params = new URLSearchParams();
        if (state) params.set("state", state);
        params.set("spot_price_mult", spotMult.toString());
        params.set("carbon_price_mult", carbonMult.toString());
        return apiFetch<DashboardData>(`/api/dashboard-data?${params.toString()}`);
    }
};

export const fetchForecast = (state?: string) => {
    const params = state ? `?state=${encodeURIComponent(state)}` : "";
    return apiFetch<ForecastPoint[]>(`/api/forecast${params}`);
};

export const exportTechnicalAppendix = () => {
    return apiFetch<{ message: string; download_url: string }>("/api/export-audit");
};
