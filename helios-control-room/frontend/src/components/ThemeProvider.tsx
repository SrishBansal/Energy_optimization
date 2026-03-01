"use client";

import { useHeliosStore } from "@/store/useHeliosStore";
import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useHeliosStore();

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
    }, [theme]);

    return (
        <div className={theme === "light" ? "bg-slate-50 text-slate-900" : "bg-[#09090b] text-slate-200"}>
            {children}
        </div>
    );
}
