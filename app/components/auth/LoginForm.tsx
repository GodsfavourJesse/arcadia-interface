"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { LoginFormValues, loginSchema } from "@/app/schemas/auth.schemas";


export function LoginForm() {
    const router = useRouter();
    const { login, isLoading } = useAuth();

    const [submitError, setSubmitError] =
        useState<string | null>(null);

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

            router.push("/dashboard");
        } catch (error) {
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
                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
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

                <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...register("password")}
                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                />

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
                className="w-full rounded-lg px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center justify-between text-sm">
                <Link
                    href="/signup"
                    className="font-medium underline"
                >
                    Create an account
                </Link>

                <Link
                    href="/forgot-password"
                    className="font-medium underline"
                >
                    Forgot password?
                </Link>
            </div>
        </form>
    );
}