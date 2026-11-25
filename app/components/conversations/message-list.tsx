"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    CheckCheck,
    ChevronDown,
    Pencil,
    Reply,
    Trash2,
} from "lucide-react";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

type MessageListProps = {
    messages: Message[];
    currentUserId: string;
    onReachedNewest?: () => void;
    onReply?: (message: Message) => void;
    onEdit?: (message: Message) => void;
    onDelete?: (message: Message) => void;
};

export function MessageList({
    messages,
    currentUserId,
    onReachedNewest,
    onReply,
    onEdit,
    onDelete,
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

    const longPressTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const lastPointerTypeRef =
        useRef<string>("");

    const menuRef =
        useRef<HTMLDivElement | null>(null);

    const [
        isAtNewest,
        setIsAtNewest,
    ] = useState(true);

    const [
        newMessagesCount,
        setNewMessagesCount,
    ] = useState(0);

    const [
        activeMessageId,
        setActiveMessageId,
    ] = useState<string | null>(null);

    const [
        openMenuId,
        setOpenMenuId,
    ] = useState<string | null>(null);

    useEffect(() => {
        onReachedNewestRef.current =
            onReachedNewest;
    }, [onReachedNewest]);

    /* -------------------------------------------------------------------------- */
    /*  Message action menu                                                       */
    /* -------------------------------------------------------------------------- */

    const closeMessageMenu =
        useCallback(() => {
            setOpenMenuId(null);
            setActiveMessageId(null);
        }, []);

    const toggleMessageMenu =
        useCallback((messageId: string) => {
            setActiveMessageId(messageId);

            setOpenMenuId((current) =>
                current === messageId
                    ? null
                    : messageId,
            );
        }, []);

    const clearLongPressTimer =
        useCallback(() => {
            if (longPressTimerRef.current) {
                clearTimeout(
                    longPressTimerRef.current,
                );

                longPressTimerRef.current = null;
            }
        }, []);

    useEffect(() => {
        function handleOutsideClick(
            event: PointerEvent,
        ) {
            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target as Node,
                )
            ) {
                closeMessageMenu();
            }
        }

        function handleEscape(
            event: KeyboardEvent,
        ) {
            if (event.key === "Escape") {
                closeMessageMenu();
            }
        }

        document.addEventListener(
            "pointerdown",
            handleOutsideClick,
        );

        document.addEventListener(
            "keydown",
            handleEscape,
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handleOutsideClick,
            );

            document.removeEventListener(
                "keydown",
                handleEscape,
            );
        };
    }, [closeMessageMenu]);

    function handlePointerDown(
        event: React.PointerEvent<HTMLDivElement>,
        messageId: string,
    ) {
        lastPointerTypeRef.current =
            event.pointerType;

        if (event.pointerType !== "touch") {
            return;
        }

        clearLongPressTimer();

        longPressTimerRef.current =
            setTimeout(() => {
                setActiveMessageId(messageId);
                setOpenMenuId(messageId);
            }, 500);
    }

    function handlePointerEnd() {
        clearLongPressTimer();
    }

    function handleMessageClick(
        messageId: string,
    ) {
        /*
         * Desktop: clicking the bubble reveals
         * the dropdown arrow.
         *
         * Mobile: normal taps do nothing.
         * Long-press and double-tap handle mobile.
         */
        if (
            window.matchMedia(
                "(hover: hover) and (pointer: fine)",
            ).matches
        ) {
            setActiveMessageId((current) =>
                current === messageId
                    ? null
                    : messageId,
            );

            setOpenMenuId(null);
        }
    }

    function handleDoubleClick(
        messageId: string,
    ) {
        setActiveMessageId(messageId);
        setOpenMenuId(messageId);
    }

    function handleReply(message: Message) {
        closeMessageMenu();
        onReply?.(message);
    }

    function handleEdit(message: Message) {
        closeMessageMenu();
        onEdit?.(message);
    }

    function handleDelete(message: Message) {
        closeMessageMenu();
        onDelete?.(message);
    }

    /* -------------------------------------------------------------------------- */
    /*  Scroll behaviour                                                          */
    /* -------------------------------------------------------------------------- */

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

                isAtNewestRef.current = true;

                setIsAtNewest(true);
                setNewMessagesCount(0);

                onReachedNewestRef.current?.();
            },
            [],
        );

    /* Initial positioning */

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
            hasInitializedRef.current = true;

            previousMessageCountRef.current =
                messages.length;

            requestAnimationFrame(() => {
                const currentContainer =
                    scrollContainerRef.current;

                if (!currentContainer) {
                    return;
                }

                currentContainer.scrollTop = 0;

                isAtNewestRef.current = true;

                setIsAtNewest(true);

                onReachedNewestRef.current?.();
            });
        }
    }, [messages.length]);

    /* Newly added messages */

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
                currentCount - previousCount,
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

            if (isAtNewestRef.current) {
                currentContainer.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });

                setNewMessagesCount(0);

                onReachedNewestRef.current?.();

                return;
            }

            setNewMessagesCount(
                (current) =>
                    current + addedMessageCount,
            );
        });
    }, [messages.length]);

    /* Track newest-message visibility */

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
                currentContainer.scrollTop <= 40;

            isAtNewestRef.current = atNewest;

            setIsAtNewest(atNewest);

            if (atNewest) {
                setNewMessagesCount(0);

                if (!wasAtNewest) {
                    onReachedNewestRef.current?.();
                }
            }
        }

        handleScroll();

        container.addEventListener(
            "scroll",
            handleScroll,
            { passive: true },
        );

        return () => {
            container.removeEventListener(
                "scroll",
                handleScroll,
            );
        };
    }, []);

    /* -------------------------------------------------------------------------- */
    /*  Empty state                                                               */
    /* -------------------------------------------------------------------------- */

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

    /* -------------------------------------------------------------------------- */
    /*  Message list                                                              */
    /* -------------------------------------------------------------------------- */

    return (
        <div className="relative min-h-0 flex-1">
            <div
                ref={scrollContainerRef}
                className="flex h-full flex-col-reverse gap-3 overflow-y-auto p-5"
            >
                {messages.map((message) => {
                    const isOwn =
                        message.senderId === currentUserId;

                    const isDeleted =
                        Boolean(message.deletedAt);

                    const isActive =
                        activeMessageId === message.id;

                    const isMenuOpen =
                        openMenuId === message.id;

                    const repliedMessage =
                        messages.find(
                            (item) =>
                                item.id ===
                                message.replyToMessageId,
                        );

                    return (
                        <div
                            key={message.id}
                            className={`flex ${
                                isOwn
                                    ? "justify-end"
                                    : "justify-start"
                            }`}
                        >
                            <div
                                className={`group relative max-w-[85%] sm:max-w-[75%] ${
                                    isMenuOpen
                                        ? "z-30"
                                        : "z-0"
                                }`}
                                ref={
                                    isMenuOpen
                                        ? menuRef
                                        : undefined
                                }
                            >
                                {/* Message bubble */}

                                <div
                                    onPointerDown={(event) =>
                                        handlePointerDown(
                                            event,
                                            message.id,
                                        )
                                    }
                                    onPointerUp={handlePointerEnd}
                                    onPointerLeave={handlePointerEnd}
                                    onPointerCancel={handlePointerEnd}
                                    onClick={() =>
                                        handleMessageClick(
                                            message.id,
                                        )
                                    }
                                    onDoubleClick={() =>
                                        handleDoubleClick(
                                            message.id,
                                        )
                                    }
                                    onContextMenu={(event) => {
                                        event.preventDefault();

                                        setActiveMessageId(
                                            message.id,
                                        );

                                        setOpenMenuId(
                                            message.id,
                                        );
                                    }}
                                    className={`relative cursor-pointer select-text rounded-2xl px-4 py-2.5 ${
                                        isOwn
                                            ? "rounded-br-md bg-[#0971ED] text-white"
                                            : "rounded-bl-md bg-slate-100 text-slate-900"
                                    }`}
                                >
                                    {/* Reply preview */}

                                    {message.replyToMessageId &&
                                        repliedMessage && (
                                            <div
                                                className={`mb-2 rounded-lg border-l-2 border-[#2BC6FF] px-2.5 py-1.5 text-xs ${
                                                    isOwn
                                                        ? "bg-white/10"
                                                        : "bg-black/5"
                                                }`}
                                            >
                                                <p className="mb-0.5 font-semibold opacity-80">
                                                    Replying to
                                                </p>

                                                <p className="line-clamp-2 opacity-75">
                                                    {repliedMessage.body}
                                                </p>
                                            </div>
                                        )}

                                    {/* Message body */}

                                    <p className="whitespace-pre-wrap break-words text-sm">
                                        {isDeleted
                                            ? "Message deleted"
                                            : message.body}
                                    </p>

                                    {/* Time and read receipt */}

                                    <div
                                        className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${
                                            isOwn
                                                ? "text-white/65"
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

                                        {isOwn && !isDeleted && (
                                            <CheckCheck
                                                size={16}
                                                strokeWidth={2.4}
                                                aria-label={
                                                    message.readAt
                                                        ? "Seen"
                                                        : "Sent"
                                                }
                                                className={
                                                    message.readAt
                                                        ? "text-[#75D5FF]"
                                                        : "text-white/55"
                                                }
                                            />
                                        )}
                                    </div>

                                    {/* Desktop dropdown trigger */}

                                    {!isDeleted && isActive && (
                                        <button
                                            type="button"
                                            aria-label="Message actions"
                                            aria-expanded={isMenuOpen}
                                            onPointerDown={(event) =>
                                                event.stopPropagation()
                                            }
                                            onClick={(event) => {
                                                event.stopPropagation();

                                                toggleMessageMenu(
                                                    message.id,
                                                );
                                            }}
                                            className={`absolute -top-3 ${
                                                isOwn
                                                    ? "-left-3"
                                                    : "-right-3"
                                            } flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50`}
                                        >
                                            <ChevronDown size={15} />
                                        </button>
                                    )}
                                </div>

                                {/* Message actions dropdown */}

                                {!isDeleted && isMenuOpen && (
                                    <div
                                        className={`absolute top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ${
                                            isOwn
                                                ? "right-0"
                                                : "left-0"
                                        }`}
                                        onPointerDown={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleReply(message)
                                            }
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <Reply
                                                size={16}
                                                className="text-slate-500"
                                            />

                                            Reply
                                        </button>

                                        {isOwn && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEdit(message)
                                                    }
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <Pencil
                                                        size={16}
                                                        className="text-slate-500"
                                                    />

                                                    Edit
                                                </button>

                                                <div className="mx-3 my-1 border-t border-slate-100" />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(message)
                                                    }
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />

                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* New messages pill */}

            {!isAtNewest && newMessagesCount > 0 && (
                <button
                    type="button"
                    onClick={() =>
                        scrollToNewest("smooth")
                    }
                    className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-lg transition hover:bg-slate-50"
                >
                    ↓ {newMessagesCount} new{" "}
                    {newMessagesCount === 1
                        ? "message"
                        : "messages"}
                </button>
            )}

            {/* Jump to newest */}

            {!isAtNewest && (
                <button
                    type="button"
                    onClick={() =>
                        scrollToNewest("smooth")
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