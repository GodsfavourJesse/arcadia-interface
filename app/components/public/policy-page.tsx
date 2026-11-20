"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Children,
    cloneElement,
    isValidElement,
    useEffect,
    useState,
    type ReactElement,
    type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PublicShell } from "./public-shell";
import {
    Blob,
    Item,
    PageHero,
    Reveal,
    Stagger,
    ease,
    focusRing,
    glass,
} from "./public-ui";

type SectionProps = { title: string; index?: number; children: ReactNode };

const slug = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const relatedPages = [
    {
        href: "/terms",
        title: "Terms of use",
        text: "The expectations for using Miyor.",
    },
    {
        href: "/privacy",
        title: "Privacy policy",
        text: "How Miyor uses your information.",
    },
    {
        href: "/services",
        title: "Services",
        text: "What Miyor offers.",
    },
];

export function PolicyPage({
    eyebrow,
    title,
    intro,
    children,
    updated = "November 19, 2026",
}: {
    eyebrow: string;
    title: string;
    intro: string;
    children: ReactNode;
    updated?: string;
}) {
    const pathname = usePathname();
    const reduce = useReducedMotion();

    const nodes = Children.toArray(children);
    const isSection = (n: ReactNode): n is ReactElement<SectionProps> =>
        isValidElement<SectionProps>(n) && typeof n.props.title === "string";

    let count = 0;
    const content = nodes.map((n) =>
        isSection(n) ? cloneElement(n, { index: count++ }) : n
    );
    const headings = nodes.filter(isSection).map((n) => n.props.title);
    const headingKey = headings.join("|");

    const [active, setActive] = useState(headings[0] ? slug(headings[0]) : "");

    /* Track which section is currently in view */
    useEffect(() => {
        const els = headings
            .map((h) => document.getElementById(slug(h)))
            .filter((el): el is HTMLElement => el !== null);
        if (!els.length) return;

        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top
                    );
                if (visible[0]) setActive(visible[0].target.id);
            },
            { rootMargin: "-25% 0px -65% 0px" }
        );

        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [headingKey]);

    /* Keep the active chip visible in the mobile bar */
    useEffect(() => {
        if (!active || window.innerWidth >= 1024) return;
        document
            .querySelector<HTMLElement>(`[data-chip="${active}"]`)
            ?.scrollIntoView({
                inline: "center",
                block: "nearest",
                behavior: reduce ? "auto" : "smooth",
            });
    }, [active, reduce]);

    const go = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "start",
        });
        history.replaceState(null, "", `#${id}`);
        setActive(id);
    };

    const related = relatedPages.filter((p) => p.href !== pathname);

    return (
        <PublicShell>
            <PageHero eyebrow={eyebrow} title={title} intro={intro}>
                <div className="mt-8 flex flex-wrap items-center gap-2.5 text-sm">
                    <span className={`rounded-full px-3.5 py-1.5 text-[#0C1A2E]/75 ${glass}`}>
                        Updated {updated}
                    </span>
                    <span className="rounded-full bg-[#0971ED]/10 px-3.5 py-1.5 font-semibold text-[#0971ED]">
                        Draft
                    </span>
                </div>
            </PageHero>

            <div className="relative overflow-x-clip bg-gradient-to-b from-[#F2F7FD] to-white pb-20 sm:pb-28">
                <Blob
                    className="-right-40 top-40 h-[420px] w-[420px] bg-[#0971ED]/10 blur-[120px]"
                    duration={26}
                />

                <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
                    {/* Mobile: sticky chip bar */}
                    {headings.length > 1 && (
                        <nav
                            aria-label="On this page"
                            className="sticky top-[68px] z-30 -mx-5 mb-6 border-b border-[#0C1A2E]/[0.06] bg-[#F2F7FD]/80 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:hidden"
                        >
                            <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {headings.map((h) => {
                                    const id = slug(h);
                                    const on = active === id;

                                    return (
                                        <li key={id} className="shrink-0">
                                            <a
                                                href={`#${id}`}
                                                data-chip={id}
                                                onClick={go(id)}
                                                aria-current={on ? "location" : undefined}
                                                className={`block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                                    on
                                                        ? "bg-[#0971ED] text-white"
                                                        : "border border-[#0C1A2E]/10 bg-white/70 text-[#0C1A2E]/70"
                                                } ${focusRing}`}
                                            >
                                                {h}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    )}

                    {/* Desktop: sticky table of contents */}
                    <aside className="hidden lg:block">
                        <nav
                            aria-label="On this page"
                            className="sticky top-28 pt-12"
                        >
                            <p className="text-sm font-semibold text-[#0C1A2E]">
                                On this page
                            </p>

                            <ul className="mt-4 border-l border-[#0C1A2E]/10">
                                {headings.map((h) => {
                                    const id = slug(h);
                                    const on = active === id;

                                    return (
                                        <li key={id} className="relative">
                                            {on && (
                                                <motion.span
                                                    layoutId="toc-active"
                                                    className="absolute -left-px top-0 h-full w-0.5 rounded-full bg-[#0971ED]"
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 380,
                                                        damping: 32,
                                                    }}
                                                />
                                            )}
                                            <a
                                                href={`#${id}`}
                                                onClick={go(id)}
                                                aria-current={on ? "location" : undefined}
                                                className={`block rounded-r-lg py-2 pl-4 pr-2 text-sm leading-5 transition-colors ${
                                                    on
                                                        ? "font-semibold text-[#0971ED]"
                                                        : "text-[#0C1A2E]/60 hover:text-[#0C1A2E]"
                                                } ${focusRing}`}
                                            >
                                                {h}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="min-w-0 lg:pt-12">
                        <article className="rounded-[1.75rem] border border-white bg-white/80 p-6 shadow-[0_30px_70px_-40px_rgba(9,113,237,0.4)] backdrop-blur-xl sm:rounded-[2rem] sm:p-10 lg:p-12">
                            {content}
                        </article>

                        <p className="mt-5 px-2 text-xs leading-5 text-[#0C1A2E]/50">
                            Product information draft. Last updated {updated}.
                        </p>

                        {related.length > 0 && (
                            <div className="mt-14">
                                <Reveal>
                                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                                        Keep reading
                                    </h2>
                                </Reveal>

                                <Stagger className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {related.map((p) => (
                                        <Item key={p.href}>
                                            <motion.div
                                                initial="rest"
                                                animate="rest"
                                                whileHover="hover"
                                                whileFocus="hover"
                                            >
                                                <Link
                                                    href={p.href}
                                                    className={`flex items-center justify-between gap-4 rounded-2xl p-5 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(9,113,237,0.4)] ${glass} ${focusRing}`}
                                                >
                                                    <span>
                                                        <span className="block font-[family-name:var(--font-display)] text-lg font-semibold">
                                                            {p.title}
                                                        </span>
                                                        <span className="mt-0.5 block text-sm text-[#0C1A2E]/60">
                                                            {p.text}
                                                        </span>
                                                    </span>

                                                    <motion.span
                                                        aria-hidden="true"
                                                        variants={{
                                                            rest: {
                                                                x: 0,
                                                                backgroundColor: "rgba(9,113,237,0.1)",
                                                                color: "#0971ED",
                                                            },
                                                            hover: {
                                                                x: 4,
                                                                backgroundColor: "rgba(9,113,237,1)",
                                                                color: "#ffffff",
                                                            },
                                                        }}
                                                        transition={{ duration: 0.3, ease }}
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            viewBox="0 0 20 20"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <path d="M4 10h12M11 5l5 5-5 5" />
                                                        </svg>
                                                    </motion.span>
                                                </Link>
                                            </motion.div>
                                        </Item>
                                    ))}
                                </Stagger>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PublicShell>
    );
}

export function PolicySection({ title, index, children }: SectionProps) {
    return (
        <Reveal className="border-t border-[#0C1A2E]/10 py-8 first:border-t-0 first:pt-0 last:pb-0 sm:py-10 sm:first:pt-0">
            <section
                id={slug(title)}
                className="scroll-mt-40 lg:scroll-mt-28"
            >
                <div className="flex items-center gap-3">
                    {typeof index === "number" && (
                        <span
                            aria-hidden="true"
                            className="flex h-8 min-w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] px-2 text-xs font-semibold text-white shadow-[0_6px_16px_-4px_rgba(9,113,237,0.5)]"
                        >
                            {String(index + 1).padStart(2, "0")}
                        </span>
                    )}

                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[#0C1A2E] sm:text-[1.75rem]">
                        {title}
                    </h2>
                </div>

                <div className="mt-4 max-w-[68ch] space-y-4 text-base leading-8 text-[#0C1A2E]/70 sm:text-[17px]">
                    {children}
                </div>
            </section>
        </Reveal>
    );
}