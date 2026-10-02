import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
    VRMLoaderPlugin,
    VRMUtils,
    type VRM,
} from "@pixiv/three-vrm";

import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";
import type { AvatarRenderer } from "./avatar-renderer";
import { logVRMValidation, validateVRM } from "./vrm-validator";

const MAX_PIXEL_RATIO = 2;

const HEAD_YAW_SCALE = 0.65;
const HEAD_PITCH_SCALE = 0.45;
const HEAD_ROLL_SCALE = 0.5;

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

export class VRMRenderer implements AvatarRenderer {
    private readonly canvas: HTMLCanvasElement;

    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly loader: GLTFLoader;

    private vrm: VRM | null = null;
    private disposed = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b1020);

        this.camera = new THREE.PerspectiveCamera(
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

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: false,
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
        );

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = false;

        this.loader = new GLTFLoader();

        this.loader.register(
            (parser) => new VRMLoaderPlugin(parser),
        );

        this.setupLighting();

        this.resize(
            Math.max(canvas.clientWidth, 1),
            Math.max(canvas.clientHeight, 1),
        );
    }

    async load(avatar: AvatarDefinition): Promise<void> {
        if (this.disposed) {
            return;
        }

        const gltf = await this.loader.loadAsync(
            avatar.assetUrl,
        );

        if (this.disposed) {
            VRMUtils.deepDispose(gltf.scene);
            return;
        }

        const vrm = gltf.userData.vrm as VRM | undefined;

        if (!vrm) {
            VRMUtils.deepDispose(gltf.scene);

            throw new Error(
                `Avatar "${avatar.id}" is not a valid VRM model.`,
            );
        }

        const validation = validateVRM(vrm);

        logVRMValidation(validation);

        if (!validation.valid) {
            VRMUtils.deepDispose(gltf.scene);

            throw new Error(
                `Avatar "${avatar.id}" does not provide the required VRM capabilities.`,
            );
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.combineMorphs(vrm);

        vrm.scene.traverse((object) => {
            object.frustumCulled = false;
        });

        VRMUtils.rotateVRM0(vrm);

        const previousVRM = this.vrm;

        this.scene.add(vrm.scene);
        this.vrm = vrm;

        if (previousVRM) {
            this.scene.remove(previousVRM.scene);

            VRMUtils.deepDispose(
                previousVRM.scene,
            );
        }

        this.resize(
            Math.max(this.canvas.clientWidth, 1),
            Math.max(this.canvas.clientHeight, 1),
        );
    }

    update(tracking: AvatarTrackingState): void {
        if (this.disposed || !this.vrm) {
            return;
        }

        updateVRM(this.vrm, tracking);

        this.renderer.render(
            this.scene,
            this.camera,
        );
    }

    resize(width: number, height: number): void {
        if (this.disposed) {
            return;
        }

        const safeWidth = Math.max(width, 1);
        const safeHeight = Math.max(height, 1);

        this.camera.aspect = safeWidth / safeHeight;
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
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(
            0xffffff,
            AMBIENT_LIGHT_INTENSITY,
        );

        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(
            0xffffff,
            KEY_LIGHT_INTENSITY,
        );

        keyLight.position.set(
            KEY_LIGHT_POSITION.x,
            KEY_LIGHT_POSITION.y,
            KEY_LIGHT_POSITION.z,
        );

        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(
            FILL_LIGHT_COLOR,
            FILL_LIGHT_INTENSITY,
        );

        fillLight.position.set(
            FILL_LIGHT_POSITION.x,
            FILL_LIGHT_POSITION.y,
            FILL_LIGHT_POSITION.z,
        );

        this.scene.add(fillLight);
    }

    private unloadCurrentVRM(): void {
        const currentVRM = this.vrm;

        if (!currentVRM) {
            return;
        }

        this.scene.remove(currentVRM.scene);

        VRMUtils.deepDispose(
            currentVRM.scene,
        );

        this.vrm = null;
    }
}

function updateVRM(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    updateHeadRotation(
        vrm,
        tracking,
    );

    updateExpressions(
        vrm,
        tracking,
    );
}

function updateHeadRotation(
    vrm: VRM,
    tracking: AvatarTrackingState,
): void {
    const head = vrm.humanoid?.getNormalizedBoneNode(
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
        clamp01(tracking.eyes.leftBlink),
    );

    expressionManager.setValue(
        "blinkRight",
        clamp01(tracking.eyes.rightBlink),
    );

    expressionManager.setValue(
        "aa",
        clamp01(tracking.mouth.open),
    );

    expressionManager.setValue(
        "happy",
        clamp01(tracking.mouth.smile),
    );

    expressionManager.setValue(
        "ou",
        clamp01(tracking.mouth.pucker),
    );

    expressionManager.update();
}

function clamp01(value: number): number {
    return Math.min(
        1,
        Math.max(0, value),
    );
}