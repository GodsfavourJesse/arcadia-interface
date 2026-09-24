"use client";

import { useAuth } from "@/app/providers/auth-provider";

export function AccountStatusCard() {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                    Account
                </p>

                <div className="mt-4 h-5 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-36 animate-pulse rounded bg-slate-100" />
            </div>
        );
    }

    const isVerified = Boolean(user.emailVerifiedAt);
    const isActive = user.status === "active";

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Account
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-slate-950">
                        {isActive ? "Active" : "Inactive"}
                    </h3>
                </div>

                <span
                    className={[
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700",
                    ].join(" ")}
                >
                    {isActive ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">
                        Email verification
                    </span>

                    <span
                        className={[
                            "text-sm font-medium",
                            isVerified
                                ? "text-emerald-600"
                                : "text-amber-600",
                        ].join(" ")}
                    >
                        {isVerified ? "Verified" : "Not verified"}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">
                        Account status
                    </span>

                    <span className="text-sm font-medium capitalize text-slate-900">
                        {user.status}
                    </span>
                </div>
            </div>
        </div>
    );
}