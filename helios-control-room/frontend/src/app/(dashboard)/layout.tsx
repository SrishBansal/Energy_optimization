"use client";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useHeliosStore } from "@/store/useHeliosStore";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { theme } = useHeliosStore();

    return (
        <div className={`root-layout transition-colors duration-300 ${theme === "light" ? "light" : "dark"}`}>
            <Sidebar />
            <div className="main-container">
                <TopBar />
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
