import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./providers/auth-provider";
import { GlobalCallListener } from "./components/calls/global-call-listener";
import { ThemeProvider } from "./providers/theme-provider";
import { ToastHost } from "./providers/toast-host";

export const metadata: Metadata = {
    title: {
        default: "Miyor — Be there, Anywhere.",
        template: "%s | Miyor",
    },
    description:
        "Miyor makes face-to-face conversations simple. Create a call, share an invitation, and connect from anywhere.",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Miyor" },
    icons: { icon: [{ url: "/icons/miyor-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/miyor-512.png", sizes: "512x512", type: "image/png" }], apple: "/icons/miyor-192.png" },
};

export const viewport: Viewport = { themeColor: "#0971ED", width: "device-width", initialScale: 1 };

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
            <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider><AuthProvider>
                    {children}

                    <GlobalCallListener />
                    <ToastHost />
                </AuthProvider></ThemeProvider>
            </body>
        </html>
    );
}
