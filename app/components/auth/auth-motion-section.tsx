"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type AuthMotionSectionProps = {
    children: ReactNode;
    className?: string;
};

export function AuthMotionSection({ children, className }: AuthMotionSectionProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.section>
    );
}
