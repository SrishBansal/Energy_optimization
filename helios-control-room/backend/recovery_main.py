import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from glob import glob

app = FastAPI(title="Project HELIOS - Recovery Mode")

# CORS Enablement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Data Loading & Caching ──────────────────────────────────────────────────
DATA_DIR = Path("../../").resolve()
CACHE = {}

def find_csv(keyword: str):
    pattern = str(DATA_DIR / "*.csv")
    for p in glob(pattern):
        if keyword.lower() in os.path.basename(p).lower():
            return p
    return None

def load_data():
    required = ["Daily_Demand", "Plant_Master", "Financials", "Daily_Generation", "Emission_Regulation", "Fuel_Market"]
    missing = [k for k in required if find_csv(k) is None]
    if missing:
        raise FileNotFoundError(f"Missing CSVs: {missing}")

    # Load all with caching
    CACHE["demand"] = pd.read_csv(find_csv("Daily_Demand"), parse_dates=["Date"])
    CACHE["plants"] = pd.read_csv(find_csv("Plant_Master"))
    CACHE["financials"] = pd.read_csv(find_csv("Financials"), parse_dates=["Date"])
    CACHE["generation"] = pd.read_csv(find_csv("Daily_Generation"), parse_dates=["Date"])
    CACHE["regulation"] = pd.read_csv(find_csv("Emission_Regulation"), parse_dates=["Date"])
    CACHE["fuel"] = pd.read_csv(find_csv("Fuel_Market"), parse_dates=["Date"])
    
    # Normalize column names for easy access
    for key in CACHE:
        CACHE[key].columns = [c.strip().replace(" ", "_") for c in CACHE[key].columns]

@app.on_event("startup")
async def startup_event():
    try:
        load_data()
        print("[HELIOS RECOVERY] All data loaded and cached successfully.")
    except Exception as e:
        print(f"[HELIOS RECOVERY] Critical startup error: {e}")

# ── Core API ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard-data")
def get_dashboard_data(state: str = None):
    try:
        demand_df = CACHE["demand"].copy()
        plants_df = CACHE["plants"].copy()
        fin_df = CACHE["financials"].copy()
        reg_df = CACHE["regulation"].copy()

        if state:
            demand_df = demand_df[demand_df["State"] == state]
            fin_df = fin_df[fin_df["State"] == state]
            reg_df = reg_df[reg_df["State"] == state]

        # 1. Merit Order Dispatch
        # Meeting Peak_Load_MW from latest record or average
        avg_peak = demand_df["Peak_Load_MW"].mean()
        # Sort plants by cost
        plants_sorted = plants_df.sort_values("Variable_Cost_per_MWh")
        # Simplified dispatch for visual dashboard
        dispatch = []
        running_load = 0
        for _, p in plants_sorted.iterrows():
            cap = p["Installed_Capacity_MW"]
            dispatched = min(cap, max(0, avg_peak - running_load))
            dispatch.append({
                "plant_id": p["Plant_ID"],
                "type": p["Plant_Type"],
                "dispatched": round(dispatched, 2),
                "cost": p["Variable_Cost_per_MWh"]
            })
            running_load += dispatched

        # 2. Financial Metrics
        ebitda = fin_df["EBITDA"].sum()
        debt = fin_df["Debt_Outstanding"].mean()
        rate = fin_df["Interest_Rate"].mean() / 100
        interest = debt * rate
        # Simplified Principal repayment (5% of debt)
        principal = debt * 0.05
        dscr = round(ebitda / (interest + principal), 2) if (interest + principal) > 0 else 0

        # 3. Compliance Tracking
        # Join plants with latest state regulation
        latest_reg = reg_df.sort_values("Date").iloc[-1] if not reg_df.empty else None
        state_cap = latest_reg["Emission_Cap"] if latest_reg is not None else 0.8 # Fallback

        plants_audit = []
        for _, p in plants_df.iterrows():
            emission = p["Emission_per_MWh"]
            is_non_compliant = emission > state_cap
            plants_audit.append({
                "id": p["Plant_ID"],
                "type": p["Plant_Type"],
                "emission": round(emission, 4),
                "cap": state_cap,
                "status": "NON-COMPLIANT" if is_non_compliant else "COMPLIANT"
            })

        return {
            "summary": {
                "ebitda": round(ebitda, 2),
                "dscr": dscr,
                "avg_demand": round(avg_peak, 2)
            },
            "dispatch": dispatch,
            "audit": plants_audit,
            "state_selection": state or "System Aggregated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
