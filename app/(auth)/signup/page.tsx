import { AuthLayout } from "@/app/components/auth/AuthLayout";
import { GuestOnly } from "@/app/components/auth/GuestOnly";
import { SignupForm } from "@/app/components/auth/SignupForm";

export default function SignupPage() {
    return (
        <GuestOnly>
            <AuthLayout
                title="Create your Miyor account"
                subtitle="Create an account to host calls and unlock more Miyor features."
            >
                <SignupForm />
            </AuthLayout>
        </GuestOnly>
    );
}