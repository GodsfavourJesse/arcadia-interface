"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNavigation } from "@/app/components/dashboard/dashboard-navigation";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isOpenConversation = pathname.startsWith("/dashboard/conversations/");
    return <div className="dashboard-root min-h-screen bg-[#f5f8fc] text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-8 px-4 sm:px-6 lg:px-10">
                <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0971ED] to-[#2BC6FF] text-white shadow-md shadow-blue-500/15">M</span>MIYOR</Link>
                <DashboardNavigation />
                <span className="hidden shrink-0 items-center gap-2 text-xs font-medium text-slate-500 md:flex"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Secure workspace</span>
            </div>
        </header>
        <div className={`min-h-[calc(100vh-68px)] ${isOpenConversation ? "pb-0" : "pb-20 md:pb-0"}`}>{children}</div>
    </div>;
}
