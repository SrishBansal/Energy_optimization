# ☀️ Helios Control Room: Advanced Energy System Optimization

[![Netlify Status](https://api.netlify.com/api/v1/badges/69a397ee-e837-54f0-75af-3177/deploy-status)](https://heliooptimall.netlify.app/)
**Live Deployment:** [Helios Control Room](https://heliooptimall.netlify.app/)

## 🚀 Overview
Helios Control Room is a high-fidelity decision-support dashboard designed for the Indian energy sector. It simulates the financial and operational performance of a multi-asset power portfolio across 5 states (Gujarat, Maharashtra, Rajasthan, Tamil Nadu, and Karnataka) over a 5-year horizon.

The platform addresses the **Energy Trilemma**: balancing **Profitability (EBITDA)**, **Reliability (DSCR)**, and **Sustainability (Emission Intensity)** under volatile market conditions.

---

## 🛠️ The Three-Stage Evolution

### **Stage 1: Baseline Operations**
* **Data Ingestion:** Processes real-time CSV streams for financials, generation, and demand.
* **Normalization Layer:** Implemented a sanitization middleware to resolve a **2.4% data deviation** caused by case-sensitivity and trailing spaces in legacy CSV files.

### **Stage 2: Regime Shift (Market Shocks)**
* **Carbon Taxation:** Models a tiered carbon tax of **₹1,500/tonne**, specifically impacting high-heat-rate thermal units.
* **Fuel Volatility:** Simulates a **12.5% increase** in variable costs based on global fuel market shocks.
* **Financial Stress:** Demonstrates a critical drop in **DSCR to 1.21**, breaching standard bank covenants (1.35).

### **Stage 3: AI-Driven Optimization**
* **Merit-Order Dispatch (MOD):** Automatically reallocates generation duty to high-efficiency supercritical plants and renewable clusters.
* **Margin Recovery:** Achieves an **8.5% EBITDA recovery** compared to the shocked state.
* **Compliance:** Restores the portfolio **DSCR to 1.42**, ensuring project bankability.

---

## 📈 Technical Specifications

### **The Stack**
* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript (Type-safe financial modeling)
* **State Management:** Zustand (Real-time reactive UI)
* **Styling:** Tailwind CSS + Shadcn/UI
* **Visuals:** Recharts & Lucide Icons

### **Mathematical Framework**
The optimization engine uses a constrained linear logic:
$$\text{Minimize} \sum (\text{Variable Cost}_i + \text{Carbon Penalty}_i) \times \text{Generation}_i$$
Subject to:
* $\text{Total Generation} = \text{System Demand}$
* $\text{Thermal Load} \geq 55\% \text{ (Grid Stability Minimum)}$

---

## 📂 Project Structure
```text
helios-control-room/
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router (Dashboard Pages)
│   │   ├── components/     # Reusable UI (Charts, KPI Cards, Toggles)
│   │   ├── lib/            # Optimization Logic & CSV Parsers
│   │   └── store/          # Zustand Global State
│   └── public/data/        # Financial & Market Shock CSVs
