"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { LoginFormValues, loginSchema } from "@/app/schemas/auth.schemas";
import { toast } from "sonner";


export function LoginForm() {
    const router = useRouter();
    const { login, isLoading } = useAuth();

    const [submitError, setSubmitError] =
        useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: LoginFormValues) {
        setSubmitError(null);

        try {
            await login({
                email: values.email,
                password: values.password,
            });
            toast.success("Welcome back", { description: "You’re signed in to Miyor." });

            router.push("/dashboard");
        } catch (error) {
            toast.error("Unable to sign in", { description: error instanceof Error ? error.message : "Please try again." });
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Unable to sign in.",
            );
        }
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >
            <div className="space-y-2">
                <label
                    htmlFor="email"
                    className="text-sm font-medium"
                >
                    Email
                </label>

                <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0971ED] focus:ring-4 focus:ring-blue-100"
                />

                {errors.email && (
                    <p className="text-sm text-red-600">
                        {errors.email.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="password"
                    className="text-sm font-medium"
                >
                    Password
                </label>

                <div className="relative">
                <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...register("password")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0971ED] focus:ring-4 focus:ring-blue-100"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-[#0971ED]"><EyeIcon visible={showPassword} /></button>
                </div>

                {errors.password && (
                    <p className="text-sm text-red-600">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {submitError && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {submitError}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#0971ED] px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-[#075fc8] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center justify-between text-sm">
                <Link
                    href="/signup"
                    className="font-semibold text-[#0971ED] hover:underline"
                >
                    Create an account
                </Link>

                <Link
                    href="/forgot-password"
                    className="font-medium text-slate-500 hover:text-[#0971ED]"
                >
                    Forgot password?
                </Link>
            </div>
        </form>
    );
}

function EyeIcon({ visible }: { visible: boolean }) {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>{visible && <path d="m4 4 16 16"/>}</svg>;
}
