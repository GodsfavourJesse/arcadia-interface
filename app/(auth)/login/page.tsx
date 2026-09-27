import { AuthLayout } from "@/app/components/auth/AuthLayout";
import { GuestOnly } from "@/app/components/auth/GuestOnly";
import { LoginForm } from "@/app/components/auth/LoginForm";

export default function LoginPage() {
    return (
        <GuestOnly>
            <AuthLayout
                title="Welcome back"
                subtitle="Sign in to continue to Miyor."
            >
                <LoginForm />
            </AuthLayout>
        </GuestOnly>
    );
}