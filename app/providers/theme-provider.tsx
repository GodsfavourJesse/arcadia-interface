"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";

type Theme = "light" | "dark";
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");
    useEffect(() => {
        const saved = window.localStorage.getItem("miyor-theme") ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const next = saved === "dark" ? "dark" : "light";
        setThemeState(next);
        document.documentElement.classList.toggle("dark", next === "dark");
    }, []);
    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        window.localStorage.setItem("miyor-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
    }, []);
    const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [setTheme, theme]);
    const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
    return <MotionConfig reducedMotion="user"><ThemeContext.Provider value={value}>{children}</ThemeContext.Provider></MotionConfig>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
    return context;
}
