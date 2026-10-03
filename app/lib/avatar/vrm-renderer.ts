import * as THREE from "three";

import {
    GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

import {
    VRMLoaderPlugin,
    VRMUtils,
    type VRM,
} from "@pixiv/three-vrm";

import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

import type {
    AvatarRenderer,
} from "./avatar-renderer";

const MAX_PIXEL_RATIO = 2;

const HEAD_YAW_SCALE = 0.72;
const HEAD_PITCH_SCALE = 0.55;
const HEAD_ROLL_SCALE = 0.65;

const EYE_YAW_SCALE = 0.45;
const EYE_PITCH_SCALE = 0.35;

const DEFAULT_CAMERA_FOV = 30;
const DEFAULT_CAMERA_NEAR = 0.01;
const DEFAULT_CAMERA_FAR = 100;

const DEFAULT_CAMERA_POSITION = {
    x: 0,
    y: 1.35,
    z: 2.4,
};

const DEFAULT_CAMERA_TARGET = {
    x: 0,
    y: 1.25,
    z: 0,
};

const AMBIENT_LIGHT_INTENSITY = 1.8;
const KEY_LIGHT_INTENSITY = 2.2;
const FILL_LIGHT_INTENSITY = 1.2;

const KEY_LIGHT_POSITION = {
    x: 1.5,
    y: 3,
    z: 2,
};

const FILL_LIGHT_POSITION = {
    x: -2,
    y: 1.5,
    z: 1,
};

const FILL_LIGHT_COLOR = 0x9db7ff;

const MAX_VRM_DELTA_SECONDS = 0.1;

const REQUIRED_EXPRESSIONS = [
    "blinkLeft",
    "blinkRight",
    "aa",
    "happy",
    "ou",
] as const;

/**
 * Render-side smoothing.
 *
 * These values are intentionally independent from
 * MediaPipe smoothing.
 */
const RENDER_HEAD_RESPONSE = 24;
const RENDER_EYE_RESPONSE = 30;
const RENDER_GAZE_RESPONSE = 32;
const RENDER_MOUTH_RESPONSE = 28;
const RENDER_FACE_RESPONSE = 20;

type ScalarFilter = {
    value: number;
};

type RenderFilters = {
    yaw: ScalarFilter;
    pitch: ScalarFilter;
    roll: ScalarFilter;

    leftBlink: ScalarFilter;
    rightBlink: ScalarFilter;

    gazeX: ScalarFilter;
    gazeY: ScalarFilter;

    mouthOpen: ScalarFilter;
    smile: ScalarFilter;
    funnel: ScalarFilter;
    pucker: ScalarFilter;

    faceX: ScalarFilter;
    faceY: ScalarFilter;
    faceScale: ScalarFilter;
};

export class VRMRenderer
    implements AvatarRenderer
{
    private readonly canvas: HTMLCanvasElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly loader: GLTFLoader;

    private vrm: VRM | null = null;

    private disposed = false;

    private lastUpdateTime = 0;

    private readonly filters: RenderFilters =
        createRenderFilters();

    constructor(
        canvas: HTMLCanvasElement,
    ) {
        this.canvas = canvas;

        this.scene =
            new THREE.Scene();

        this.scene.background =
            new THREE.Color(
                0x0b1020,
            );

        this.camera =
            new THREE.PerspectiveCamera(
                DEFAULT_CAMERA_FOV,
                1,
                DEFAULT_CAMERA_NEAR,
                DEFAULT_CAMERA_FAR,
            );

        this.camera.position.set(
            DEFAULT_CAMERA_POSITION.x,
            DEFAULT_CAMERA_POSITION.y,
            DEFAULT_CAMERA_POSITION.z,
        );

        this.camera.lookAt(
            DEFAULT_CAMERA_TARGET.x,
            DEFAULT_CAMERA_TARGET.y,
            DEFAULT_CAMERA_TARGET.z,
        );

        this.renderer =
            new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance",
            });

        this.renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                MAX_PIXEL_RATIO,
            ),
        );

        this.renderer.outputColorSpace =
            THREE.SRGBColorSpace;

        this.renderer.shadowMap.enabled =
            false;

        this.loader =
            new GLTFLoader();

        this.loader.register(
            (parser) =>
                new VRMLoaderPlugin(
                    parser,
                ),
        );

        this.setupLighting();
        this.resizeToCanvas();
    }

    async load(
        avatar: AvatarDefinition,
    ): Promise<void> {
        if (this.disposed) {
            return;
        }

        const gltf =
            await this.loader.loadAsync(
                avatar.assetUrl,
            );

        if (this.disposed) {
            VRMUtils.deepDispose(
                gltf.scene,
            );

            return;
        }

        const vrm =
            gltf.userData.vrm as
                | VRM
                | undefined;

        if (!vrm) {
            VRMUtils.deepDispose(
                gltf.scene,
            );

            throw new Error(
                `Avatar "${avatar.id}" is not a valid VRM model.`,
            );
        }

        try {
            validateVRMCapabilities(
                avatar,
                vrm,
            );
        } catch (error) {
            VRMUtils.deepDispose(
                gltf.scene,
            );

            throw error;
        }

        VRMUtils.removeUnnecessaryVertices(
            gltf.scene,
        );

        VRMUtils.combineSkeletons(
            gltf.scene,
        );

        VRMUtils.combineMorphs(
            vrm,
        );

        vrm.scene.traverse(
            (object) => {
                object.frustumCulled =
                    false;
            },
        );

        VRMUtils.rotateVRM0(
            vrm,
        );

        const previousVRM =
            this.vrm;

        this.scene.add(
            vrm.scene,
        );

        this.vrm =
            vrm;

        this.lastUpdateTime =
            0;

        resetRenderFilters(
            this.filters,
        );

        this.frameVRM(
            vrm,
        );

        if (previousVRM) {
            this.scene.remove(
                previousVRM.scene,
            );

            VRMUtils.deepDispose(
                previousVRM.scene,
            );
        }

        this.resizeToCanvas();

        this.renderer.render(
            this.scene,
            this.camera,
        );
    }

    update(
        tracking: AvatarTrackingState,
    ): void {
        if (
            this.disposed ||
            !this.vrm
        ) {
            return;
        }

        const now =
            performance.now();

        const deltaSeconds =
            this.lastUpdateTime > 0
                ? Math.min(
                      (
                          now -
                          this.lastUpdateTime
                      ) / 1000,
                      MAX_VRM_DELTA_SECONDS,
                  )
                : 1 / 60;

        this.lastUpdateTime =
            now;

        /*
         * Render-side interpolation.
         *
         * MediaPipe produces targets.
         * This renderer continuously moves the avatar
         * toward those targets.
         */
        const smoothed =
            smoothTracking(
                this.filters,
                tracking,
                deltaSeconds,
            );

        updateVRM(
            this.vrm,
            smoothed,
        );

        /*
         * three-vrm then propagates normalized bones,
         * expressions and spring bones.
         */
        this.vrm.update(
            deltaSeconds,
        );

        this.renderer.render(
            this.scene,
            this.camera,
        );
    }

    resize(
        width: number,
        height: number,
    ): void {
        if (this.disposed) {
            return;
        }

        const safeWidth =
            Math.max(
                width,
                1,
            );

        const safeHeight =
            Math.max(
                height,
                1,
            );

        this.camera.aspect =
            safeWidth /
            safeHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            safeWidth,
            safeHeight,
            false,
        );
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        this.unloadCurrentVRM();

        this.renderer.dispose();

        this.scene.clear();

        this.lastUpdateTime = 0;
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private resizeToCanvas(): void {
        this.resize(
            Math.max(
                this.canvas.clientWidth,
                1,
            ),
            Math.max(
                this.canvas.clientHeight,
                1,
            ),
        );
    }

    private setupLighting(): void {
        const ambientLight =
            new THREE.AmbientLight(
                0xffffff,
                AMBIENT_LIGHT_INTENSITY,
            );

        this.scene.add(
            ambientLight,
        );

        const keyLight =
            new THREE.DirectionalLight(
                0xffffff,
                KEY_LIGHT_INTENSITY,
            );

        keyLight.position.set(
            KEY_LIGHT_POSITION.x,
            KEY_LIGHT_POSITION.y,
            KEY_LIGHT_POSITION.z,
        );

        this.scene.add(
            keyLight,
        );

        const fillLight =
            new THREE.DirectionalLight(
                FILL_LIGHT_COLOR,
                FILL_LIGHT_INTENSITY,
            );

        fillLight.position.set(
            FILL_LIGHT_POSITION.x,
            FILL_LIGHT_POSITION.y,
            FILL_LIGHT_POSITION.z,
        );

        this.scene.add(
            fillLight,
        );
    }

    private unloadCurrentVRM(): void {
        const currentVRM =
            this.vrm;

        if (!currentVRM) {
            return;
        }

        this.scene.remove(
            currentVRM.scene,
        );

        VRMUtils.deepDispose(
            currentVRM.scene,
        );

        this.vrm = null;
    }

    private frameVRM(
        vrm: VRM,
    ): void {
        const bounds =
            new THREE.Box3().setFromObject(
                vrm.scene,
            );

        if (bounds.isEmpty()) {
            return;
        }

        const center =
            new THREE.Vector3();

        const size =
            new THREE.Vector3();

        bounds.getCenter(
            center,
        );

        bounds.getSize(
            size,
        );

        const maxDimension =
            Math.max(
                size.x,
                size.y,
                size.z,
                0.1,
            );

        const verticalPadding =
            1.15;

        const halfFovRadians =
            THREE.MathUtils.degToRad(
                this.camera.fov / 2,
            );

        const distance =
            (
                maxDimension *
                verticalPadding
            ) /
            (
                2 *
                Math.tan(
                    halfFovRadians,
                )
            );

        this.camera.position.set(
            center.x,
            center.y,
            center.z + distance,
        );

        this.camera.lookAt(
            center.x,
            center.y,
            center.z,
        );

        this.camera.near =
            Math.max(
                distance / 100,
                0.01,
            );

        this.camera.far =
            Math.max(
                distance * 10,
                100,
            );

        this.camera.updateProjectionMatrix();
    }
}

function createRenderFilters(): RenderFilters {
    return {
        yaw: {
            value: 0,
        },

        pitch: {
            value: 0,
        },

        roll: {
            value: 0,
        },

        leftBlink: {
            value: 0,
        },

        rightBlink: {
            value: 0,
        },

        gazeX: {
            value: 0,
        },

        gazeY: {
            value: 0,
        },

        mouthOpen: {
            value: 0,
        },

        smile: {
            value: 0,
        },

        funnel: {
            value: 0,
        },

        pucker: {
            value: 0,
        },

        faceX: {
            value: 0,
        },

        faceY: {
            value: 0,
        },

        faceScale: {
            value: 1,
        },
    };
}

function resetRenderFilters(
    filters: RenderFilters,
): void {
    filters.yaw.value = 0;
    filters.pitch.value = 0;
    filters.roll.value = 0;

    filters.leftBlink.value = 0;
    filters.rightBlink.value = 0;

    filters.gazeX.value = 0;
    filters.gazeY.value = 0;

    filters.mouthOpen.value = 0;
    filters.smile.value = 0;
    filters.funnel.value = 0;
    filters.pucker.value = 0;

    filters.faceX.value = 0;
    filters.faceY.value = 0;
    filters.faceScale.value = 1;
}

function smoothValue(
    current: number,
    target: number,
    response: number,
    deltaSeconds: number,
): number {
    const safeDelta =
        Math.min(
            Math.max(
                deltaSeconds,
                0.001,
            ),
            MAX_VRM_DELTA_SECONDS,
        );

    const alpha =
        1 -
        Math.exp(
            -response *
                safeDelta,
        );

    return (
        current +
        (
            target -
            current
        ) *
            alpha
    );
}

function smoothTracking(
    filters: RenderFilters,
    tracking: AvatarTrackingState,
    deltaSeconds: number,
): AvatarTrackingState {
    filters.yaw.value =
        smoothValue(
            filters.yaw.value,
            tracking.head.yaw,
            RENDER_HEAD_RESPONSE,
            deltaSeconds,
        );

    filters.pitch.value =
        smoothValue(
            filters.pitch.value,
            tracking.head.pitch,
            RENDER_HEAD_RESPONSE,
            deltaSeconds,
        );

    filters.roll.value =
        smoothValue(
            filters.roll.value,
            tracking.head.roll,
            RENDER_HEAD_RESPONSE,
            deltaSeconds,
        );

    filters.leftBlink.value =
        smoothValue(
            filters.leftBlink.value,
            tracking.eyes.leftBlink,
            RENDER_EYE_RESPONSE,
            deltaSeconds,
        );

    filters.rightBlink.value =
        smoothValue(
            filters.rightBlink.value,
            tracking.eyes.rightBlink,
            RENDER_EYE_RESPONSE,
            deltaSeconds,
        );

    filters.gazeX.value =
        smoothValue(
            filters.gazeX.value,
            tracking.eyes.gazeX,
            RENDER_GAZE_RESPONSE,
            deltaSeconds,
        );

    filters.gazeY.value =
        smoothValue(
            filters.gazeY.value,
            tracking.eyes.gazeY,
            RENDER_GAZE_RESPONSE,
            deltaSeconds,
        );

    filters.mouthOpen.value =
        smoothValue(
            filters.mouthOpen.value,
            tracking.mouth.open,
            RENDER_MOUTH_RESPONSE,
            deltaSeconds,
        );

    filters.smile.value =
        smoothValue(
            filters.smile.value,
            tracking.mouth.smile,
            RENDER_MOUTH_RESPONSE,
            deltaSeconds,
        );

    filters.funnel.value =
        smoothValue(
            filters.funnel.value,
            tracking.mouth.funnel,
            RENDER_MOUTH_RESPONSE,
            deltaSeconds,
        );

    filters.pucker.value =
        smoothValue(
            filters.pucker.value,
            tracking.mouth.pucker,
            RENDER_MOUTH_RESPONSE,
            deltaSeconds,
        );

    filters.faceX.value =
        smoothValue(
            filters.faceX.value,
            tracking.face.x,
            RENDER_FACE_RESPONSE,
            deltaSeconds,
        );

    filters.faceY.value =
        smoothValue(
            filters.faceY.value,
            tracking.face.y,
            RENDER_FACE_RESPONSE,
            deltaSeconds,
        );

    filters.faceScale.value =
        smoothValue(
            filters.faceScale.value,
            tracking.face.scale,
            RENDER_FACE_RESPONSE,
            deltaSeconds,
        );

    return {
        faceDetected:
            tracking.faceDetected,

        landmarks:
            tracking.landmarks,

        face: {
            x: filters.faceX.value,
            y: filters.faceY.value,
            scale: filters.faceScale.value,
        },

        nose: {
            ...tracking.nose,
        },

        head: {
            yaw: filters.yaw.value,
            pitch: filters.pitch.value,
            roll: filters.roll.value,
        },

        eyes: {
            leftBlink:
                filters.leftBlink.value,

            rightBlink:
                filters.rightBlink.value,

            gazeX:
                filters.gazeX.value,

            gazeY:
                filters.gazeY.value,
        },

        brows: {
            ...tracking.brows,
        },

        mouth: {
            open:
                filters.mouthOpen.value,

            smile:
                filters.smile.value,

            funnel:
                filters.funnel.value,

            pucker:
                filters.pucker.value,
        },

        timestamp:
            tracking.timestamp,
    };
}

function updateVRM(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    updateHeadRotation(
        vrm,
        tracking,
    );

    updateEyeRotation(
        vrm,
        tracking,
    );

    updateExpressions(
        vrm,
        tracking,
    );

    updateFaceMovement(
        vrm,
        tracking,
    );
}

function updateHeadRotation(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    const head =
        vrm.humanoid?.getNormalizedBoneNode(
            "head",
        );

    if (!head) {
        return;
    }

    head.rotation.y =
        tracking.head.yaw *
        HEAD_YAW_SCALE;

    head.rotation.x =
        -tracking.head.pitch *
        HEAD_PITCH_SCALE;

    head.rotation.z =
        -tracking.head.roll *
        HEAD_ROLL_SCALE;
}

function updateEyeRotation(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    const humanoid =
        vrm.humanoid;

    if (!humanoid) {
        return;
    }

    const leftEye =
        humanoid.getNormalizedBoneNode(
            "leftEye",
        );

    const rightEye =
        humanoid.getNormalizedBoneNode(
            "rightEye",
        );

    /*
     * Seed-san does not have eye bones, so this simply
     * does nothing for the current asset.
     *
     * Future VRMs with eye bones will immediately benefit
     * from the gaze tracking.
     */
    if (
        leftEye &&
        rightEye
    ) {
        const yaw =
            tracking.eyes.gazeX *
            EYE_YAW_SCALE;

        const pitch =
            tracking.eyes.gazeY *
            EYE_PITCH_SCALE;

        leftEye.rotation.y =
            yaw;

        leftEye.rotation.x =
            -pitch;

        rightEye.rotation.y =
            yaw;

        rightEye.rotation.x =
            -pitch;
    }
}

function updateExpressions(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    const expressionManager =
        vrm.expressionManager;

    if (!expressionManager) {
        return;
    }

    expressionManager.setValue(
        "blinkLeft",
        clamp01(
            tracking.eyes.leftBlink,
        ),
    );

    expressionManager.setValue(
        "blinkRight",
        clamp01(
            tracking.eyes.rightBlink,
        ),
    );

    expressionManager.setValue(
        "aa",
        clamp01(
            tracking.mouth.open,
        ),
    );

    expressionManager.setValue(
        "happy",
        clamp01(
            tracking.mouth.smile,
        ),
    );

    /*
     * "ou" is primarily used for the rounded/pursed mouth.
     *
     * Funnel and pucker are combined conservatively so
     * the expression does not become excessively strong.
     */
    expressionManager.setValue(
        "ou",
        clamp01(
            Math.max(
                tracking.mouth.pucker,
                tracking.mouth.funnel *
                    0.85,
            ),
        ),
    );
}

function updateFaceMovement(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    /*
     * We intentionally do NOT translate the whole VRM based
     * directly on camera position.
     *
     * Doing that would make the avatar appear to physically
     * slide around the scene whenever the user moves slightly.
     *
     * Face position is tracked and available for a future
     * camera/framing layer.
     *
     * Actual nose deformation requires a VRM nose morph/bone.
     */
    void vrm;
    void tracking;
}

function validateVRMCapabilities(
    avatar: AvatarDefinition,
    vrm: VRM,
): void {
    const humanoid =
        vrm.humanoid;

    const head =
        humanoid?.getNormalizedBoneNode(
            "head",
        ) ?? null;

    const leftEye =
        humanoid?.getNormalizedBoneNode(
            "leftEye",
        ) ?? null;

    const rightEye =
        humanoid?.getNormalizedBoneNode(
            "rightEye",
        ) ?? null;

    const expressionManager =
        vrm.expressionManager ??
        null;

    const expressionStatus =
        Object.fromEntries(
            REQUIRED_EXPRESSIONS.map(
                (name) => [
                    name,
                    expressionManager?.getExpression(
                        name,
                    ) != null,
                ],
            ),
        ) as Record<
            (typeof REQUIRED_EXPRESSIONS)[number],
            boolean
        >;

    const missingExpressions =
        REQUIRED_EXPRESSIONS.filter(
            (name) =>
                !expressionStatus[name],
        );

    const requiredCapabilitiesValid =
        Boolean(
            humanoid &&
                head &&
                expressionManager,
        );

    console.info(
        "[Miyor] VRM capability validation",
        {
            valid:
                requiredCapabilitiesValid,

            humanoid:
                Boolean(humanoid),

            head:
                Boolean(head),

            leftEye:
                Boolean(leftEye),

            rightEye:
                Boolean(rightEye),

            expressions:
                Boolean(
                    expressionManager,
                ),

            ...expressionStatus,

            lookAt:
                Boolean(vrm.lookAt),
        },
    );

    if (
        !requiredCapabilitiesValid
    ) {
        throw new Error(
            `Avatar "${avatar.id}" does not provide the required VRM capabilities.`,
        );
    }

    if (
        missingExpressions.length >
        0
    ) {
        console.warn(
            `[Miyor] Avatar "${avatar.id}" is missing expressions: ${missingExpressions.join(", ")}.`,
        );
    }
}

function clamp01(
    value: number,
): number {
    return Math.min(
        1,
        Math.max(
            0,
            value,
        ),
    );
}