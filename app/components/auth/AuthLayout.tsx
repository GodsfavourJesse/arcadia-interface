import type { ReactNode } from "react";
import Link from "next/link";

type AuthLayoutProps = {
    children: ReactNode;
    title: string;
    subtitle?: string;
};

export function AuthLayout({
    children,
    title,
    subtitle,
}: AuthLayoutProps) {
    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
                <div className="mb-8 text-center">
                    <Link
                        href="/"
                        className="text-2xl font-bold tracking-tight"
                    >
                        Miyor
                    </Link>

                    <h1 className="mt-8 text-3xl font-semibold tracking-tight">
                        {title}
                    </h1>

                    {subtitle ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    ) : null}
                </div>

                {children}
            </div>
        </main>
    );
}