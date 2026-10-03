"use client";

import {
    useEffect,
    useRef,
} from "react";

import {
    AVATAR_TYPE,
    type AvatarDefinition,
    type AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

import {
    AvatarEngine,
} from "@/app/lib/avatar/avatar-engine";

import {
    VRMRenderer,
} from "@/app/lib/avatar/vrm-renderer";

import {
    TwoDRenderer,
} from "@/app/lib/avatar/two-d-renderer";

import {
    StaticRenderer,
} from "@/app/lib/avatar/static-renderer";

type AvatarCanvasProps = {
    avatar: AvatarDefinition;

    /*
     * This is the live tracking state.
     *
     * IMPORTANT:
     * We intentionally do not copy this into React state.
     * The render loop reads trackingRef.current directly.
     */
    trackingRef: React.MutableRefObject<AvatarTrackingState>;

    onCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
};

export function AvatarCanvas({
    avatar,
    trackingRef,
    onCanvasReady,
}: AvatarCanvasProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(null);

    const canvasRef =
        useRef<HTMLCanvasElement | null>(null);

    const engineRef =
        useRef<AvatarEngine | null>(null);

    const avatarRef =
        useRef<AvatarDefinition>(
            avatar,
        );

    const onCanvasReadyRef =
        useRef(onCanvasReady);

    const initialAvatarLoadedRef =
        useRef(false);

    /*
     * Keep the latest avatar available to
     * asynchronous renderer operations.
     */
    useEffect(() => {
        avatarRef.current =
            avatar;
    }, [avatar]);

    /*
     * Keep the latest callback available without
     * recreating the renderer lifecycle.
     */
    useEffect(() => {
        onCanvasReadyRef.current =
            onCanvasReady;
    }, [onCanvasReady]);

    /*
     * Create the canvas, AvatarEngine, renderer factory,
     * resize observer, and continuous render loop.
     *
     * This lifecycle intentionally does NOT depend on
     * trackingRef or tracking state.
     */
    useEffect(() => {
        const container =
            containerRef.current;

        if (!container) {
            return;
        }

        let disposed = false;

        /*
         * --------------------------------------------------
         * CANVAS
         * --------------------------------------------------
         */

        const canvas =
            document.createElement(
                "canvas",
            );

        canvas.className =
            "block h-full w-full";

        canvas.setAttribute(
            "aria-hidden",
            "true",
        );

        canvasRef.current =
            canvas;

        container.appendChild(
            canvas,
        );

        /*
         * --------------------------------------------------
         * AVATAR ENGINE
         * --------------------------------------------------
         */

        const engine =
            new AvatarEngine(
                (
                    selectedAvatar,
                    rendererCanvas,
                ) => {
                    switch (
                        selectedAvatar.type
                    ) {
                        case AVATAR_TYPE.VRM:
                            return new VRMRenderer(
                                rendererCanvas,
                            );

                        case AVATAR_TYPE.TWO_D:
                            return new TwoDRenderer(
                                rendererCanvas,
                            );

                        case AVATAR_TYPE.IMAGE:
                            return new StaticRenderer(
                                rendererCanvas,
                            );

                        case AVATAR_TYPE.GLTF:
                            throw new Error(
                                "GLTF avatars are not supported by the current renderer.",
                            );

                        default: {
                            const unsupportedType =
                                selectedAvatar.type;

                            throw new Error(
                                `Unsupported avatar type: ${unsupportedType}`,
                            );
                        }
                    }
                },
            );

        engineRef.current =
            engine;

        /*
         * --------------------------------------------------
         * RESIZE
         * --------------------------------------------------
         */

        const resize =
            () => {
                if (disposed) {
                    return;
                }

                const width =
                    Math.max(
                        container.clientWidth,
                        1,
                    );

                const height =
                    Math.max(
                        container.clientHeight,
                        1,
                    );

                engine.resize(
                    width,
                    height,
                );
            };

        const resizeObserver =
            new ResizeObserver(
                resize,
            );

        resizeObserver.observe(
            container,
        );

        resize();

        /*
         * --------------------------------------------------
         * CONTINUOUS RENDER LOOP
         * --------------------------------------------------
         *
         * IMPORTANT:
         *
         * MediaPipe does NOT control this loop.
         *
         * The camera/tracker can update trackingRef at
         * ~30 FPS while this loop continues rendering at
         * the browser's display refresh rate.
         *
         * Example:
         *
         * Camera          60 FPS
         * MediaPipe       ~30 FPS
         * Avatar render    60 FPS
         *
         * The latest tracking values are always consumed.
         */

        let animationFrame =
            0;

        const render =
            () => {
                if (disposed) {
                    return;
                }

                const currentTracking =
                    trackingRef.current;

                engine.update(
                    currentTracking,
                );

                animationFrame =
                    window.requestAnimationFrame(
                        render,
                    );
            };

        animationFrame =
            window.requestAnimationFrame(
                render,
            );

        /*
         * --------------------------------------------------
         * INITIAL AVATAR
         * --------------------------------------------------
         */

        const initialAvatar =
            avatarRef.current;

        void engine
            .setAvatar(
                initialAvatar,
                canvas,
            )
            .then(() => {
                if (disposed) {
                    return;
                }

                initialAvatarLoadedRef.current =
                    true;

                resize();

                onCanvasReadyRef.current?.(
                    canvas,
                );

                /*
                 * The user may have selected a different
                 * avatar while the first avatar was loading.
                 *
                 * Make sure the newest selection wins.
                 */
                const latestAvatar =
                    avatarRef.current;

                if (
                    latestAvatar.id !==
                    initialAvatar.id
                ) {
                    void engine
                        .setAvatar(
                            latestAvatar,
                            canvas,
                        )
                        .then(() => {
                            if (
                                disposed
                            ) {
                                return;
                            }

                            resize();

                            onCanvasReadyRef.current?.(
                                canvas,
                            );
                        })
                        .catch(
                            (
                                error,
                            ) => {
                                if (
                                    disposed
                                ) {
                                    return;
                                }

                                console.error(
                                    "[Avatar] Failed to load latest avatar:",
                                    error,
                                );
                            },
                        );
                }
            })
            .catch(
                (error) => {
                    if (disposed) {
                        return;
                    }

                    console.error(
                        "[Avatar] Failed to load avatar:",
                        error,
                    );
                },
            );

        /*
         * --------------------------------------------------
         * CLEANUP
         * --------------------------------------------------
         */

        return () => {
            disposed = true;

            initialAvatarLoadedRef.current =
                false;

            window.cancelAnimationFrame(
                animationFrame,
            );

            resizeObserver.disconnect();

            engine.dispose();

            if (
                canvas.parentNode ===
                container
            ) {
                container.removeChild(
                    canvas,
                );
            }

            canvasRef.current =
                null;

            if (
                engineRef.current ===
                engine
            ) {
                engineRef.current =
                    null;
            }
        };
    }, [trackingRef]);

    /*
     * ------------------------------------------------------
     * AVATAR SWITCHING
     * ------------------------------------------------------
     *
     * Changing avatars does not recreate:
     *
     * - the canvas
     * - the animation loop
     * - MediaPipe
     * - the camera
     * - WebRTC
     *
     * Only the renderer/model changes.
     */
    useEffect(() => {
        if (
            !initialAvatarLoadedRef.current
        ) {
            return;
        }

        const engine =
            engineRef.current;

        const canvas =
            canvasRef.current;

        if (
            !engine ||
            !canvas
        ) {
            return;
        }

        let cancelled =
            false;

        void engine
            .setAvatar(
                avatar,
                canvas,
            )
            .then(() => {
                if (cancelled) {
                    return;
                }

                const container =
                    containerRef.current;

                if (!container) {
                    return;
                }

                engine.resize(
                    Math.max(
                        container.clientWidth,
                        1,
                    ),
                    Math.max(
                        container.clientHeight,
                        1,
                    ),
                );

                onCanvasReadyRef.current?.(
                    canvas,
                );
            })
            .catch(
                (error) => {
                    if (cancelled) {
                        return;
                    }

                    console.error(
                        "[Avatar] Failed to switch avatar:",
                        error,
                    );
                },
            );

        return () => {
            cancelled = true;
        };
    }, [avatar]);

    return (
        <div
            ref={containerRef}
            className="relative h-full w-full overflow-hidden rounded-[inherit]"
        />
    );
}