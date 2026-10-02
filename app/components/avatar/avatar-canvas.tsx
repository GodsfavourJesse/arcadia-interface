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
    tracking: AvatarTrackingState;
    onCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
};

export function AvatarCanvas({
    avatar,
    tracking,
    onCanvasReady,
}: AvatarCanvasProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(null);

    const canvasRef =
        useRef<HTMLCanvasElement | null>(null);

    const engineRef =
        useRef<AvatarEngine | null>(null);

    const trackingRef =
        useRef<AvatarTrackingState>(
            tracking,
        );

    const avatarRef =
        useRef<AvatarDefinition>(
            avatar,
        );

    const onCanvasReadyRef =
        useRef(onCanvasReady);

    const initialAvatarLoadedRef =
        useRef(false);

    /*
     * Keep the latest tracking state available to
     * the animation loop without recreating the loop
     * on every tracking update.
     */
    useEffect(() => {
        trackingRef.current =
            tracking;
    }, [tracking]);

    /*
     * Keep the latest avatar available to asynchronous
     * initialization and avatar-switch operations.
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
     * resize observer, and render loop once for this
     * component instance.
     */
    useEffect(() => {
        const container =
            containerRef.current;

        if (!container) {
            return;
        }

        let disposed = false;

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

        const engine =
            new AvatarEngine(
                (
                    selectedAvatar,
                    rendererCanvas,
                ) => {
                    switch (selectedAvatar.type) {
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

        let animationFrame =
            0;

        const render =
            () => {
                if (disposed) {
                    return;
                }

                engine.update(
                    trackingRef.current,
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
         * Load the initial avatar.
         *
         * The canvas is not exposed to the media layer
         * until the initial renderer has successfully
         * loaded.
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
                 * The selected avatar may have changed
                 * while the initial avatar was loading.
                 *
                 * If so, immediately load the latest
                 * selection rather than leaving the
                 * original avatar active.
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
                            if (disposed) {
                                return;
                            }

                            resize();

                            onCanvasReadyRef.current?.(
                                canvas,
                            );
                        })
                        .catch((error) => {
                            if (disposed) {
                                return;
                            }

                            console.error(
                                "[Avatar] Failed to load latest avatar:",
                                error,
                            );
                        });
                }
            })
            .catch((error) => {
                if (disposed) {
                    return;
                }

                console.error(
                    "[Avatar] Failed to load avatar:",
                    error,
                );
            });

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
    }, []);

    /*
     * Avatar selection changes the active renderer
     * without recreating:
     *
     * - the canvas
     * - AvatarEngine
     * - MediaPipe
     * - WebRTC
     *
     * The initial avatar is handled by the mount
     * effect above. This effect handles subsequent
     * avatar changes only.
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

                /*
                 * The canvas itself has not changed.
                 * Notify consumers again because the
                 * renderer backing the canvas has changed.
                 */
                onCanvasReadyRef.current?.(
                    canvas,
                );
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }

                console.error(
                    "[Avatar] Failed to switch avatar:",
                    error,
                );
            });

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