"use client";

import {
    Suspense,
    useEffect,
    useState,
} from "react";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

import {
    verifyEmail,
} from "@/app/lib/auth";

import {
    AuthLayout,
} from "@/app/components/auth/AuthLayout";

import {
    ApiRequestError,
} from "@/app/lib/client";

type VerificationState =
    | "verifying"
    | "success"
    | "error";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [state, setState] = useState<VerificationState>(
        "verifying",
    );

    const [errorMessage, setErrorMessage] = useState(
        "We couldn't verify your email.",
    );

    const [miyorNumber, setMiyorNumber] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            setErrorMessage(
                "This verification link is missing its token.",
            );

            setState("error");

            return;
        }

        const verificationToken = token;

        let cancelled = false;

        async function verify() {
            try {
                const response =
                    await verifyEmail(
                        verificationToken,
                    );

                if (cancelled) {
                    return;
                }

                setMiyorNumber(
                    response.user.miyorNumber,
                );

                setState("success");
            } catch (error) {
                if (cancelled) {
                    return;
                }

                if (
                    error instanceof
                    ApiRequestError
                ) {
                    switch (
                        error.code
                    ) {
                        case "VERIFICATION_TOKEN_EXPIRED":
                            setErrorMessage(
                                "This verification link has expired. Please request a new verification email.",
                            );
                            break;

                        case "EMAIL_ALREADY_VERIFIED":
                            setErrorMessage(
                                "This email address has already been verified. You can sign in to your account.",
                            );
                            break;

                        case "INVALID_VERIFICATION_TOKEN":
                            setErrorMessage(
                                "This verification link is invalid. Please request a new verification email.",
                            );
                            break;

                        default:
                            setErrorMessage(
                                "We couldn't verify your email. Please try again.",
                            );
                    }
                } else {
                    setErrorMessage(
                        "We couldn't reach Miyor. Please check your connection and try again.",
                    );
                }

                setState("error");
            }
        }

        void verify();

        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    if (
        state === "verifying"
    ) {
        return (
            <AuthLayout
                title="Verifying your email"
                subtitle="Please wait while we activate your Miyor account."
            >
                <div className="space-y-6">
                    <div className="flex justify-center">
                        <div
                            className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-foreground"
                            aria-label="Verifying"
                        />
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Verifying your email
                            address...
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground">
                            This should only take a
                            moment.
                        </p>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    if (
        state === "error"
    ) {
        return (
            <AuthLayout
                title="Verification failed"
                subtitle="We couldn't activate your Miyor account."
            >
                <div className="space-y-6">
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
                    >
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                            <span
                                className="text-lg text-red-600"
                                aria-hidden="true"
                            >
                                !
                            </span>
                        </div>

                        <p className="text-sm leading-6 text-red-700">
                            {errorMessage}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/signup",
                                )
                            }
                            className="w-full rounded-xl bg-foreground px-4 py-3 font-medium text-background transition-opacity hover:opacity-90"
                        >
                            Create a new account
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/login",
                                )
                            }
                            className="w-full rounded-xl border px-4 py-3 font-medium transition-colors hover:bg-muted"
                        >
                            Go to sign in
                        </button>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Email verified"
            subtitle="Your Miyor account is now active."
        >
            <div className="space-y-6">
                <div className="rounded-xl border p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <span
                            className="text-xl text-green-600"
                            aria-hidden="true"
                        >
                            ✓
                        </span>
                    </div>

                    <h2 className="mt-4 text-lg font-semibold">
                        Welcome to Miyor
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Your email address has been
                        successfully verified.
                        Your account is now active.
                    </p>
                </div>

                {miyorNumber && (
                    <div className="rounded-xl border bg-muted/30 p-6 text-center">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Your Miyor Number
                        </p>

                        <p className="mt-3 text-2xl font-semibold tracking-[0.2em]">
                            {miyorNumber}
                        </p>

                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Keep this number safe.
                            It can be used as your
                            Miyor identity.
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            "/login",
                        )
                    }
                    className="w-full rounded-xl bg-foreground px-4 py-3 font-medium text-background transition-opacity hover:opacity-90"
                >
                    Continue to sign in
                </button>
            </div>
        </AuthLayout>
    );
}

function VerifyEmailFallback() {
    return (
        <AuthLayout
            title="Verifying your email"
            subtitle="Please wait while we prepare your verification."
        >
            <div className="flex justify-center">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-foreground"
                    aria-label="Loading"
                />
            </div>
        </AuthLayout>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <VerifyEmailFallback />
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}