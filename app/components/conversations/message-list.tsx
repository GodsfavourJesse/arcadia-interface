"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

type MessageListProps = {
    messages: Message[];
    currentUserId: string;

    /*
     * Called whenever the user is actually looking
     * at the newest message — on initial load, when
     * a new message arrives while they're already at
     * the bottom, or when they jump back down to it.
     *
     * The parent should use this (not "a message
     * arrived") to decide when to call the mark-as-read
     * API — marking read on arrival regardless of scroll
     * position would falsely tell the sender their
     * message was seen.
     */
    onReachedNewest?: () => void;
};

export function MessageList({
    messages,
    currentUserId,
    onReachedNewest,
}: MessageListProps) {
    const scrollContainerRef =
        useRef<HTMLDivElement | null>(null);

    const previousMessageCountRef =
        useRef(messages.length);

    const hasInitializedRef =
        useRef(false);

    const isAtNewestRef =
        useRef(true);

    const onReachedNewestRef =
        useRef(onReachedNewest);

    useEffect(() => {
        onReachedNewestRef.current =
            onReachedNewest;
    }, [onReachedNewest]);

    const [
        isAtNewest,
        setIsAtNewest,
    ] = useState(true);

    const [
        newMessagesCount,
        setNewMessagesCount,
    ] = useState(0);

    /*
     * Data contract: `messages` is newest-first
     * ([newest, ..., oldest]).
     *
     * We render the list with `flex-col-reverse`
     * (see JSX below), which flips that visually:
     * the newest message ends up at the BOTTOM
     * and the oldest at the TOP — exactly like
     * WhatsApp / iMessage.
     *
     * Because of that reversal, `scrollTop === 0`
     * is the *resting* / bottom position (newest
     * message visible), and scrolling "up" (into
     * history) increases scrollTop. That means
     * `scrollTo({ top: 0 })` is genuinely "go to
     * newest" here — no inversion needed there.
     */
    const scrollToNewest =
        useCallback(
            (
                behavior: ScrollBehavior = "smooth",
            ) => {
                const container =
                    scrollContainerRef.current;

                if (!container) {
                    return;
                }

                container.scrollTo({
                    top: 0,
                    behavior,
                });

                isAtNewestRef.current =
                    true;

                setIsAtNewest(true);
                setNewMessagesCount(0);

                onReachedNewestRef.current?.();
            },
            [],
        );

    /*
     * Initial load: start pinned at the newest
     * message (the bottom, visually).
     */
    useEffect(() => {
        const container =
            scrollContainerRef.current;

        if (
            !container ||
            messages.length === 0
        ) {
            return;
        }

        if (!hasInitializedRef.current) {
            hasInitializedRef.current =
                true;

            previousMessageCountRef.current =
                messages.length;

            requestAnimationFrame(() => {
                const currentContainer =
                    scrollContainerRef.current;

                if (!currentContainer) {
                    return;
                }

                currentContainer.scrollTop = 0;

                isAtNewestRef.current =
                    true;

                setIsAtNewest(true);

                onReachedNewestRef.current?.();
            });
        }
    }, [messages.length]);

    /*
     * Handle newly added messages.
     *
     * A brand-new message is prepended to the
     * `messages` array (index 0), which — thanks
     * to `flex-col-reverse` — lands at the visual
     * BOTTOM, below whatever the user is currently
     * looking at. That means it never shifts
     * content the user is already viewing, so no
     * scroll-position compensation is needed here
     * (unlike a normal top-insertion list).
     */
    useEffect(() => {
        const container =
            scrollContainerRef.current;

        if (!container) {
            return;
        }

        const previousCount =
            previousMessageCountRef.current;

        const currentCount =
            messages.length;

        const addedMessageCount =
            Math.max(
                currentCount -
                    previousCount,
                0,
            );

        previousMessageCountRef.current =
            currentCount;

        if (addedMessageCount <= 0) {
            return;
        }

        requestAnimationFrame(() => {
            const currentContainer =
                scrollContainerRef.current;

            if (!currentContainer) {
                return;
            }

            /*
             * User is viewing the newest messages
             * (at the bottom) — keep them pinned
             * there as new ones arrive.
             */
            if (isAtNewestRef.current) {
                currentContainer.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });

                setNewMessagesCount(0);

                onReachedNewestRef.current?.();

                return;
            }

            /*
             * User has scrolled up into history.
             * New messages arrived below their
             * current view — just surface a
             * counter/pill, don't yank their
             * scroll position.
             */
            setNewMessagesCount(
                (current) =>
                    current +
                    addedMessageCount,
            );
        });
    }, [messages.length]);

    /*
     * Track whether the user is currently at the
     * newest message (the bottom of the view).
     */
    useEffect(() => {
        const container =
            scrollContainerRef.current;

        if (!container) {
            return;
        }

        function handleScroll() {
            const currentContainer =
                scrollContainerRef.current;

            if (!currentContainer) {
                return;
            }

            const wasAtNewest =
                isAtNewestRef.current;

            const atNewest =
                currentContainer.scrollTop <=
                40;

            isAtNewestRef.current =
                atNewest;

            setIsAtNewest(atNewest);

            if (atNewest) {
                setNewMessagesCount(0);

                /*
                 * Only fire on the transition into
                 * "at newest" — not on every scroll
                 * tick while resting there.
                 */
                if (!wasAtNewest) {
                    onReachedNewestRef.current?.();
                }
            }
        }

        handleScroll();

        container.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true,
            },
        );

        return () => {
            container.removeEventListener(
                "scroll",
                handleScroll,
            );
        };
    }, []);

    if (messages.length === 0) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
                <div>
                    <p className="font-medium text-slate-700">
                        No messages yet
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                        Start the conversation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-0 flex-1">
            <div
                ref={scrollContainerRef}
                className="flex h-full flex-col-reverse gap-3 overflow-y-auto p-5"
            >
                {messages.map(
                    (message) => {
                        const isOwn =
                            message.senderId ===
                            currentUserId;

                        return (
                            <div
                                key={
                                    message.id
                                }
                                className={`flex ${
                                    isOwn
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                        isOwn
                                            ? "rounded-br-md bg-slate-900 text-white"
                                            : "rounded-bl-md bg-slate-100 text-slate-900"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap break-words text-sm">
                                        {
                                            message.body
                                        }
                                    </p>

                                    <div
                                        className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${
                                            isOwn
                                                ? "text-slate-300"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        <time>
                                            {new Date(
                                                message.createdAt,
                                            ).toLocaleTimeString(
                                                [],
                                                {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                },
                                            )}
                                        </time>

                                        {isOwn && (
                                            <span>
                                                {message.readAt
                                                    ? "Read"
                                                    : "Sent"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    },
                )}
            </div>

            {/* New-messages pill + jump button, both bottom-anchored now */}
            {!isAtNewest &&
                newMessagesCount > 0 && (
                    <button
                        type="button"
                        onClick={() =>
                            scrollToNewest(
                                "smooth",
                            )
                        }
                        className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-lg transition hover:bg-slate-50"
                    >
                        ↓{" "}
                        {newMessagesCount}{" "}
                        new{" "}
                        {newMessagesCount ===
                        1
                            ? "message"
                            : "messages"}
                    </button>
                )}

            {!isAtNewest && (
                <button
                    type="button"
                    onClick={() =>
                        scrollToNewest(
                            "smooth",
                        )
                    }
                    aria-label="Go to newest messages"
                    className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 shadow-lg transition hover:bg-slate-50"
                >
                    ↓
                </button>
            )}
        </div>
    );
}