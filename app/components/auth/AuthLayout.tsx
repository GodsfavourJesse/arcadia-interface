import type { ReactNode } from "react";
import Link from "next/link";
import { AuthMotionSection } from "./auth-motion-section";

type AuthLayoutProps = { children: ReactNode; title: string; subtitle?: string };

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return <main className="auth-root min-h-screen bg-[#f5f8fc] p-4 sm:p-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_30px_100px_-50px_rgba(14,54,104,.32)] lg:grid-cols-[.92fr_1.08fr]">
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#075bc5] via-[#0971ED] to-[#2BC6FF] p-12 text-white lg:flex">
                <div className="absolute -right-28 top-20 h-96 w-96 rounded-full border border-white/15"/><div className="absolute -right-8 top-40 h-64 w-64 rounded-full border border-white/15"/>
                <Link href="/" className="relative flex items-center gap-3 text-xl font-bold"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-[#0971ED]">M</span> MIYOR</Link>
                <div className="relative max-w-md"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/70">Communication, made human</p><h2 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight">Be present.<br/>Wherever life happens.</h2><p className="mt-5 max-w-sm text-base leading-7 text-white/80">Thoughtful conversations, clearer meetings and a little more closeness across every distance.</p><div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">✦</span><span><strong className="block text-sm">One place to connect</strong><small className="text-white/70">Messages, calls and shared moments</small></span></div></div>
                <p className="relative text-xs text-white/65">Private conversations. Secure sign in.</p>
            </aside>
            <AuthMotionSection className="flex min-h-[calc(100vh-2rem)] flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
                <div className="mx-auto w-full max-w-md"><Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0971ED] to-[#2BC6FF] text-white">M</span> Miyor</Link>
                    <div className="mb-8 mt-8 lg:mt-0"><p className="text-sm font-semibold text-[#0971ED]">Welcome to Miyor</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>{subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}</div>
                    <div className="rounded-2xl border border-slate-100 bg-white lg:border-0 lg:shadow-none">{children}</div>
                    <p className="mt-8 text-center text-xs text-slate-400">By continuing, you agree to use Miyor respectfully and keep your account secure.</p>
                </div>
            </AuthMotionSection>
        </div>
    </main>;
}
