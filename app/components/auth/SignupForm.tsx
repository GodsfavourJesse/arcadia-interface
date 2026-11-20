"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import {
    signupSchema,
    type SignupFormValues,
} from "../../schemas/auth.schemas";
import { useAuth } from "../../hooks/auth/useAuth";
import {
    AuthField,
    FormAlert,
    PasswordField,
    SubmitButton,
} from "@/app/components/auth/auth-fields";

export function SignupForm() {
    const router = useRouter();
    const { signup, isLoading } = useAuth();

    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        mode: "onTouched",
        defaultValues: {
            displayName: "",
            username: "",
            email: "",
            password: "",
        },
    });

    const password = watch("password");

    async function onSubmit(values: SignupFormValues) {
        setSubmitError(null);

        try {
            const result = await signup({
                displayName: values.displayName,
                username: values.username,
                email: values.email,
                password: values.password,
            });
            toast.success("Check your inbox", {
                description: "We sent a link to verify your email address.",
            });

            router.push(
                `/verification-sent?email=${encodeURIComponent(result.email)}`,
            );
        } catch (error) {
            toast.error("Account creation failed", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Please review your details and try again.",
            });
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Unable to create your account.",
            );
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
                <AuthField
                    id="displayName"
                    label="Display name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    error={errors.displayName?.message}
                    {...register("displayName")}
                />

                <AuthField
                    id="username"
                    label="Username"
                    type="text"
                    autoComplete="username"
                    placeholder="your_username"
                    leading="@"
                    error={errors.username?.message}
                    {...register("username")}
                />
            </div>

            <AuthField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
            />

            <div>
                <PasswordField
                    id="password"
                    label="Password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    error={errors.password?.message}
                    {...register("password")}
                />

                <StrengthMeter password={password ?? ""} />
            </div>

            <AnimatePresence initial={false}>
                {submitError && <FormAlert key="error">{submitError}</FormAlert>}
            </AnimatePresence>

            <SubmitButton loading={isLoading} loadingText="Creating account...">
                Create account
            </SubmitButton>

            <p className="pt-1 text-center text-sm text-[#0C1A2E]/60">
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="rounded font-semibold text-[#0971ED] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                >
                    Sign in
                </Link>
            </p>
        </form>
    );
}

/* Visual guide only; your schema still decides what is valid. */
function scorePassword(pw: string) {
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score += 1;
    return score;
}

const levels = [
    { label: "Too short", bar: "bg-red-400", text: "text-red-600" },
    { label: "Weak", bar: "bg-red-400", text: "text-red-600" },
    { label: "Fair", bar: "bg-amber-400", text: "text-amber-600" },
    { label: "Good", bar: "bg-[#2BA6FF]", text: "text-[#0971ED]" },
    { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

function StrengthMeter({ password }: { password: string }) {
    const score = scorePassword(password);
    const level = levels[score];

    return (
        <AnimatePresence initial={false}>
            {password.length > 0 && (
                <motion.div
                    key="meter"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                    aria-live="polite"
                >
                    <div className="flex items-center gap-3 pt-2.5">
                        <div className="flex flex-1 gap-1.5" aria-hidden="true">
                            {[1, 2, 3, 4].map((i) => (
                                <span
                                    key={i}
                                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0C1A2E]/10"
                                >
                                    <motion.span
                                        className={`block h-full rounded-full ${level.bar}`}
                                        initial={false}
                                        animate={{ width: score >= i ? "100%" : "0%" }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </span>
                            ))}
                        </div>

                        <span className={`w-14 text-right text-xs font-semibold ${level.text}`}>
                            {level.label}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}