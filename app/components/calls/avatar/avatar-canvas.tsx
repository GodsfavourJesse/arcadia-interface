"use client";

import {
    useEffect,
    useRef,
} from "react";

import * as THREE from "three";

import {
    GLTFLoader,
} from "three/addons/loaders/GLTFLoader.js";

import {
    VRMLoaderPlugin,
    VRMUtils,
} from "@pixiv/three-vrm";

import type {
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

type AvatarCanvasProps = {
    modelUrl: string;
    tracking: AvatarTrackingState;
    onCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
};

type VRMInstance = {
    scene: THREE.Object3D;
    humanoid?: {
        getNormalizedBoneNode: (
            name: string,
        ) => THREE.Object3D | null;
    };
    expressionManager?: {
        setValue: (
            expressionName: string,
            value: number,
        ) => void;
        update: () => void;
    };
    update: (
        deltaSeconds: number,
    ) => void;
};

export function AvatarCanvas({
    modelUrl,
    tracking,
    onCanvasReady,
}: AvatarCanvasProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const canvasRef =
        useRef<HTMLCanvasElement | null>(
            null,
        );

    const vrmRef =
        useRef<VRMInstance | null>(
            null,
        );

    const rendererRef =
        useRef<THREE.WebGLRenderer | null>(
            null,
        );

    const sceneRef =
        useRef<THREE.Scene | null>(
            null,
        );

    const cameraRef =
        useRef<THREE.PerspectiveCamera | null>(
            null,
        );

    const animationFrameRef =
        useRef<number | null>(
            null,
        );

    const trackingRef =
        useRef<AvatarTrackingState>(
            tracking,
        );

    useEffect(() => {
        trackingRef.current =
            tracking;
    }, [tracking]);

    useEffect(() => {
        const containerRefValue =
            containerRef.current;

        if (containerRefValue === null) {
            return;
        }

        /*
         * Explicitly create a non-null reference.
         *
         * This value is guaranteed to be an
         * HTMLDivElement for the lifetime of
         * this effect.
         */
        const containerElement: HTMLDivElement =
            containerRefValue;

        const canvas =
            document.createElement(
                "canvas",
            );

        canvas.className =
            "block h-full w-full";

        canvasRef.current =
            canvas;

        containerElement.appendChild(
            canvas,
        );

        const scene =
            new THREE.Scene();

        scene.background =
            new THREE.Color(
                0x0b1020,
            );

        sceneRef.current =
            scene;

        const camera =
            new THREE.PerspectiveCamera(
                30,
                1,
                0.01,
                100,
            );

        camera.position.set(
            0,
            1.35,
            2.4,
        );

        camera.lookAt(
            0,
            1.25,
            0,
        );

        cameraRef.current =
            camera;

        const renderer =
            new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: false,
            });

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2,
            ),
        );

        renderer.outputColorSpace =
            THREE.SRGBColorSpace;

        renderer.shadowMap.enabled =
            false;

        rendererRef.current =
            renderer;

        const ambientLight =
            new THREE.AmbientLight(
                0xffffff,
                1.8,
            );

        scene.add(
            ambientLight,
        );

        const keyLight =
            new THREE.DirectionalLight(
                0xffffff,
                2.2,
            );

        keyLight.position.set(
            1.5,
            3,
            2,
        );

        scene.add(
            keyLight,
        );

        const fillLight =
            new THREE.DirectionalLight(
                0x9db7ff,
                1.2,
            );

        fillLight.position.set(
            -2,
            1.5,
            1,
        );

        scene.add(
            fillLight,
        );

        const loader =
            new GLTFLoader();

        loader.register(
            (parser) =>
                new VRMLoaderPlugin(
                    parser,
                ),
        );

        let disposed = false;

        function resize(
            element: HTMLDivElement,
        ) {
            const width =
                Math.max(
                    element.clientWidth,
                    1,
                );

            const height =
                Math.max(
                    element.clientHeight,
                    1,
                );

            renderer.setSize(
                width,
                height,
                false,
            );

            camera.aspect =
                width / height;

            camera.updateProjectionMatrix();
        }

        const resizeObserver =
            new ResizeObserver(() => {
                if (disposed) {
                    return;
                }

                resize(
                    containerElement,
                );
            });

        resizeObserver.observe(
            containerElement,
        );

        resize(
            containerElement,
        );

        async function loadAvatar() {
            try {
                const gltf =
                    await loader.loadAsync(
                        modelUrl,
                    );

                if (disposed) {
                    VRMUtils.deepDispose(
                        gltf.scene,
                    );

                    return;
                }

                const vrm =
                    gltf.userData.vrm as
                        | VRMInstance
                        | undefined;

                if (!vrm) {
                    throw new Error(
                        "The supplied model is not a valid VRM avatar.",
                    );
                }

                VRMUtils.removeUnnecessaryVertices(
                    gltf.scene,
                );

                VRMUtils.combineSkeletons(
                    gltf.scene,
                );

                vrm.scene.rotation.y =
                    Math.PI;

                scene.add(
                    vrm.scene,
                );

                vrmRef.current =
                    vrm;

                resize(
                    containerElement,
                );

                onCanvasReady?.(
                    canvas,
                );
            } catch (loadError) {
                if (!disposed) {
                    console.error(
                        "[Avatar] Failed to load VRM:",
                        loadError,
                    );
                }
            }
        }

        void loadAvatar();

        const clock =
            new THREE.Clock();

        const render = () => {
            if (disposed) {
                return;
            }

            const delta =
                clock.getDelta();

            const vrm =
                vrmRef.current;

            const currentTracking =
                trackingRef.current;

            if (vrm) {
                updateAvatar(
                    vrm,
                    currentTracking,
                );

                vrm.update(
                    delta,
                );
            }

            renderer.render(
                scene,
                camera,
            );

            animationFrameRef.current =
                requestAnimationFrame(
                    render,
                );
        };

        render();

        return () => {
            disposed = true;

            resizeObserver.disconnect();

            if (
                animationFrameRef.current !==
                null
            ) {
                cancelAnimationFrame(
                    animationFrameRef.current,
                );

                animationFrameRef.current =
                    null;
            }

            const vrm =
                vrmRef.current;

            if (vrm) {
                scene.remove(
                    vrm.scene,
                );

                VRMUtils.deepDispose(
                    vrm.scene,
                );

                vrmRef.current =
                    null;
            }

            renderer.dispose();

            rendererRef.current =
                null;

            sceneRef.current =
                null;

            cameraRef.current =
                null;

            if (
                canvas.parentNode ===
                containerElement
            ) {
                containerElement.removeChild(
                    canvas,
                );
            }

            canvasRef.current =
                null;
        };
    }, [
        modelUrl,
        onCanvasReady,
    ]);

    return (
        <div
            ref={containerRef}
            className="relative h-full w-full overflow-hidden rounded-[inherit]"
        />
    );
}

function updateAvatar(
    vrm: VRMInstance,
    tracking: AvatarTrackingState,
) {
    const head =
        vrm.humanoid?.getNormalizedBoneNode(
            "head",
        );

    if (head) {
        const yaw =
            tracking.head.yaw *
            0.65;

        const pitch =
            tracking.head.pitch *
            0.45;

        const roll =
            tracking.head.roll *
            0.5;

        head.rotation.y =
            yaw;

        head.rotation.x =
            -pitch;

        head.rotation.z =
            -roll;
    }

    const expressionManager =
        vrm.expressionManager;

    if (!expressionManager) {
        return;
    }

    expressionManager.setValue(
        "blinkLeft",
        tracking.eyes.leftBlink,
    );

    expressionManager.setValue(
        "blinkRight",
        tracking.eyes.rightBlink,
    );

    expressionManager.setValue(
        "aa",
        tracking.mouth.open,
    );

    expressionManager.setValue(
        "happy",
        tracking.mouth.smile,
    );

    expressionManager.update();
}