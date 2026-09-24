import { Suspense } from "react";
import VerifyEmailContent from "./verfiyEmailContent";

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}