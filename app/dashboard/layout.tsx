"use client";

import type { ReactNode } from "react";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { DashboardNavigation } from "@/app/components/dashboard/dashboard-navigation";

const display = Bricolage_Grotesque({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

const body = Instrument_Sans({
    subsets: ["latin"],
    variable: "--font-body",
    display: "swap",
});

export default function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div
            className={`dashboard-root ${display.variable} ${body.variable} relative min-h-dvh bg-[#F2F7FD] font-[family-name:var(--font-body)] text-[#0C1A2E] antialiased`}
        >
            {/* Ambient background */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 overflow-hidden"
            >
                <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-[#0971ED]/20 blur-[120px]" />

                <div className="absolute -right-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#2BC6FF]/20 blur-[120px]" />

                <div className="absolute -bottom-40 left-1/3 h-[420px] w-[520px] rounded-full bg-[#6C8CFF]/15 blur-[130px]" />
            </div>

            {/* Navigation */}
            <DashboardNavigation />

            {/* Responsive Dashboard Workspace */}
            <main
                className="relative z-10 min-h-dvh transition-[margin-left] duration-300 ease-in-out md:ml-[var(--miyor-sidebar-width,84px)]"
            >
                {children}
            </main>
        </div>
    );
}