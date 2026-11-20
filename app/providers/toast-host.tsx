"use client";

import { Toaster } from "sonner";
import { useTheme } from "./theme-provider";

export function ToastHost() {
    const { theme } = useTheme();
    return <Toaster theme={theme} position="top-center" richColors closeButton />;
}
