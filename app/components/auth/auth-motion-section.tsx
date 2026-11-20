"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type AuthMotionSectionProps = {
    children: ReactNode;
    className?: string;
    delay?: number;
};

export function AuthMotionSection({
    children,
    className,
    delay = 0,
}: AuthMotionSectionProps) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}