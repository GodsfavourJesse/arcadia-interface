"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Home,
    LogOut,
    MessageCircle,
    Phone,
    Plus,
    ScanFace,
    Settings,
    Users,
    Video,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";

import { listCalls } from "@/app/services/call/calls.service";
import { useConversations } from "@/app/hooks/conversations/useConversations";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { Avatar, focusRing } from "./dashboard-ui";

/* -------------------------------------------------------------------------- */
/*  Navigation Configuration                                                  */
/* -------------------------------------------------------------------------- */

const items = [
    {
        label: "Home",
        short: "Home",
        href: "/dashboard",
        icon: Home,
    },
    {
        label: "Messages",
        short: "Chats",
        href: "/dashboard/conversations",
        icon: MessageCircle,
    },
    {
        label: "Calls",
        short: "Calls",
        href: "/dashboard/calls",
        icon: Phone,
    },
    {
        label: "People",
        short: "People",
        href: "/dashboard/discover",
        icon: Users,
    },
    {
        label: "Settings",
        short: "Me",
        href: "/dashboard/settings",
        icon: Settings,
    },
] as const;

const MISSED_SEEN_KEY = "miyor-seen-missed-calls";
const SIDEBAR_COLLAPSED_KEY = "miyor-sidebar-collapsed";

const SIDEBAR_WIDTH = {
    expanded: 272,
    collapsed: 84,
};

const spring = {
    type: "spring",
    stiffness: 420,
    damping: 34,
} as const;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function DashboardNavigation() {
    const pathname = usePathname();
    const router = useRouter();

    const { user, logout } = useAuth();
    const { conversations, reload } = useConversations();

    const [unseenMissed, setUnseenMissed] = useState(0);
    const [collapsed, setCollapsed] = useState(false);
    const [sidebarReady, setSidebarReady] = useState(false);

    /* ---------------------------------------------------------------------- */
    /*  Sidebar Persistence                                                   */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);

        if (saved !== null) {
            setCollapsed(saved === "true");
        }

        setSidebarReady(true);
    }, []);

    const toggleSidebar = () => {
        setCollapsed((previous) => {
            const next = !previous;

            localStorage.setItem(
                SIDEBAR_COLLAPSED_KEY,
                String(next),
            );

            return next;
        });
    };

    /* ---------------------------------------------------------------------- */
    /*  Sidebar Width Synchronization                                         */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        if (!sidebarReady) return;

        document.documentElement.style.setProperty(
            "--miyor-sidebar-width",
            `${collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded}px`,
        );

        return () => {
            document.documentElement.style.removeProperty(
                "--miyor-sidebar-width",
            );
        };
    }, [collapsed, sidebarReady]);

    /* ---------------------------------------------------------------------- */
    /*  Unread Messages                                                       */
    /* ---------------------------------------------------------------------- */

    const unreadMessages = conversations.reduce(
        (sum, conversation) => sum + conversation.unreadCount,
        0,
    );

    /* ---------------------------------------------------------------------- */
    /*  Missed Calls                                                          */
    /* ---------------------------------------------------------------------- */

    const refreshMissedCalls = useCallback(async () => {
        try {
            const result = await listCalls(100);

            const seen = new Set<string>(
                JSON.parse(
                    localStorage.getItem(MISSED_SEEN_KEY) || "[]",
                ),
            );

            const missed = result.data.filter(
                (entry) =>
                    entry.call.state === "missed" ||
                    entry.participant.state === "missed",
            );

            setUnseenMissed(
                missed.filter(
                    (entry) => !seen.has(entry.call.id),
                ).length,
            );

            if (pathname.startsWith("/dashboard/calls")) {
                localStorage.setItem(
                    MISSED_SEEN_KEY,
                    JSON.stringify(
                        missed.map((entry) => entry.call.id),
                    ),
                );

                setUnseenMissed(0);
            }
        } catch {
            /* Auth and network failures are handled by the page shell. */
        }
    }, [pathname]);

    useEffect(() => {
        void refreshMissedCalls();

        const timer = window.setInterval(() => {
            void refreshMissedCalls();
            void reload();
        }, 30000);

        return () => window.clearInterval(timer);
    }, [refreshMissedCalls, reload]);

    /* ---------------------------------------------------------------------- */
    /*  Application Badge                                                    */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        const count = unreadMessages + unseenMissed;

        const app = navigator as Navigator & {
            setAppBadge?: (value?: number) => Promise<void>;
            clearAppBadge?: () => Promise<void>;
        };

        if (count > 0) {
            void app.setAppBadge?.(count).catch(() => undefined);
        } else {
            void app.clearAppBadge?.().catch(() => undefined);
        }
    }, [unreadMessages, unseenMissed]);

    /* ---------------------------------------------------------------------- */
    /*  Helpers                                                               */
    /* ---------------------------------------------------------------------- */

    function badgeCount(href: string) {
        if (href === "/dashboard/conversations") {
            return unreadMessages;
        }

        if (href === "/dashboard/calls") {
            return unseenMissed;
        }

        return 0;
    }

    const isActive = (href: string) =>
        pathname === href ||
        (href !== "/dashboard" && pathname.startsWith(href));

    const hideTabBar = pathname.startsWith(
        "/dashboard/conversations/",
    );

    const studioActive = isActive(
        "/dashboard/video-processor-lab",
    );

    /* ---------------------------------------------------------------------- */
    /*  Shared Navigation Label                                               */
    /* ---------------------------------------------------------------------- */

    const NavigationLabel = ({
        children,
    }: {
        children: React.ReactNode;
    }) => (
        <AnimatePresence initial={false}>
            {!collapsed && (
                <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="relative overflow-hidden whitespace-nowrap"
                >
                    {children}
                </motion.span>
            )}
        </AnimatePresence>
    );

    /* ---------------------------------------------------------------------- */
    /*  Render                                                                */
    /* ---------------------------------------------------------------------- */

    return (
        <>
            {/* ============================================================= */}
            {/* Desktop Sidebar                                                */}
            {/* ============================================================= */}

            <motion.aside
                initial={false}
                animate={{
                    width: collapsed
                        ? SIDEBAR_WIDTH.collapsed
                        : SIDEBAR_WIDTH.expanded,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 35,
                }}
                className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-visible border-r border-white/70 bg-white/60 backdrop-blur-2xl md:flex"
            >
                {/* --------------------------------------------------------- */}
                {/* Sidebar Header                                             */}
                {/* --------------------------------------------------------- */}

                <div
                    className={`relative flex h-[76px] shrink-0 items-center ${
                        collapsed
                            ? "justify-center px-4"
                            : "justify-between px-6"
                    }`}
                >
                    <Link
                        href="/dashboard"
                        aria-label="Miyor home"
                        className={`flex items-center gap-2.5 rounded-xl ${focusRing}`}
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] font-[family-name:var(--font-display)] text-xl font-bold text-white shadow-[0_8px_20px_-6px_rgba(9,113,237,0.6)]">
                            M
                        </span>

                        <NavigationLabel>
                            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                                Miyor
                            </span>
                        </NavigationLabel>
                    </Link>

                    {/* Sidebar Toggle */}

                    <button
                        type="button"
                        onClick={toggleSidebar}
                        aria-label={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        aria-expanded={!collapsed}
                        title={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        className={`absolute flex h-8 w-8 items-center justify-center rounded-lg text-[#0C1A2E]/50 transition-all duration-200 hover:bg-white hover:text-[#0971ED] ${focusRing} ${
                            collapsed
                                ? "-right-4 top-6 z-50 bg-white shadow-md"
                                : "right-3"
                        }`}
                    >
                        <motion.span
                            key={collapsed ? "open" : "close"}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                        >
                            {collapsed ? (
                                <PanelLeftOpen size={18} />
                            ) : (
                                <PanelLeftClose size={18} />
                            )}
                        </motion.span>
                    </button>
                </div>

                {/* --------------------------------------------------------- */}
                {/* New Call Button                                            */}
                {/* --------------------------------------------------------- */}

                <div className="shrink-0 px-3">
                    <motion.div
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <Link
                            href="/dashboard/calls/new"
                            title="New call"
                            className={`flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] text-[15px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(9,113,237,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] ${focusRing}`}
                        >
                            <Video
                                size={20}
                                className="shrink-0"
                                aria-hidden="true"
                            />

                            <NavigationLabel>
                                New call
                            </NavigationLabel>
                        </Link>
                    </motion.div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* Main Navigation                                           */}
                {/* --------------------------------------------------------- */}

                <nav
                    aria-label="Main navigation"
                    className="mt-6 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3"
                >
                    {items.map((item) => {
                        const active = isActive(item.href);
                        const count = badgeCount(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.label : undefined}
                                aria-current={
                                    active ? "page" : undefined
                                }
                                className={`group relative flex h-12 items-center gap-3 overflow-hidden rounded-2xl px-3.5 text-[15px] font-medium transition-colors ${
                                    collapsed
                                        ? "justify-center"
                                        : "justify-start"
                                } ${
                                    active
                                        ? "text-[#0971ED]"
                                        : "text-[#0C1A2E]/65 hover:bg-white/70 hover:text-[#0C1A2E]"
                                } ${focusRing}`}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="sidebar-active"
                                        transition={spring}
                                        className="absolute inset-0 rounded-2xl bg-[#0971ED]/10 ring-1 ring-[#0971ED]/15"
                                    />
                                )}

                                <span className="relative shrink-0">
                                    <Icon
                                        size={22}
                                        strokeWidth={
                                            active ? 2.2 : 1.8
                                        }
                                        aria-hidden="true"
                                    />

                                    {count > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0971ED] px-1 text-[9px] font-bold text-white ring-2 ring-white">
                                            {count > 99
                                                ? "99+"
                                                : count}
                                        </span>
                                    )}
                                </span>

                                <NavigationLabel>
                                    {item.label}
                                </NavigationLabel>

                                {count > 0 && !collapsed && (
                                    <span className="relative ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0971ED] px-1.5 text-[11px] font-bold text-white">
                                        {count > 99
                                            ? "99+"
                                            : count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Studio Section */}

                    {!collapsed && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-3.5 pb-1 pt-5 text-xs font-semibold text-[#0C1A2E]/45"
                        >
                            Studio
                        </motion.p>
                    )}

                    {collapsed && <div className="h-4" />}

                    {/* Face Studio */}

                    <Link
                        href="/dashboard/video-processor-lab"
                        title="Face studio"
                        aria-current={
                            studioActive ? "page" : undefined
                        }
                        className={`relative flex h-12 items-center gap-3 overflow-hidden rounded-2xl px-3.5 text-[15px] font-medium transition-colors ${
                            collapsed
                                ? "justify-center"
                                : "justify-start"
                        } ${
                            studioActive
                                ? "text-[#0971ED]"
                                : "text-[#0C1A2E]/65 hover:bg-white/70 hover:text-[#0C1A2E]"
                        } ${focusRing}`}
                    >
                        {studioActive && (
                            <motion.span
                                layoutId="sidebar-active"
                                transition={spring}
                                className="absolute inset-0 rounded-2xl bg-[#0971ED]/10 ring-1 ring-[#0971ED]/15"
                            />
                        )}

                        <ScanFace
                            size={22}
                            strokeWidth={
                                studioActive ? 2.2 : 1.8
                            }
                            className="relative shrink-0"
                            aria-hidden="true"
                        />

                        <NavigationLabel>
                            Face studio
                        </NavigationLabel>
                    </Link>
                </nav>

                {/* --------------------------------------------------------- */}
                {/* User Profile                                               */}
                {/* --------------------------------------------------------- */}

                {user && (
                    <div className="shrink-0 p-3">
                        <div
                            className={`flex items-center gap-3 overflow-hidden rounded-2xl border border-white/70 bg-white/70 p-2 ${
                                collapsed
                                    ? "justify-center"
                                    : "justify-start p-3"
                            }`}
                        >
                            <Link
                                href="/dashboard/settings"
                                title="Your profile"
                                className={`shrink-0 rounded-full ${focusRing}`}
                            >
                                <Avatar
                                    name={user.displayName}
                                    src={user.profilePictureUrl}
                                    size={40}
                                />
                            </Link>

                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{
                                        opacity: 1,
                                        width: "auto",
                                    }}
                                    className="min-w-0 flex-1 overflow-hidden"
                                >
                                    <p className="truncate text-sm font-semibold">
                                        {user.displayName}
                                    </p>

                                    <p className="truncate text-xs text-[#0C1A2E]/55">
                                        @{user.username}
                                    </p>
                                </motion.div>
                            )}

                            {!collapsed && (
                                <button
                                    type="button"
                                    aria-label="Sign out"
                                    title="Sign out"
                                    onClick={async () => {
                                        await logout();
                                        router.replace("/login");
                                    }}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#0C1A2E]/50 transition-colors hover:bg-red-50 hover:text-red-600 ${focusRing}`}
                                >
                                    <LogOut
                                        size={18}
                                        aria-hidden="true"
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.aside>

            {/* ============================================================= */}
            {/* Mobile Tab Bar                                                 */}
            {/* ============================================================= */}

            <AnimatePresence>
                {!hideTabBar && (
                    <motion.nav
                        key="tabbar"
                        aria-label="Mobile navigation"
                        initial={{ y: 96, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 96, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 360,
                            damping: 32,
                        }}
                        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 md:hidden"
                    >
                        <div className="relative">
                            <div
                                aria-hidden="true"
                                className="absolute inset-x-6 -bottom-2 h-10 rounded-full bg-[#0971ED]/25 blur-2xl"
                            />

                            <ul className="relative grid grid-cols-5 rounded-[1.75rem] border border-white/70 bg-white/75 p-1.5 shadow-[0_12px_40px_-12px_rgba(6,43,91,0.35)] backdrop-blur-2xl">
                                {items.map((item) => {
                                    const active = isActive(item.href);
                                    const count = badgeCount(item.href);
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.href}>
                                            <motion.div whileTap={{ scale: 0.9 }}>
                                                <Link
                                                    href={item.href}
                                                    aria-current={
                                                        active
                                                            ? "page"
                                                            : undefined
                                                    }
                                                    className={`relative flex flex-col items-center justify-center gap-0.5 rounded-[1.25rem] py-2 text-[10px] font-semibold ${
                                                        active
                                                            ? "text-[#0971ED]"
                                                            : "text-[#0C1A2E]/50"
                                                    } ${focusRing}`}
                                                >
                                                    {active && (
                                                        <motion.span
                                                            layoutId="tab-active"
                                                            transition={spring}
                                                            className="absolute inset-0 rounded-[1.25rem] bg-[#0971ED]/10"
                                                        />
                                                    )}

                                                    <span className="relative">
                                                        <Icon
                                                            size={22}
                                                            strokeWidth={
                                                                active
                                                                    ? 2.3
                                                                    : 1.8
                                                            }
                                                            aria-hidden="true"
                                                        />

                                                        {count > 0 && (
                                                            <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0971ED] px-1 text-[9px] font-bold text-white ring-2 ring-white">
                                                                {count > 99
                                                                    ? "99+"
                                                                    : count}
                                                            </span>
                                                        )}
                                                    </span>

                                                    <span className="relative">
                                                        {item.short}
                                                    </span>
                                                </Link>
                                            </motion.div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>

            {/* ============================================================= */}
            {/* Mobile New Call Button                                         */}
            {/* ============================================================= */}

            <AnimatePresence>
                {pathname === "/dashboard" && (
                    <motion.div
                        key="fab"
                        initial={{
                            scale: 0,
                            opacity: 0,
                        }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                        }}
                        exit={{
                            scale: 0,
                            opacity: 0,
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 24,
                            delay: 0.3,
                        }}
                        className="fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] right-4 z-40 md:hidden"
                    >
                        <motion.div whileTap={{ scale: 0.92 }}>
                            <Link
                                href="/dashboard/calls/new"
                                aria-label="Start a new call"
                                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] text-white shadow-[0_16px_32px_-8px_rgba(9,113,237,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] ${focusRing}`}
                            >
                                <Plus
                                    size={26}
                                    strokeWidth={2.2}
                                    aria-hidden="true"
                                />
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}