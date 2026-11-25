"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ChevronRight,
    FileText,
    LogOut,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { ProfileSettingsForm } from "@/app/components/auth/ProfileSettingsForm";
import { PushNotificationSettings } from "@/app/components/pwa/push-notification-settings";
import { useTheme } from "@/app/providers/theme-provider";
import {
    Avatar,
    IconTile,
    Page,
    PageHeader,
    Skeleton,
    StaggerItem,
    StaggerList,
    Surface,
    focusRing,
} from "@/app/components/dashboard/dashboard-ui";

const policies = [
    { label: "Terms of use", text: "Expectations for using Miyor", href: "/terms", icon: FileText },
    { label: "Privacy policy", text: "How your information is used", href: "/privacy", icon: ShieldCheck },
    { label: "Services", text: "What Miyor offers", href: "/services", icon: Sparkles },
];

export default function SettingsPage() {
    const router = useRouter();

    const { user, isHydrated, isLoading, logout } = useAuth();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        if (isHydrated && !user) {
            router.replace("/login");
        }
    }, [isHydrated, user, router]);

    if (!isHydrated || isLoading) {
        return (
            <Page width="max-w-3xl">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="mt-6 h-32 w-full rounded-3xl" />
                <Skeleton className="mt-5 h-96 w-full rounded-3xl" />
            </Page>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <Page width="max-w-3xl">
            <PageHeader
                title="Settings"
                subtitle="Personalize your workspace, manage your profile and choose how Miyor reaches you."
            />

            <StaggerList className="space-y-5">
                {/* Account summary */}
                <StaggerItem>
                    <Surface className="flex items-center gap-4 p-4 sm:p-5">
                        <Avatar
                            name={user.displayName}
                            src={user.profilePictureUrl}
                            size={64}
                        />
                        <div className="min-w-0">
                            <p className="truncate font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                                {user.displayName}
                            </p>
                            <p className="truncate text-sm text-[#0C1A2E]/55">
                                @{user.username}
                            </p>
                        </div>
                    </Surface>
                </StaggerItem>

                {/* Appearance */}
                <StaggerItem>
                    <Surface className="p-5 sm:p-6">
                        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                            Appearance
                        </h2>
                        <p className="mt-1 text-sm text-[#0C1A2E]/55">
                            Choose the look that feels right on every device.
                        </p>

                        <div
                            role="radiogroup"
                            aria-label="Appearance"
                            className="relative mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#0C1A2E]/[0.06] p-1"
                        >
                            {(["light", "dark"] as const).map((option) => {
                                const active = theme === option;
                                const Icon = option === "dark" ? Moon : Sun;

                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => {
                                            setTheme(option);
                                            toast.success(
                                                `${option === "dark" ? "Dark" : "Light"} appearance enabled`,
                                            );
                                        }}
                                        className={`relative flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                                            active ? "text-[#0971ED]" : "text-[#0C1A2E]/55"
                                        } ${focusRing}`}
                                    >
                                        {active && (
                                            <motion.span
                                                layoutId="theme-pill"
                                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                                className="absolute inset-0 rounded-xl bg-white shadow-sm"
                                            />
                                        )}
                                        <Icon size={18} className="relative" aria-hidden="true" />
                                        <span className="relative">{option}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Surface>
                </StaggerItem>

                {/* Profile */}
                <StaggerItem>
                    <ProfileSettingsForm />
                </StaggerItem>

                {/* Notifications */}
                <StaggerItem>
                    <PushNotificationSettings />
                </StaggerItem>

                {/* Policies */}
                <StaggerItem>
                    <Surface className="overflow-hidden">
                        <div className="px-5 pb-2 pt-5 sm:px-6">
                            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                                Trust and policies
                            </h2>
                            <p className="mt-1 text-sm text-[#0C1A2E]/55">
                                Read how Miyor protects your account and sets expectations for using the service.
                            </p>
                        </div>

                        <ul className="p-2">
                            {policies.map((p) => (
                                <li key={p.href}>
                                    <Link
                                        href={p.href}
                                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[#0971ED]/[0.06] ${focusRing}`}
                                    >
                                        <IconTile icon={p.icon} tone="blue" size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <strong className="block text-[15px] font-semibold">
                                                {p.label}
                                            </strong>
                                            <span className="block text-xs text-[#0C1A2E]/55">
                                                {p.text}
                                            </span>
                                        </span>
                                        <ChevronRight
                                            size={18}
                                            className="shrink-0 text-[#0C1A2E]/35"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Surface>
                </StaggerItem>

                {/* Sign out */}
                <StaggerItem>
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                            await logout();
                            router.replace("/login");
                        }}
                        className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-white/70 text-[15px] font-semibold text-red-600 backdrop-blur-xl transition-colors hover:bg-red-50 ${focusRing}`}
                    >
                        <LogOut size={19} aria-hidden="true" />
                        Sign out of Miyor
                    </motion.button>
                </StaggerItem>
            </StaggerList>
        </Page>
    );
}