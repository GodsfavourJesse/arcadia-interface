"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/app/lib/client";
import { toast } from "sonner";

function toApplicationServerKey(base64: string) {
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = window.atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotificationSettings() {
    const [supported, setSupported] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
        setIsIOS(ios);
        setIsInstalled(standalone);
        const captureInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
        window.addEventListener("beforeinstallprompt", captureInstall);
        window.addEventListener("appinstalled", () => setIsInstalled(true));
        if (!("serviceWorker" in navigator)) return;
        setSupported("PushManager" in window && "Notification" in window);
        void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).then(async (registration) => {
            if (!("PushManager" in window)) return;
            const existing = await registration.pushManager.getSubscription();
            setEnabled(Boolean(existing));
        }).catch(() => setMessage("Notifications could not be prepared in this browser."));
        return () => window.removeEventListener("beforeinstallprompt", captureInstall);
    }, []);

    async function install() {
        const prompt = installPrompt as (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null;
        if (!prompt) { setMessage("Open your browser menu and choose Install app or Add to Home Screen."); return; }
        await prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === "accepted") setInstallPrompt(null);
    }

    async function toggle() {
        setBusy(true);
        setMessage("");
        try {
            const registration = await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
                await apiRequest("/push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: existing.endpoint }) });
                await existing.unsubscribe();
                setEnabled(false);
                setMessage("Call notifications are turned off on this device.");
                toast.success("Call alerts turned off");
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission !== "granted") throw new Error("Allow notifications in your browser settings to receive call alerts.");
            const { publicKey } = await apiRequest<{ status: string; publicKey: string }>("/push/vapid-public-key");
            const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toApplicationServerKey(publicKey) });
            await apiRequest("/push/subscriptions", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
            setEnabled(true);
            setMessage("This device can now alert you when someone calls.");
            toast.success("Call alerts enabled", { description: "This device can notify you when MIYOR is closed." });
        } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : "Unable to update call notifications.");
        } finally {
            setBusy(false);
        }
    }

    return <section className="rounded-2xl border border-[var(--miyor-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-semibold text-slate-900">Call notifications</p><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Allow Miyor to alert this device when someone calls, even when the app is closed. On phones, install Miyor to your Home Screen first.</p></div>
            <div className="flex flex-wrap gap-2">{!isInstalled && <button type="button" onClick={() => void (isIOS ? setMessage("In Safari, tap Share, then Add to Home Screen to install Miyor.") : install())} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Install Miyor</button>}<button type="button" disabled={!supported || busy || (isIOS && !isInstalled)} onClick={() => void toggle()} className="rounded-xl bg-[#0971ED] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075fc8] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Updating…" : enabled ? "Turn off" : "Enable call alerts"}</button></div>
        </div>
        {!supported && <p className="mt-3 text-xs text-amber-700">This browser does not support web push. Install Miyor on a supported browser to enable alerts.</p>}
        {message && <p aria-live="polite" className="mt-3 text-xs text-slate-500">{message}</p>}
    </section>;
}
