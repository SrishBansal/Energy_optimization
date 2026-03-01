"""
data/loader.py
==============
Singleton DataStore that loads all six HELIOS CSV datasets once at startup.
Access via:  from data.loader import store
"""

from __future__ import annotations

import os
import glob
from pathlib import Path
from typing import Optional

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# ── helpers ──────────────────────────────────────────────────────────────────

def _find_csv(data_dir: Path, keyword: str) -> Optional[Path]:
    """Return the first CSV whose filename contains *keyword* (case-insensitive)."""
    pattern = str(data_dir / "*.csv")
    for p in glob.glob(pattern):
        if keyword.lower() in Path(p).name.lower():
            return Path(p)
    return None


def _load(data_dir: Path, keyword: str, parse_dates: list[str] | None = None) -> pd.DataFrame:
    path = _find_csv(data_dir, keyword)
    if path is None:
        raise FileNotFoundError(
            f"Could not find a CSV containing '{keyword}' in {data_dir}"
        )
    df = pd.read_csv(path, parse_dates=parse_dates or [])
    # Normalise column names: strip whitespace, replace spaces with underscores
    df.columns = [c.strip().replace(" ", "_") for c in df.columns]
    return df


# ── DataStore singleton ───────────────────────────────────────────────────────

class DataStore:
    """Loads and holds all HELIOS datasets in memory."""

    def __init__(self) -> None:
        self._loaded = False
        self.demand: pd.DataFrame = pd.DataFrame()
        self.generation: pd.DataFrame = pd.DataFrame()
        self.plant_master: pd.DataFrame = pd.DataFrame()
        self.emission_reg: pd.DataFrame = pd.DataFrame()
        self.financials: pd.DataFrame = pd.DataFrame()
        self.fuel_market: pd.DataFrame = pd.DataFrame()
        self._error: Optional[str] = None

    # ── public api ──────────────────────────────────────────────────────────

    def load(self) -> None:
        """Read all CSVs from DATA_DIR. Call once on app startup."""
        # The CSVs are in the root directory /Users/srishbansal/Desktop/Executioners
        # Backend is in helios-control-room/backend
        data_dir = Path(os.getenv("DATA_DIR", "../..")).resolve()
        
        required_keywords = [
            "Daily_Demand", "Daily_Generation", "Emission_Regulation", 
            "Financials", "Fuel_Market", "Plant_Master"
        ]
        
        # 1. Validation Step
        missing = []
        for kw in required_keywords:
            if _find_csv(data_dir, kw) is None:
                missing.append(kw)
        
        if missing:
            self._error = f"MISSING CRITICAL DATA: {', '.join(missing)} in {data_dir}"
            print(f"[HELIOS] {self._error}")
            raise FileNotFoundError(self._error)

        try:
            print(f"[HELIOS] Validated all 6 datasets in {data_dir}. Commencing memory cache...")
            self.demand = _load(data_dir, "Daily_Demand", parse_dates=["Date"])
            self._normalise_demand()

            self.generation = _load(data_dir, "Daily_Generation", parse_dates=["Date"])
            self._normalise_generation()

            self.plant_master = _load(data_dir, "Plant_Master")
            self._normalise_plant_master()

            self.emission_reg = _load(data_dir, "Emission_Regulation", parse_dates=["Date"])

            self.financials = _load(data_dir, "Financials", parse_dates=["Date"])
            self._normalise_financials()

            self.fuel_market = _load(data_dir, "Fuel_Market", parse_dates=["Date"])

            self._loaded = True
        except Exception as exc:
            self._error = f"Load error: {exc}"
            raise


    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def error(self) -> Optional[str]:
        return self._error

    def row_counts(self) -> dict[str, int]:
        return {
            "demand": len(self.demand),
            "generation": len(self.generation),
            "plant_master": len(self.plant_master),
            "emission_regulations": len(self.emission_reg),
            "financials": len(self.financials),
            "fuel_market": len(self.fuel_market),
        }

    # ── private normalisers ──────────────────────────────────────────────────

    def _normalise_demand(self) -> None:
        df = self.demand
        # Rename columns to clean snake_case
        rename = {
            "Peak_Load_MW": "Peak_Load_MW",
            "Base_Load_MW": "Base_Load_MW",
            "Industrial_%": "Industrial_pct",
            "Residential_%": "Residential_pct",
            "EV_Load_MW": "EV_Load_MW",
            "Temperature": "Temperature",
            "Demand_Growth_%": "Demand_Growth_pct",
        }
        df.rename(columns={k: v for k, v in rename.items() if k in df.columns}, inplace=True)
        # Add Seasonal_Index column: month_avg / year_avg per state
        df["_month"] = df["Date"].dt.month
        df["_year"] = df["Date"].dt.year
        monthly_state = (
            df.groupby(["State", "_month"])["Peak_Load_MW"].mean().rename("_month_avg")
        )
        annual_state = (
            df.groupby("State")["Peak_Load_MW"].mean().rename("_annual_avg")
        )
        df = df.join(monthly_state, on=["State", "_month"])
        df = df.join(annual_state, on="State")
        df["Seasonal_Index"] = df["_month_avg"] / df["_annual_avg"]
        df.drop(columns=["_month", "_year", "_month_avg", "_annual_avg"], inplace=True)
        self.demand = df

    def _normalise_generation(self) -> None:
        pass  # columns already clean

    def _normalise_plant_master(self) -> None:
        df = self.plant_master
        if "Forced_Outage_Rate" not in df.columns:
            df["Forced_Outage_Rate"] = 0.0
        if "Min_Load_%" in df.columns:
            df.rename(columns={"Min_Load_%": "Min_Load_pct"}, inplace=True)
        self.plant_master = df

    def _normalise_financials(self) -> None:
        df = self.financials
        rename = {
            "Revenue": "Revenue",
            "Fuel_Cost": "Fuel_Cost",
            "Carbon_Cost": "Carbon_Cost",
            "EBITDA": "EBITDA",
            "Debt_Outstanding": "Debt_Outstanding",
            "Interest_Rate": "Interest_Rate",
            "DSCR": "DSCR",
        }
        df.rename(columns={k: v for k, v in rename.items() if k in df.columns}, inplace=True)
        self.financials = df


# Module-level singleton — import this everywhere
store = DataStore()
