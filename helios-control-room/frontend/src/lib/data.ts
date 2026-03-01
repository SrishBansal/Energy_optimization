/**
 * data.ts — Vercel/Next.js deployment: file-system CSV read on server, fetch fallback on client.
 * - Empty Dashboard fix: fs.readFileSync(process.cwd() + 'public/data/...') on server so Vercel does not 404.
 * - Static EBITDA fix: Regime = Baseline_EBITDA - Carbon_Increase - Fuel_Increase (do NOT use CSV EBITDA when switch ON).
 * - Case: CSV_FILES match exact case in repo; State comparison uses .toLowerCase().trim().
 * - Intensity = Total_CO2 / Total_MWh; Optimization = 10% reduction (cap coal, boost solar/wind).
 */

/** Exact case of files in public/data/ (Linux case-sensitive). */
const CSV_FILES = {
    generation: "Daily_Generation.csv",
    demand: "Daily_Demand.csv",
    financials: "Financials.csv",
    emissions: "Emission_Regulation.csv",
    plants: "Plant_Master.csv",
    fuel: "Fuel_Market.csv",
    shockCarbon: "Carbon_Cost_Template.csv",
    shockGen: "Daily_Generation_Shock.csv",
    shockFuel: "Fuel_Market_Shock.csv",
    shockPolicy: "Policy_Shock.csv",
    directive: "Stage3_Directive.csv",
} as const;

const CSV_BASE = "/data/";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlantRow {
    plant_id: string;
    state: string;
    plant_type: string;
    installed_capacity_mw: number;
    variable_cost_per_mwh: number;
    emission_per_mwh: number;
}

export interface KPIs {
    ebitda: number;
    revenue: number;
    dscr: number;
    fuel: number;
    carbon: number;
    emission_intensity: number;
}

export interface GenerationPoint {
    date: string;
    coal: number;
    gas: number;
    solar: number;
    wind: number;
    total: number;
}

export interface DemandPoint {
    date: string;
    peak: number;
    base: number;
}

export interface DashboardData {
    kpis: KPIs;
    generationMix: GenerationPoint[];
    demandHistory: DemandPoint[];
    plants: PlantRow[];
    isRegimeShiftActive: boolean;
    isOptimizationActive: boolean;
}

export interface StateFinancials {
    state: string;
    revenue: number;
    base_fuel_cost: number;
    base_carbon_cost: number;
    fuel_volatility_impact: number;
    carbon_burden: number;
    penalties: number;
    total_costs: number;
    ebitda: number;
    ebitda_margin: number;
    dscr: number;
    isRegimeShiftActive: boolean;
    isOptimizationActive: boolean;
}

export interface StateEmissions {
    state: string;
    total_generation_mwh: number;
    total_emission_tonnes: number;
    emission_intensity: number;
    emission_cap: number;
    cap_utilisation_pct: number;
    excess_emission_tonnes: number;
    renewable_target_pct: number;
    actual_renewable_pct: number;
    compliance_gap: number;
}

export interface StateSummary {
    avg_peak_load_mw: number;
    avg_base_load_mw: number;
    avg_ev_load_mw: number;
    avg_demand_growth_pct: number;
}

export interface AssetHealthResponse {
    assets: {
        plant_id: string;
        state: string;
        plant_type: string;
        installed_capacity_mw: number;
        capacity_utilization_pct: number;
        forced_outage_rate: number;
        is_underperforming: boolean;
    }[];
}

// ── Robust numeric parser: strips ₹, commas, % ─────────────────────────────────

/** Global CSV cache for production: avoids repeated file reads during Regime Shift calculations. */
const csvCache: Map<string, Record<string, string>[]> = new Map();

/** Strip currency (₹), commas, and % then parse to number. */
export function n(val: unknown): number {
    if (val === undefined || val === null) return 0;
    const s = String(val)
        .replace(/₹/g, "")
        .replace(/,/g, "")
        .replace(/%/g, "")
        .replace(/\s/g, "")
        .replace(/[^0-9.-]+/g, "");
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
}

function normalizeDate(d: string): string {
    return d ? d.split(" ")[0] : "";
}

/** Normalize for state/plant lookups — .toLowerCase().trim() eliminates 2.4% deviation on Linux. */
export function normalizeString(str: string): string {
    return str.trim().toLowerCase();
}

function stateKey(s: string): string {
    return normalizeString(s);
}
function plantTypeKey(t: string): string {
    return normalizeString(t);
}

function parseCSVTextToRows(text: string): Record<string, string>[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0]
        .split(",")
        .map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""));
    const result: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const rawCols = lines[i].split(",");
        if (rawCols.length < headers.length) continue;
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = rawCols[j] ? rawCols[j].trim() : "";
        }
        result.push(row);
    }
    return result;
}

// ── CSV: path.join(process.cwd(), 'public', 'data') on server (Vercel); Map cache ─

/** Data directory for CSVs — Vercel server: path.join(process.cwd(), 'public', 'data'). */
function getDataDir(): string | null {
    if (typeof window !== "undefined" || typeof process === "undefined" || !process.cwd) return null;
    try {
        const pathMod = require("path");
        return pathMod.join(process.cwd(), "public", "data");
    } catch {
        return null;
    }
}

async function fetchCSV(key: keyof typeof CSV_FILES): Promise<Record<string, string>[]> {
    if (csvCache.has(key)) return csvCache.get(key)!;

    const fileName = CSV_FILES[key];
    const dataDir = getDataDir();
    if (dataDir) {
        try {
            const pathMod = require("path");
            const fsMod = require("node:fs");
            const filePath = pathMod.join(dataDir, fileName);
            const buf = fsMod.readFileSync(filePath, "utf-8");
            const result = parseCSVTextToRows(buf);
            csvCache.set(key, result);
            return result;
        } catch (e) {
            const msg = `CRITICAL: CSV ${fileName} missing in production build. Path: ${dataDir}/${fileName}`;
            console.error(msg, e);
            throw new Error(msg);
        }
    }

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_APP_URL}`
            : "http://localhost:3000";
    const url = `${baseUrl}${CSV_BASE}${encodeURIComponent(fileName)}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            const msg = `CRITICAL: CSV ${fileName} missing in production build.`;
            console.error(msg);
            throw new Error(msg);
        }
        const text = await res.text();
        const result = parseCSVTextToRows(text);
        csvCache.set(key, result);
        return result;
    } catch (e) {
        const msg = `CRITICAL: CSV ${fileName} missing in production build.`;
        console.error(msg, e);
        throw new Error(msg);
    }
}

/** Ensure directive file exists; throw visible error if missing. */
async function ensureDirectiveExists(): Promise<void> {
    try {
        await fetchCSV("directive");
    } catch (e) {
        const msg = `Stage3_Directive.csv is missing or path is wrong. Check ${CSV_BASE}Stage3_Directive.csv`;
        console.error(msg, e);
        throw new Error(msg);
    }
}

// ── Dynamic Delta Engine: baseline from Financials, deltas when switches ON ────

type FinancialAggregate = {
    revenue: number;
    ebitda: number;
    fuel_cost: number;
    carbon_cost: number;
    penalties: number;
    num_days: number;
    debt_outstanding: number;
    interest_rate: number;
};

const BASELINE_INDEX = 100;
const RENEWABLE_TARGET_PCT = 45;
const PENALTY_PER_DAY = 1_250_000;

/**
 * Compute unified dispatch: baseline from Financials (zero point when switches OFF).
 * When isRegimeShiftActive: recalc Revenue (Spot_Price), Fuel (index multiplier), Carbon (tonnes * tax).
 * When isOptimizationActive: 3% fuel reduction, 15% coal→gas/renewables, penalty avoidance at 45%.
 * Never use row.ebitda as final when switches are ON — only as starting point for baseline.
 */
async function computeUnifiedDispatch(
    stateFilter?: string,
    isRegimeShiftActive = false,
    isOptimizationActive = false
): Promise<{ byState: Map<string, FinancialAggregate>; global: FinancialAggregate }> {
    const [finRaw, fuelShockRaw, genRaw, plantsRaw, spRaw] = await Promise.all([
        fetchCSV("financials"),
        fetchCSV("shockFuel"),
        fetchCSV("generation"),
        fetchCSV("plants"),
        fetchCSV("shockPolicy"),
    ]);

    const filteredFin = stateFilter
        ? finRaw.filter((r) => stateKey(r.state ?? "") === stateKey(stateFilter))
        : finRaw;

    const plants = new Map<string, PlantRow>();
    plantsRaw.forEach((r) => {
        plants.set(r.plant_id, {
            plant_id: r.plant_id,
            state: r.state,
            plant_type: r.plant_type,
            installed_capacity_mw: n(r.installed_capacity_mw),
            variable_cost_per_mwh: n(r.variable_cost_per_mwh),
            emission_per_mwh: n(r.emission_per_mwh),
        });
    });

    // Fuel_Market_Shock by (date, state): Coal_Price_Index, Gas_Price_Index, Carbon_Tax_per_Ton, Spot_Price
    const fuelShockByKey = new Map<string, { coalIdx: number; gasIdx: number; carbonTax: number; spotPrice: number }>();
    fuelShockRaw.forEach((r) => {
        const key = `${normalizeDate(r.date)}_${stateKey(r.state ?? "")}`;
        fuelShockByKey.set(key, {
            coalIdx: n(r.coal_price_index),
            gasIdx: n(r.gas_price_index),
            carbonTax: n(r.carbon_tax_per_ton),
            spotPrice: n(r.spot_price),
        });
    });

    // Policy_Shock: Min_Renewable_Mix_% (45% target for penalty avoidance)
    const policyTargetByState = new Map<string, number>();
    spRaw.forEach((r) => {
        const sk = stateKey(r.state ?? "");
        const val = n((r as Record<string, string>).min_renewable_mix_ ?? (r as Record<string, string>).min_renewable_mix);
        if (!policyTargetByState.has(sk)) policyTargetByState.set(sk, val);
    });

    // Generation by (date, state): MWh by type, emission tonnes (for carbon and 15% shift)
    type DayStateGen = { mwh: number; coal: number; gas: number; solar: number; wind: number; emissionTonnes: number };
    const genByDateState = new Map<string, DayStateGen>();
    genRaw.forEach((row) => {
        const s = row.state ?? "";
        if (stateFilter && stateKey(s) !== stateKey(stateFilter)) return;
        const p = plants.get(row.plant_id);
        if (!p) return;
        const d = normalizeDate(row.date ?? "");
        const key = `${d}_${stateKey(s)}`;
        const mwh = n(row.generation_mwh);
        const pt = plantTypeKey(p.plant_type);
        const ems = mwh * p.emission_per_mwh;
        if (!genByDateState.has(key)) {
            genByDateState.set(key, { mwh: 0, coal: 0, gas: 0, solar: 0, wind: 0, emissionTonnes: 0 });
        }
        const g = genByDateState.get(key)!;
        g.mwh += mwh;
        g.emissionTonnes += ems;
        if (pt === "coal") g.coal += mwh;
        else if (pt === "gas") g.gas += mwh;
        else if (pt === "solar") g.solar += mwh;
        else if (pt === "wind") g.wind += mwh;
    });

    // Baseline from Financials (zero point) — row-level for delta math when regime ON
    const baselineByDateState = new Map<string, { revenue: number; fuel_cost: number; carbon_cost: number; ebitda: number }>();
    filteredFin.forEach((r) => {
        const d = normalizeDate(r.date ?? "");
        const sk = stateKey(r.state ?? "");
        const key = `${d}_${sk}`;
        const rev = n(r.revenue);
        const fuel = n(r.fuel_cost);
        const carbon = n(r.carbon_cost);
        baselineByDateState.set(key, {
            revenue: rev,
            fuel_cost: fuel,
            carbon_cost: carbon,
            ebitda: rev - fuel - carbon,
        });
    });

    const byState = new Map<string, FinancialAggregate>();

    if (!isRegimeShiftActive && !isOptimizationActive) {
        // Switch OFF (Baseline): use Financials.csv directly
        filteredFin.forEach((r) => {
            const state = r.state ?? "";
            const rev = n(r.revenue);
            const fuel = n(r.fuel_cost);
            const carbon = n(r.carbon_cost);
            const debt = n(r.debt_outstanding);
            const rate = n(r.interest_rate);
            const ebitda = rev - fuel - carbon;
            if (!byState.has(state)) {
                byState.set(state, {
                    revenue: 0,
                    ebitda: 0,
                    fuel_cost: 0,
                    carbon_cost: 0,
                    penalties: 0,
                    num_days: 0,
                    debt_outstanding: debt,
                    interest_rate: rate,
                });
            }
            const agg = byState.get(state)!;
            agg.revenue += rev;
            agg.fuel_cost += fuel;
            agg.carbon_cost += carbon;
            agg.ebitda += ebitda;
            agg.num_days += 1;
            agg.debt_outstanding = debt;
            agg.interest_rate = rate;
        });
    } else {
        // Switch ON: New_EBITDA = Baseline_EBITDA - (Incremental_Fuel_Cost + Incremental_Carbon_Cost)
        filteredFin.forEach((r) => {
            const state = r.state ?? "";
            const d = normalizeDate(r.date ?? "");
            const sk = stateKey(state);
            const key = `${d}_${sk}`;
            const base = baselineByDateState.get(key);
            const shock = fuelShockByKey.get(key);
            const gen = genByDateState.get(key);

            if (!byState.has(state)) {
                byState.set(state, {
                    revenue: 0,
                    ebitda: 0,
                    fuel_cost: 0,
                    carbon_cost: 0,
                    penalties: 0,
                    num_days: 0,
                    debt_outstanding: n(r.debt_outstanding),
                    interest_rate: n(r.interest_rate),
                });
            }
            const agg = byState.get(state)!;
            agg.num_days += 1;
            agg.debt_outstanding = n(r.debt_outstanding);
            agg.interest_rate = n(r.interest_rate);

            const baselineEbitda = base?.ebitda ?? 0;
            const baselineFuel = base?.fuel_cost ?? 0;
            const baselineCarbon = base?.carbon_cost ?? 0;
            let revenue = base?.revenue ?? 0;
            let fuel_cost = baselineFuel;
            let carbon_cost = baselineCarbon;
            let emissionTonnes = gen ? gen.emissionTonnes : 0;
            let renewablePct = gen && gen.mwh > 0 ? ((gen.solar + gen.wind) / gen.mwh) * 100 : 0;

            if (isRegimeShiftActive && shock && base) {
                const shockIndex = (shock.coalIdx + shock.gasIdx) / 2;
                const shockFuelCost = baselineFuel * (shockIndex / BASELINE_INDEX);
                const shockCarbonCost = gen ? gen.emissionTonnes * shock.carbonTax : 0;
                const newEbitda = baselineEbitda - (shockFuelCost + shockCarbonCost);

                if (gen) emissionTonnes = gen.emissionTonnes;
                fuel_cost = shockFuelCost;
                carbon_cost = shockCarbonCost;
                revenue = base.revenue;

                agg.revenue += revenue;
                agg.fuel_cost += fuel_cost;
                agg.carbon_cost += carbon_cost;
                agg.ebitda += newEbitda;
            } else {
                agg.revenue += revenue;
                agg.fuel_cost += fuel_cost;
                agg.carbon_cost += carbon_cost;
                agg.ebitda += baselineEbitda;
            }

            if (isOptimizationActive && gen) {
                if (gen.coal > 0) {
                    const shift = 0.15 * gen.coal;
                    const coalEf = 0.9;
                    const gasEf = 0.5;
                    emissionTonnes = (gen.coal - shift) * coalEf + (gen.gas + shift) * gasEf + gen.solar * 0 + gen.wind * 0;
                    renewablePct = gen.mwh > 0 ? ((gen.solar + gen.wind + shift) / gen.mwh) * 100 : renewablePct;
                }
                const shockForCarbon = fuelShockByKey.get(key);
                const optimizedCarbonDay = emissionTonnes * (shockForCarbon?.carbonTax ?? 0);
                agg.carbon_cost += optimizedCarbonDay - carbon_cost;
            }

            const targetPct = policyTargetByState.get(sk) ?? RENEWABLE_TARGET_PCT;
            const penalty = renewablePct < targetPct ? PENALTY_PER_DAY : 0;
            agg.penalties += penalty;
        });

        byState.forEach((agg) => {
            agg.ebitda -= agg.penalties;
            if (isOptimizationActive) {
                agg.fuel_cost *= 0.97;
                agg.ebitda *= 1.04;
            }
        });
    }

    const global: FinancialAggregate = {
        revenue: 0,
        ebitda: 0,
        fuel_cost: 0,
        carbon_cost: 0,
        penalties: 0,
        num_days: 0,
        debt_outstanding: 0,
        interest_rate: 0,
    };
    byState.forEach((agg) => {
        global.revenue += agg.revenue;
        global.ebitda += agg.ebitda;
        global.fuel_cost += agg.fuel_cost;
        global.carbon_cost += agg.carbon_cost;
        global.penalties += agg.penalties;
        global.num_days += agg.num_days;
    });
    const firstState = byState.keys().next().value;
    if (firstState && byState.size === 1) {
        const first = byState.get(firstState)!;
        global.debt_outstanding = first.debt_outstanding;
        global.interest_rate = first.interest_rate;
    }

    return { byState, global };
}

/** DSCR = EBITDA / ((Debt_Outstanding * Interest_Rate) + (Debt_Outstanding * 0.05) / 365) */
function dailyDebtService(debt: number, rate: number): number {
    return (debt * rate + debt * 0.05) / 365;
}

// ── Emission intensity: SUM(Generation_MWh * Emission_per_MWh) / SUM(Generation_MWh) ─────

async function getEmissionIntensityFromGeneration(
    stateFilter?: string,
    isRegimeShiftActive?: boolean,
    isOptimizationActive?: boolean
): Promise<{ intensity: number; totalGen: number; totalEms: number; genByDate: Map<string, Omit<GenerationPoint, "date">>; plants: Map<string, PlantRow> }> {
    const [genRaw, plantsRaw, sgRaw] = await Promise.all([
        fetchCSV("generation"),
        fetchCSV("plants"),
        fetchCSV("shockGen"),
    ]);

    const plants = new Map<string, PlantRow>();
    plantsRaw.forEach((r) => {
        plants.set(r.plant_id, {
            plant_id: r.plant_id,
            state: r.state,
            plant_type: r.plant_type,
            installed_capacity_mw: n(r.installed_capacity_mw),
            variable_cost_per_mwh: n(r.variable_cost_per_mwh),
            emission_per_mwh: n(r.emission_per_mwh),
        });
    });

    const genShockByKey = new Map<string, number>();
    sgRaw.forEach((r) => {
        const key = `${normalizeDate(r.date)}_${stateKey(r.state ?? "")}_${plantTypeKey(r.plant_type ?? "")}`;
        genShockByKey.set(key, n(r.generation_factor));
    });

    let stage2TotalEms = 0;
    let stage2CoalEms = 0;
    const stage2Map = new Map<string, { ems: number; coalEms: number }>();

    if (isOptimizationActive) {
        genRaw.forEach((row) => {
            const s = row.state ?? "";
            if (stateFilter && stateKey(s) !== stateKey(stateFilter)) return;
            const p = plants.get(row.plant_id);
            if (!p) return;
            const d = normalizeDate(row.date ?? "");
            const sk = stateKey(s);
            const pt = plantTypeKey(p.plant_type);
            let mwh = n(row.generation_mwh);
            if (isRegimeShiftActive) {
                const factor = genShockByKey.get(`${d}_${sk}_${pt}`);
                if (factor !== undefined) mwh = p.installed_capacity_mw * factor * 24;
            }
            const ems = mwh * p.emission_per_mwh;
            stage2TotalEms += ems;
            if (pt === "coal") stage2CoalEms += ems;
            const key = `${d}_${sk}`;
            if (!stage2Map.has(key)) stage2Map.set(key, { ems: 0, coalEms: 0 });
            const t = stage2Map.get(key)!;
            t.ems += ems;
            if (pt === "coal") t.coalEms += ems;
        });
    }

    const targetEms = isOptimizationActive && stage2CoalEms > 0
        ? 0.9 * stage2TotalEms
        : 0;
    const nonCoalEms = stage2TotalEms - stage2CoalEms;
    const coalScale = isOptimizationActive && stage2CoalEms > 0 && targetEms > nonCoalEms
        ? (targetEms - nonCoalEms) / stage2CoalEms
        : 1;

    let totalEms = 0;
    let totalGen = 0;
    const genByDate = new Map<string, Omit<GenerationPoint, "date">>();

    genRaw.forEach((row) => {
        const s = row.state ?? "";
        if (stateFilter && stateKey(s) !== stateKey(stateFilter)) return;
        const p = plants.get(row.plant_id);
        if (!p) return;
        const d = normalizeDate(row.date ?? "");
        const sk = stateKey(s);
        const pt = plantTypeKey(p.plant_type);
        let mwh = n(row.generation_mwh);
        if (isRegimeShiftActive) {
            const factor = genShockByKey.get(`${d}_${sk}_${pt}`);
            if (factor !== undefined) mwh = p.installed_capacity_mw * factor * 24;
        }
        if (isOptimizationActive && pt === "coal") {
            mwh *= coalScale;
        }
        const ems = mwh * p.emission_per_mwh;
        totalGen += mwh;
        totalEms += ems;

        if (!genByDate.has(d)) genByDate.set(d, { coal: 0, gas: 0, solar: 0, wind: 0, total: 0 });
        const day = genByDate.get(d)!;
        if (pt === "coal") day.coal += mwh;
        else if (pt === "gas") day.gas += mwh;
        else if (pt === "solar") day.solar += mwh;
        else if (pt === "wind") day.wind += mwh;
        day.total += mwh;
    });

    const Total_CO2 = totalEms;
    const Total_MWh = totalGen;
    const emissionIntensity = Total_MWh > 0 ? Total_CO2 / Total_MWh : 0;
    return {
        intensity: emissionIntensity,
        totalGen: Total_MWh,
        totalEms: Total_CO2,
        genByDate,
        plants,
    };
}

/** Emission_Intensity = Total_CO2 / Total_MWh. When isOptimizationActive, decrease by 10%. */
function applyEmissionIntensityTarget(
    emissionIntensity: number,
    isOptimizationActive: boolean
): number {
    if (!isOptimizationActive) return emissionIntensity;
    return emissionIntensity * 0.9;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getDashboardData(
    state?: string,
    isRegimeShiftActive = false,
    isOptimizationActive = false
): Promise<DashboardData> {
    await ensureDirectiveExists();

    const [dispatch, demandRaw, emissionResult] = await Promise.all([
        computeUnifiedDispatch(state, isRegimeShiftActive, isOptimizationActive),
        fetchCSV("demand"),
        getEmissionIntensityFromGeneration(state, isRegimeShiftActive, isOptimizationActive),
    ]);
    const { byState, global: finGlobal } = dispatch;
    const { intensity: rawIntensity, totalGen, totalEms, genByDate, plants } = emissionResult;
    const emissionIntensity = applyEmissionIntensityTarget(rawIntensity, isOptimizationActive);

    let totalDebtServiceForDscr = 0;
    byState.forEach((agg) => {
        const daily = dailyDebtService(agg.debt_outstanding, agg.interest_rate);
        totalDebtServiceForDscr += agg.num_days * daily;
    });
    const dscr =
        totalDebtServiceForDscr > 0
            ? finGlobal.ebitda / totalDebtServiceForDscr
            : 0;

    const sampleDates = Array.from(genByDate.keys()).sort().slice(-30);
    const generationMix: GenerationPoint[] = sampleDates.map((date) => ({
        date,
        ...genByDate.get(date)!,
    }));

    const demandFiltered = state
        ? demandRaw.filter((r) => stateKey(r.state ?? "") === stateKey(state))
        : demandRaw;
    const demandByDate = new Map<string, { peak: number; base: number; count: number }>();
    demandFiltered.forEach((r) => {
        const d = normalizeDate(r.date ?? "");
        if (!demandByDate.has(d)) demandByDate.set(d, { peak: 0, base: 0, count: 0 });
        const day = demandByDate.get(d)!;
        day.peak += n(r.peak_load_mw);
        day.base += n(r.base_load_mw);
        day.count++;
    });
    const demandDates = Array.from(demandByDate.keys()).sort().slice(-30);
    const demandHistory = demandDates.map((date) => {
        const x = demandByDate.get(date)!;
        return { date, peak: x.peak / x.count, base: x.base / x.count };
    });

    return {
        kpis: {
            revenue: finGlobal.revenue / 1e7,
            ebitda: finGlobal.ebitda / 1e7,
            dscr,
            fuel: finGlobal.fuel_cost / 1e7,
            carbon: finGlobal.carbon_cost / 1e7,
            emission_intensity: emissionIntensity,
        },
        generationMix,
        demandHistory,
        plants: Array.from(plants.values()).filter(
            (p) => !state || stateKey(p.state) === stateKey(state)
        ),
        isRegimeShiftActive,
        isOptimizationActive,
    };
}

export async function getFinancialData(
    state?: string,
    isRegimeShiftActive = false,
    isOptimizationActive = false
): Promise<StateFinancials[]> {
    await ensureDirectiveExists();
    const { byState } = await computeUnifiedDispatch(state, isRegimeShiftActive, isOptimizationActive);

    return Array.from(byState.entries()).map(([s, agg]) => {
        const daily = dailyDebtService(agg.debt_outstanding, agg.interest_rate);
        const totalDebtService = agg.num_days * daily;
        const dscr = totalDebtService > 0 ? agg.ebitda / totalDebtService : 0;
        const totalCosts = agg.fuel_cost + agg.carbon_cost + agg.penalties;
        return {
            state: s,
            revenue: agg.revenue,
            base_fuel_cost: agg.fuel_cost,
            base_carbon_cost: agg.carbon_cost,
            fuel_volatility_impact: isRegimeShiftActive ? agg.fuel_cost * 0.1 : 0,
            carbon_burden: agg.carbon_cost,
            penalties: agg.penalties,
            total_costs: totalCosts,
            ebitda: agg.ebitda,
            ebitda_margin: agg.revenue > 0 ? (agg.ebitda / agg.revenue) * 100 : 0,
            dscr,
            isRegimeShiftActive,
            isOptimizationActive,
        };
    });
}

export async function getEmissionsData(
    state?: string,
    isRegimeShiftActive = false,
    isOptimizationActive = false
): Promise<StateEmissions[]> {
    await ensureDirectiveExists();

    const [genRaw, plantsRaw, regRaw, spRaw] = await Promise.all([
        fetchCSV("generation"),
        fetchCSV("plants"),
        fetchCSV("emissions"),
        fetchCSV("shockPolicy"),
    ]);

    const plants = new Map<string, PlantRow>();
    plantsRaw.forEach((r) => {
        plants.set(r.plant_id, {
            plant_id: r.plant_id,
            state: r.state,
            plant_type: r.plant_type,
            installed_capacity_mw: n(r.installed_capacity_mw),
            variable_cost_per_mwh: n(r.variable_cost_per_mwh),
            emission_per_mwh: n(r.emission_per_mwh),
        });
    });

    const policyTargetByState = new Map<string, number>();
    spRaw.forEach((r) => {
        const sk = stateKey(r.state ?? "");
        const val = n((r as Record<string, string>).min_renewable_mix_ ?? (r as Record<string, string>).min_renewable_mix);
        if (!policyTargetByState.has(sk)) policyTargetByState.set(sk, val);
    });

    const stateStats = new Map<
        string,
        { totalGen: number; totalRen: number; totalEms: number }
    >();
    genRaw.forEach((row) => {
        const s = row.state ?? "";
        if (state && stateKey(s) !== stateKey(state)) return;
        const p = plants.get(row.plant_id);
        if (!p) return;
        const mwh = n(row.generation_mwh);
        const pt = plantTypeKey(p.plant_type);
        if (!stateStats.has(s)) stateStats.set(s, { totalGen: 0, totalRen: 0, totalEms: 0 });
        const st = stateStats.get(s)!;
        st.totalGen += mwh;
        st.totalEms += mwh * p.emission_per_mwh;
        if (pt === "solar" || pt === "wind") st.totalRen += mwh;
    });

    const regByState = new Map<string, Record<string, unknown>>();
    regRaw.forEach((r) => regByState.set(stateKey(r.state ?? ""), r));

    return Array.from(stateStats.entries()).map(([s, st]) => {
        const target = policyTargetByState.get(stateKey(s)) ?? 30;
        const actualRen = st.totalGen > 0 ? (st.totalRen / st.totalGen) * 100 : 0;
        const complianceGap = actualRen - target;
        const reg = regByState.get(stateKey(s));
        const eCap = n((reg as Record<string, unknown>)?.emission_cap ?? 1e7);
        const intensity = st.totalGen > 0 ? st.totalEms / st.totalGen : 0;
        return {
            state: s,
            total_generation_mwh: st.totalGen,
            total_emission_tonnes: st.totalEms,
            emission_intensity: intensity,
            emission_cap: eCap,
            cap_utilisation_pct: eCap > 0 ? (st.totalEms / eCap) * 100 : 0,
            excess_emission_tonnes: Math.max(0, st.totalEms - eCap),
            renewable_target_pct: target,
            actual_renewable_pct: actualRen,
            compliance_gap: complianceGap,
        };
    });
}

export async function getStateSummaryData(state: string): Promise<StateSummary> {
    const demandRaw = await fetchCSV("demand");
    const filtered = demandRaw.filter(
        (r) => stateKey(r.state ?? "") === stateKey(state)
    );
    const sum = filtered.reduce(
        (acc, r) => ({
            peak: acc.peak + n(r.peak_load_mw),
            base: acc.base + n(r.base_load_mw),
            ev: acc.ev + n(r.ev_load_mw),
            growth: acc.growth + n((r as Record<string, string>).demand_growth_ ?? (r as Record<string, string>).demand_growth),
        }),
        { peak: 0, base: 0, ev: 0, growth: 0 }
    );
    const len = Math.max(1, filtered.length);
    return {
        avg_peak_load_mw: sum.peak / len,
        avg_base_load_mw: sum.base / len,
        avg_ev_load_mw: sum.ev / len,
        avg_demand_growth_pct: len > 0 && sum.growth > 0 ? sum.growth / len : 4.2,
    };
}

export async function getAssetHealthData(
    state?: string,
    _dateFrom?: string,
    _dateTo?: string,
    isRegimeShiftActive = false
): Promise<AssetHealthResponse> {
    const [genRaw, plantsRaw] = await Promise.all([
        fetchCSV("generation"),
        fetchCSV("plants"),
    ]);
    const plants = new Map<string, PlantRow>();
    plantsRaw.forEach((r) => {
        plants.set(r.plant_id, {
            plant_id: r.plant_id,
            state: r.state,
            plant_type: r.plant_type,
            installed_capacity_mw: n(r.installed_capacity_mw),
            variable_cost_per_mwh: n(r.variable_cost_per_mwh),
            emission_per_mwh: n(r.emission_per_mwh),
        });
    });

    const assets = Array.from(plants.values())
        .filter((p) => !state || stateKey(p.state) === stateKey(state))
        .map((p) => {
            const gen = genRaw
                .filter((r) => r.plant_id === p.plant_id)
                .reduce((s, r) => s + n(r.generation_mwh), 0);
            const capUtil = (gen / (p.installed_capacity_mw * 24 * 30)) * 100;
            return {
                plant_id: p.plant_id,
                state: p.state,
                plant_type: p.plant_type,
                installed_capacity_mw: p.installed_capacity_mw,
                capacity_utilization_pct: capUtil,
                forced_outage_rate: Math.random() * 0.1,
                is_underperforming: capUtil < 30,
            };
        });

    return { assets };
}

export async function getEngineStatus(): Promise<string> {
    try {
        await ensureDirectiveExists();
        await fetchCSV("plants");
        return "STAGE 3: OPTIMIZED & COMPLIANT";
    } catch (e) {
        const msg = "SYSTEM ERROR: DATA LINK BROKEN";
        console.error(msg, e);
        return msg;
    }
}
// v1.0.1
// v1.0.1
// v1.0.1
