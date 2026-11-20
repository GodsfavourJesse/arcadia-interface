"use client";

import {
    forwardRef,
    useState,
    type InputHTMLAttributes,
    type ReactNode,
    type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

/*
 * Shared form primitives for Miyor's auth and settings forms.
 * Tokens: blue #0971ED, sky #2BA6FF, ink #0C1A2E, mist #F2F7FD
 */

const base =
    "w-full rounded-xl border bg-white text-[15px] text-[#0C1A2E] outline-none transition placeholder:text-[#0C1A2E]/40 disabled:cursor-not-allowed disabled:bg-[#F2F7FD] disabled:text-[#0C1A2E]/55";

const stateClass = (error?: string) =>
    error
        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        : "border-[#0C1A2E]/15 hover:border-[#0C1A2E]/30 focus:border-[#0971ED] focus:ring-4 focus:ring-[#0971ED]/15";

/* -------------------------------------------------------------------------- */
/* Field shell: label, message                                                */
/* -------------------------------------------------------------------------- */

function FieldMessage({
    id,
    error,
    hint,
}: {
    id: string;
    error?: string;
    hint?: string;
}) {
    return (
        <>
            <AnimatePresence initial={false}>
                {error && (
                    <motion.p
                        key="error"
                        id={`${id}-error`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <span className="block pt-1.5 text-sm text-red-600">
                            {error}
                        </span>
                    </motion.p>
                )}
            </AnimatePresence>

            {!error && hint && (
                <p id={`${id}-hint`} className="pt-1.5 text-xs leading-5 text-[#0C1A2E]/55">
                    {hint}
                </p>
            )}
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* Text field                                                                 */
/* -------------------------------------------------------------------------- */

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    leading?: ReactNode;
    trailing?: ReactNode;
    wideTrailing?: boolean;
    labelAside?: ReactNode;
};

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(
    function AuthField(
        {
            id,
            label,
            error,
            hint,
            leading,
            trailing,
            wideTrailing,
            labelAside,
            className = "",
            ...rest
        },
        ref
    ) {
        return (
            <div>
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="text-sm font-medium text-[#0C1A2E]">
                        {label}
                    </label>
                    {labelAside}
                </div>

                <div className="relative mt-2">
                    {leading && (
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[15px] text-[#0C1A2E]/45">
                            {leading}
                        </span>
                    )}

                    <input
                        id={id}
                        ref={ref}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={
                            error ? `${id}-error` : hint ? `${id}-hint` : undefined
                        }
                        className={`h-12 px-4 ${base} ${stateClass(error)} ${
                            leading ? "pl-9" : ""
                        } ${trailing ? (wideTrailing ? "pr-24" : "pr-12") : ""} ${className}`}
                        {...rest}
                    />

                    {trailing && (
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            {trailing}
                        </div>
                    )}
                </div>

                <FieldMessage id={id} error={error} hint={hint} />
            </div>
        );
    }
);

/* -------------------------------------------------------------------------- */
/* Password field with show/hide                                              */
/* -------------------------------------------------------------------------- */

type PasswordProps = Omit<FieldProps, "type" | "trailing">;

export const PasswordField = forwardRef<HTMLInputElement, PasswordProps>(
    function PasswordField(props, ref) {
        const [visible, setVisible] = useState(false);

        return (
            <AuthField
                ref={ref}
                {...props}
                type={visible ? "text" : "password"}
                trailing={
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        aria-label={visible ? "Hide password" : "Show password"}
                        aria-pressed={visible}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0C1A2E]/45 transition hover:bg-[#0971ED]/10 hover:text-[#0971ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                    >
                        <EyeIcon visible={visible} />
                    </button>
                }
            />
        );
    }
);

function EyeIcon({ visible }: { visible: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {visible && <path d="m4 4 16 16" />}
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Textarea                                                                   */
/* -------------------------------------------------------------------------- */

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    counter?: string;
};

export const AuthTextArea = forwardRef<HTMLTextAreaElement, AreaProps>(
    function AuthTextArea(
        { id, label, error, hint, counter, className = "", ...rest },
        ref
    ) {
        return (
            <div>
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="text-sm font-medium text-[#0C1A2E]">
                        {label}
                    </label>
                    {counter && (
                        <span className="text-xs tabular-nums text-[#0C1A2E]/45">
                            {counter}
                        </span>
                    )}
                </div>

                <textarea
                    id={id}
                    ref={ref}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                        error ? `${id}-error` : hint ? `${id}-hint` : undefined
                    }
                    className={`mt-2 resize-none px-4 py-3 leading-6 ${base} ${stateClass(error)} ${className}`}
                    {...rest}
                />

                <FieldMessage id={id} error={error} hint={hint} />
            </div>
        );
    }
);

/* -------------------------------------------------------------------------- */
/* Submit button                                                              */
/* -------------------------------------------------------------------------- */

export function SubmitButton({
    loading = false,
    loadingText,
    disabled,
    children,
}: {
    loading?: boolean;
    loadingText: string;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <motion.button
            type="submit"
            disabled={loading || disabled}
            whileHover={loading || disabled ? undefined : { y: -1 }}
            whileTap={loading || disabled ? undefined : { scale: 0.985 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(9,113,237,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]"
        >
            {loading && (
                <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                    />
                    <path
                        d="M21 12a9 9 0 00-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </svg>
            )}
            {loading ? loadingText : children}
        </motion.button>
    );
}

/* -------------------------------------------------------------------------- */
/* Alert                                                                      */
/* -------------------------------------------------------------------------- */

export function FormAlert({
    children,
    variant = "error",
}: {
    children: ReactNode;
    variant?: "error" | "success";
}) {
    const error = variant === "error";

    return (
        <motion.div
            role={error ? "alert" : "status"}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${
                error
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
        >
            <svg
                className="mt-0.5 h-5 w-5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
            >
                {error ? (
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 102 0V7zm-1 7a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                    />
                ) : (
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                        clipRule="evenodd"
                    />
                )}
            </svg>
            <span>{children}</span>
        </motion.div>
    );
}