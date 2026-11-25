"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Copy, Hash, Mail, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/app/types/auth/auth.types";
import { Avatar, ease, glass } from "./dashboard-ui";

type UserProfileCardProps = {
    user: User;
};

export function UserProfileCard({ user }: UserProfileCardProps) {
    const reduce = useReducedMotion();

    return (
        <motion.section
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className={`overflow-hidden rounded-3xl ${glass}`}
        >
            {/* Cover */}
            <div className="relative h-28 bg-[linear-gradient(135deg,#0658C4_0%,#0971ED_50%,#2BA6FF_100%)] sm:h-32">
                <div
                    aria-hidden="true"
                    className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/30 blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="absolute -bottom-20 left-10 h-40 w-56 rounded-full bg-[#062B5B]/40 blur-3xl"
                />
            </div>

            <div className="px-5 pb-6 sm:px-7">
                <div className="-mt-10 flex items-end gap-4">
                    <Avatar
                        name={user.displayName}
                        src={user.profilePictureUrl}
                        size={80}
                        className="!ring-4"
                    />

                    <div className="min-w-0 pb-1">
                        <h2 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                            {user.displayName}
                        </h2>
                        <p className="truncate text-sm text-[#0C1A2E]/55">
                            @{user.username}
                        </p>
                    </div>
                </div>

                {user.bio && (
                    <p className="mt-5 text-[15px] leading-7 text-[#0C1A2E]/70">
                        {user.bio}
                    </p>
                )}

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoRow
                        icon={Hash}
                        label="Miyor Number"
                        value={user.miyorNumber ?? "Not assigned"}
                        copyable={Boolean(user.miyorNumber)}
                    />
                    <InfoRow icon={Mail} label="Email" value={user.email} copyable />
                </dl>
            </div>
        </motion.section>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
    copyable,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    copyable?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0971ED]/10 text-[#0971ED]">
                <Icon size={19} aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-[#0C1A2E]/50">{label}</dt>
                <dd className="truncate text-[15px] font-semibold">{value}</dd>
            </div>

            {copyable && (
                <button
                    type="button"
                    aria-label={`Copy ${label}`}
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(value);
                            toast.success(`${label} copied`);
                        } catch {
                            toast.error("Couldn’t copy to your clipboard");
                        }
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#0C1A2E]/45 transition-colors hover:bg-[#0971ED]/10 hover:text-[#0971ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                >
                    <Copy size={17} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}