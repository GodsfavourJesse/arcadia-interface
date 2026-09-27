import { AuthLayout } from "@/app/components/auth/AuthLayout";
import Link from "next/link";

type VerificationSentPageProps = {
    searchParams: Promise<{
        email?: string;
    }>;
};

export default async function VerificationSentPage({
    searchParams,
}: VerificationSentPageProps) {
    const params = await searchParams;
    const email = params.email;

    return (
        <AuthLayout
            title="Check your email"
            subtitle="We've sent you a verification link."
        >
            <div className="space-y-6">
                <div className="rounded-lg border p-5 text-center">
                    <p className="text-sm text-muted-foreground">
                        We sent a verification link to
                    </p>

                    {email ? (
                        <p className="mt-2 break-all font-medium">
                            {email}
                        </p>
                    ) : (
                        <p className="mt-2 font-medium">
                            your email address
                        </p>
                    )}

                    <p className="mt-4 text-sm text-muted-foreground">
                        The link expires in 15 minutes. Check your
                        spam or junk folder if you don't see the
                        email.
                    </p>
                </div>

                <div className="text-center text-sm">
                    <Link
                        href="/login"
                        className="font-medium underline"
                    >
                        Return to sign in
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}