import type { ReactNode } from "react";
import { GuestOnlyRoute } from "../components/auth/route-guards";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return <GuestOnlyRoute>{children}</GuestOnlyRoute>;
}
