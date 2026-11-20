"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { LoginFormValues, loginSchema } from "@/app/schemas/auth.schemas";
import {
    AuthField,
    FormAlert,
    PasswordField,
    SubmitButton,
} from "@/app/components/auth/auth-fields";

export function LoginForm() {
    const router = useRouter();
    const { login, isLoading } = useAuth();

    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: "onTouched",
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
            toast.success("Welcome back", {
                description: "You’re signed in to Miyor.",
            });

            router.push("/dashboard");
        } catch (error) {
            toast.error("Unable to sign in", {
                description:
                    error instanceof Error ? error.message : "Please try again.",
            });
            setSubmitError(
                error instanceof Error ? error.message : "Unable to sign in.",
            );
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <AuthField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
            />

            <PasswordField
                id="password"
                label="Password"
                autoComplete="current-password"
                placeholder="Enter your password"
                error={errors.password?.message}
                labelAside={
                    <Link
                        href="/forgot-password"
                        className="rounded text-sm font-medium text-[#0971ED] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                    >
                        Forgot password?
                    </Link>
                }
                {...register("password")}
            />

            <AnimatePresence initial={false}>
                {submitError && <FormAlert key="error">{submitError}</FormAlert>}
            </AnimatePresence>

            <SubmitButton loading={isLoading} loadingText="Signing in...">
                Sign in
            </SubmitButton>

            <div className="flex items-center gap-4 pt-1" role="separator">
                <span className="h-px flex-1 bg-[#0C1A2E]/10" />
                <span className="text-xs text-[#0C1A2E]/50">New to Miyor?</span>
                <span className="h-px flex-1 bg-[#0C1A2E]/10" />
            </div>

            <Link
                href="/signup"
                className="flex h-12 w-full items-center justify-center rounded-xl border border-[#0C1A2E]/15 text-[15px] font-semibold text-[#0C1A2E] transition hover:border-[#0971ED] hover:bg-[#0971ED]/5 hover:text-[#0971ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]"
            >
                Create an account
            </Link>
        </form>
    );
}