import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./providers/auth-provider";

export const metadata: Metadata = {
    title: {
        default: "Miyor — Be there, Anywhere.",
        template: "%s | Miyor",
    },
    description:
        "Miyor makes face-to-face conversations simple. Create a call, share an invitation, and connect from anywhere.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
