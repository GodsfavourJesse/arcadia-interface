"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
    signupSchema,
    type SignupFormValues,
} from "../../schemas/auth.schemas";
import { useAuth } from "../../hooks/auth/useAuth";

export function SignupForm() {
    const router = useRouter();
    const { signup, isLoading } = useAuth();

    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            displayName: "",
            username: "",
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: SignupFormValues) {
        setSubmitError(null);

        try {
            const result = await signup({
                displayName: values.displayName,
                username: values.username,
                email: values.email,
                password: values.password,
            });

            router.push(
                `/verification-sent?email=${encodeURIComponent(result.email)}`,
            );
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Unable to create your account.",
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
                    htmlFor="displayName"
                    className="text-sm font-medium"
                >
                    Display name
                </label>

                <input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    {...register("displayName")}
                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                />

                {errors.displayName && (
                    <p className="text-sm text-red-600">
                        {errors.displayName.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="username"
                    className="text-sm font-medium"
                >
                    Username
                </label>

                <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="your_username"
                    {...register("username")}
                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                />

                {errors.username && (
                    <p className="text-sm text-red-600">
                        {errors.username.message}
                    </p>
                )}
            </div>

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
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
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
                {isLoading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="font-medium underline"
                >
                    Sign in
                </Link>
            </p>
        </form>
    );
}