import {
    FaceLandmarker,
    FilesetResolver,
    type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import type {
    AvatarDefinition,
    AvatarLandmark,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

import type { AvatarRenderer } from "./avatar-renderer";
import { ImagePuppetRenderer } from "./image-puppet-renderer";

const MEDIAPIPE_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const MAX_RENDER_FPS = 30;
const MIN_RENDER_INTERVAL = 1000 / MAX_RENDER_FPS;

const FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
] as const;

const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const;
const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const;
const MOUTH = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
] as const;

type Point = { x: number; y: number };
type PuppetLandmark = Pick<AvatarLandmark, "x" | "y" | "z">;
type Triangle = [number, number, number];

type PortraitCalibration = {
    ready: boolean;
    samples: number;
    x: number;
    y: number;
    scale: number;
    yaw: number;
    pitch: number;
    roll: number;
};

const DEFAULT_CALIBRATION: PortraitCalibration = {
    ready: false,
    samples: 0,
    x: 0,
    y: 0,
    scale: 1,
    yaw: 0,
    pitch: 0,
    roll: 0,
};

export type PortraitProOptions = {
    enhancement?: "natural" | "studio" | "off";
    calibrationFrames?: number;
    motionGain?: number;
};

/**
 * Miyor Portrait Pro is the browser-first professional renderer.
 *
 * It combines:
 * - MediaPipe model-backed face analysis
 * - source-portrait face calibration
 * - 478-point mesh retargeting
 * - head-pose/parallax response
 * - independent eye/blink retargeting
 * - brow retargeting
 * - mouth/jaw retargeting
 * - feathered face masking
 * - live-camera background compositing
 * - local portrait enhancement
 *
 * It intentionally remains a renderer, so WebRTC never receives raw
 * landmarks and the backend never sees the user's face mesh.
 *
 * If source-face analysis fails, it delegates to ImagePuppetRenderer,
 * preserving the existing low-latency fallback.
 */
export class PortraitProRenderer implements AvatarRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly fallback: ImagePuppetRenderer;
    private readonly options: Required<PortraitProOptions>;

    private image: HTMLImageElement | null = null;

    /**
     * Local physical camera source. The final canvas becomes the
     * outgoing WebRTC video track, so the remote peer receives the
     * composited face-swap result rather than the raw camera track.
     */
    private cameraSource: HTMLVideoElement | null = null;

    private sourceSurface: HTMLCanvasElement | null = null;
    private backgroundSurface: HTMLCanvasElement | null = null;
    private sourceLandmarks: readonly PuppetLandmark[] = [];
    private triangles: readonly Triangle[] = [];

    private faceLayer: HTMLCanvasElement | null = null;
    private maskLayer: HTMLCanvasElement | null = null;

    private calibration: PortraitCalibration = {
        ...DEFAULT_CALIBRATION,
    };

    private disposed = false;
    private lastRenderTime = 0;
    private width = 1;
    private height = 1;

    constructor(
        canvas: HTMLCanvasElement,
        options: PortraitProOptions = {},
    ) {
        this.canvas = canvas;
        this.options = {
            enhancement: options.enhancement ?? "studio",
            calibrationFrames: Math.max(
                8,
                options.calibrationFrames ?? 18,
            ),
            motionGain: Math.max(
                0.4,
                Math.min(1.8, options.motionGain ?? 1),
            ),
        };

        const context = canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
        });

        if (!context) {
            throw new Error(
                "Unable to create the Portrait Pro rendering context.",
            );
        }

        this.context = context;
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = "high";

        this.fallback = new ImagePuppetRenderer(canvas);

        this.resize(
            Math.max(canvas.clientWidth, 1),
            Math.max(canvas.clientHeight, 1),
        );
    }

    async load(avatar: AvatarDefinition): Promise<void> {
        if (this.disposed) {
            return;
        }

        const image = await loadImage(avatar.assetUrl);

        if (this.disposed) {
            return;
        }

        this.image = image;
        this.sourceSurface = createEnhancedSurface(
            image,
            this.options.enhancement,
        );
        this.backgroundSurface = null;
        this.sourceLandmarks = [];
        this.triangles = [];
        this.resetCalibration();

        this.ensureLayers();

        try {
            const landmarker = await createImageLandmarker();
            const result = landmarker.detect(image);
            landmarker.close();

            const landmarks = result.faceLandmarks?.[0] ?? [];

            if (landmarks.length < 400) {
                throw new Error(
                    "The portrait face could not be mapped reliably.",
                );
            }

            this.sourceLandmarks =
                landmarks.map(toPuppetLandmark);

            this.triangles =
                triangulateFace(this.sourceLandmarks);

            if (this.triangles.length < 100) {
                throw new Error(
                    "The portrait face mesh could not be triangulated.",
                );
            }

            this.backgroundSurface =
                createPortraitBackgroundSurface(
                    this.sourceSurface,
                    this.sourceLandmarks,
                );

            console.info("[Miyor Portrait Pro] Source portrait calibrated", {
                landmarks: this.sourceLandmarks.length,
                triangles: this.triangles.length,
                enhancement: this.options.enhancement,
            });
        } catch (error) {
            console.warn(
                "[Miyor Portrait Pro] Source mapping failed; using low-latency fallback.",
                error,
            );
            await this.fallback.load(avatar);
        }

        if (!this.backgroundSurface && this.sourceSurface) {
            this.backgroundSurface =
                createPortraitBackgroundSurface(
                    this.sourceSurface,
                    this.sourceLandmarks,
                );
        }

        this.renderStatic();
    }

    setCameraSource(
        video: HTMLVideoElement | null,
    ): void {
        this.cameraSource = video;
    }

    update(tracking: AvatarTrackingState): void {
        if (this.disposed || !this.image) {
            return;
        }

        const now = performance.now();

        if (
            now - this.lastRenderTime <
            MIN_RENDER_INTERVAL
        ) {
            return;
        }

        this.lastRenderTime = now;

        if (
            this.sourceLandmarks.length < 400 ||
            this.triangles.length < 100
        ) {
            this.fallback.update(tracking);
            return;
        }

        if (
            !tracking.faceDetected ||
            tracking.landmarks.length !==
                this.sourceLandmarks.length
        ) {
            this.renderStatic();
            return;
        }

        this.updateCalibration(tracking);
        this.renderPortrait(tracking);
    }

    resize(width: number, height: number): void {
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ensureLayers();

        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = "high";
        this.renderStatic();
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        this.image = null;
        this.cameraSource = null;
        this.sourceSurface = null;
        this.backgroundSurface = null;
        this.sourceLandmarks = [];
        this.triangles = [];

        this.faceLayer = null;
        this.maskLayer = null;

        this.fallback.dispose();

        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private ensureLayers(): void {
        if (
            !this.faceLayer ||
            this.faceLayer.width !== this.width ||
            this.faceLayer.height !== this.height
        ) {
            this.faceLayer = document.createElement("canvas");
            this.faceLayer.width = this.width;
            this.faceLayer.height = this.height;
        }

        if (
            !this.maskLayer ||
            this.maskLayer.width !== this.width ||
            this.maskLayer.height !== this.height
        ) {
            this.maskLayer = document.createElement("canvas");
            this.maskLayer.width = this.width;
            this.maskLayer.height = this.height;
        }
    }

    private resetCalibration(): void {
        this.calibration = {
            ...DEFAULT_CALIBRATION,
        };
    }

    private updateCalibration(
        tracking: AvatarTrackingState,
    ): void {
        if (this.calibration.ready) {
            return;
        }

        const count = this.calibration.samples + 1;
        const weight = 1 / count;

        this.calibration.x +=
            (tracking.face.x - this.calibration.x) *
            weight;
        this.calibration.y +=
            (tracking.face.y - this.calibration.y) *
            weight;
        this.calibration.scale +=
            (tracking.face.scale - this.calibration.scale) *
            weight;
        this.calibration.yaw +=
            (tracking.head.yaw - this.calibration.yaw) *
            weight;
        this.calibration.pitch +=
            (tracking.head.pitch - this.calibration.pitch) *
            weight;
        this.calibration.roll +=
            (tracking.head.roll - this.calibration.roll) *
            weight;

        this.calibration.samples = count;

        if (count >= this.options.calibrationFrames) {
            this.calibration.ready = true;

            console.info(
                "[Miyor Portrait Pro] Live neutral calibration locked",
                {
                    samples: count,
                    face: {
                        x: this.calibration.x,
                        y: this.calibration.y,
                        scale: this.calibration.scale,
                    },
                },
            );
        }
    }

    private renderStatic(): void {
        if (this.disposed) {
            return;
        }

        this.context.save();
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        /*
         * Keep the outgoing surface representative of the live scene
         * even before a face is detected. Once tracking is available,
         * renderPortrait() replaces only the face region.
         */
        if (this.drawLiveCameraBackground()) {
            this.context.restore();
            return;
        }

        const surface =
            this.backgroundSurface ??
            this.sourceSurface;

        if (surface) {
            drawCover(
                this.context,
                surface,
                surface.width,
                surface.height,
                this.width,
                this.height,
            );
        }

        this.context.restore();
    }

    private renderPortrait(
        tracking: AvatarTrackingState,
    ): void {
        const surface = this.sourceSurface;
        const faceLayer = this.faceLayer;
        const maskLayer = this.maskLayer;

        if (
            !surface ||
            !faceLayer ||
            !maskLayer
        ) {
            return;
        }

        const sourceBounds = getBounds(
            this.sourceLandmarks,
        );
        const liveBounds = getBounds(
            tracking.landmarks,
        );

        const sourceWidth = Math.max(
            sourceBounds.maxX - sourceBounds.minX,
            0.001,
        );
        const sourceHeight = Math.max(
            sourceBounds.maxY - sourceBounds.minY,
            0.001,
        );

        const liveWidth = Math.max(
            liveBounds.maxX - liveBounds.minX,
            0.001,
        );
        const liveHeight = Math.max(
            liveBounds.maxY - liveBounds.minY,
            0.001,
        );

        const sourceCenter = {
            x:
                (sourceBounds.minX +
                    sourceBounds.maxX) *
                0.5,
            y:
                (sourceBounds.minY +
                    sourceBounds.maxY) *
                0.5,
        };

        const liveCenter = {
            x:
                (liveBounds.minX +
                    liveBounds.maxX) *
                0.5,
            y:
                (liveBounds.minY +
                    liveBounds.maxY) *
                0.5,
        };

        const neutral = this.calibration;

        const faceMotionX =
            (tracking.face.x -
                neutral.x) *
            this.options.motionGain;

        const faceMotionY =
            (tracking.face.y -
                neutral.y) *
            this.options.motionGain;

        const scaleMotion =
            clamp(
                tracking.face.scale /
                    Math.max(neutral.scale, 0.001),
                0.78,
                1.35,
            );

        const yawDelta =
            tracking.head.yaw -
            neutral.yaw;

        const pitchDelta =
            tracking.head.pitch -
            neutral.pitch;

        const rollDelta =
            tracking.head.roll -
            neutral.roll;

        const baseFaceWidth =
            Math.min(this.width * 0.72, this.height * 0.78);

        const targetFaceWidth =
            clamp(
                baseFaceWidth * scaleMotion,
                this.width * 0.34,
                this.width * 0.9,
            );

        const targetFaceHeight =
            targetFaceWidth *
            (sourceHeight / sourceWidth);

        const centerX =
            this.width * 0.5 +
            faceMotionX *
                this.width *
                0.75 +
            yawDelta *
                this.width *
                0.055;

        const centerY =
            this.height * 0.48 -
            faceMotionY *
                this.height *
                0.65 +
            pitchDelta *
                this.height *
                0.035;

        const poseScaleX =
            1 -
            Math.min(
                0.16,
                Math.abs(yawDelta) * 0.09,
            );

        const poseScaleY =
            1 -
            Math.min(
                0.08,
                Math.abs(pitchDelta) * 0.05,
            );

        const mapLiveToCanvas = (
            landmark: PuppetLandmark,
        ): Point => {
            const u =
                (landmark.x - liveBounds.minX) /
                liveWidth;

            const v =
                (landmark.y - liveBounds.minY) /
                liveHeight;

            let x =
                centerX +
                (u - 0.5) *
                    targetFaceWidth *
                    poseScaleX;

            let y =
                centerY +
                (v - 0.5) *
                    targetFaceHeight *
                    poseScaleY;

            const dx = x - centerX;
            const dy = y - centerY;
            const cos = Math.cos(rollDelta * 0.15);
            const sin = Math.sin(rollDelta * 0.15);

            x =
                centerX +
                dx * cos -
                dy * sin;
            y =
                centerY +
                dx * sin +
                dy * cos;

            return {
                x,
                y,
            };
        };

        const sourceToImage = (
            landmark: PuppetLandmark,
        ): Point => ({
            x:
                landmark.x *
                surface.width,
            y:
                landmark.y *
                surface.height,
        });

        const destination = (
            index: number,
        ): Point | null => {
            const landmark =
                tracking.landmarks[index];

            return landmark
                ? mapLiveToCanvas(landmark)
                : null;
        };

        faceLayer.width = this.width;
        faceLayer.height = this.height;
        maskLayer.width = this.width;
        maskLayer.height = this.height;

        const faceContext =
            faceLayer.getContext("2d", {
                alpha: true,
                desynchronized: true,
            });

        const maskContext =
            maskLayer.getContext("2d", {
                alpha: true,
            });

        if (!faceContext || !maskContext) {
            return;
        }

        faceContext.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        maskContext.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        faceContext.imageSmoothingEnabled = true;
        faceContext.imageSmoothingQuality = "high";

        for (const [a, b, c] of this.triangles) {
            const sourceA =
                this.sourceLandmarks[a];
            const sourceB =
                this.sourceLandmarks[b];
            const sourceC =
                this.sourceLandmarks[c];

            const destA = destination(a);
            const destB = destination(b);
            const destC = destination(c);

            if (
                !sourceA ||
                !sourceB ||
                !sourceC ||
                !destA ||
                !destB ||
                !destC
            ) {
                continue;
            }

            const sourcePointA =
                sourceToImage(sourceA);
            const sourcePointB =
                sourceToImage(sourceB);
            const sourcePointC =
                sourceToImage(sourceC);

            drawImageTriangle(
                faceContext,
                surface,
                sourcePointA,
                sourcePointB,
                sourcePointC,
                destA,
                destB,
                destC,
            );
        }

        this.drawExpressionRetargeting(
            faceContext,
            tracking,
            destination,
        );

        drawFeatheredFaceMask(
            maskContext,
            FACE_OVAL,
            tracking.landmarks,
            destination,
            this.width,
            this.height,
        );

        faceContext.save();
        faceContext.globalCompositeOperation =
            "destination-in";
        faceContext.drawImage(
            maskLayer,
            0,
            0,
        );
        faceContext.restore();

        this.context.save();
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        if (!this.drawLiveCameraBackground()) {
            const background =
                this.backgroundSurface ??
                surface;

            drawCover(
                this.context,
                background,
                background.width,
                background.height,
                this.width,
                this.height,
            );
        }

        /*
         * The warped source portrait is clipped to the live face oval.
         * The user's real body/background therefore remain visible while
         * the selected portrait replaces the camera face.
         */
        this.context.drawImage(
            faceLayer,
            0,
            0,
        );

        this.context.restore();
    }

    private drawLiveCameraBackground(): boolean {
        const video = this.cameraSource;

        if (
            !video ||
            video.readyState <
                HTMLMediaElement.HAVE_CURRENT_DATA ||
            video.videoWidth <= 0 ||
            video.videoHeight <= 0
        ) {
            return false;
        }

        drawCover(
            this.context,
            video,
            video.videoWidth,
            video.videoHeight,
            this.width,
            this.height,
        );

        return true;
    }

    private drawExpressionRetargeting(
        context: CanvasRenderingContext2D,
        tracking: AvatarTrackingState,
        destination: (index: number) => Point | null,
    ): void {
        const drawEye = (
            indices: readonly number[],
            blink: number,
            gazeX: number,
            gazeY: number,
        ) => {
            const points = indices
                .map(destination)
                .filter(
                    (point): point is Point =>
                        Boolean(point),
                );

            if (points.length < 6) {
                return;
            }

            const bounds = pointsBounds(points);
            const cx = (bounds.minX + bounds.maxX) * 0.5;
            const cy = (bounds.minY + bounds.maxY) * 0.5;

            if (blink > 0.18) {
                const sample = sampleCanvasColor(
                    this.sourceSurface,
                    cx,
                    cy,
                    this.width,
                    this.height,
                );

                context.save();
                context.globalAlpha =
                    clamp(
                        (blink - 0.18) / 0.62,
                        0,
                        0.9,
                    );

                context.fillStyle = sample;
                context.beginPath();
                context.ellipse(
                    cx,
                    cy,
                    Math.max(
                        2,
                        (bounds.maxX - bounds.minX) *
                            0.5,
                    ),
                    Math.max(
                        1.5,
                        (bounds.maxY - bounds.minY) *
                            0.55,
                    ),
                    0,
                    0,
                    Math.PI * 2,
                );
                context.fill();
                context.restore();
            }

            const gazeMagnitude =
                Math.abs(gazeX) +
                Math.abs(gazeY);

            if (gazeMagnitude > 0.08) {
                const radius = Math.max(
                    1.2,
                    Math.min(
                        bounds.maxX - bounds.minX,
                        bounds.maxY - bounds.minY,
                    ) * 0.07,
                );

                context.save();
                context.globalAlpha = 0.24;
                context.fillStyle =
                    "rgba(255,255,255,0.95)";
                context.beginPath();
                context.arc(
                    cx +
                        gazeX *
                            radius *
                            0.8,
                    cy -
                        gazeY *
                            radius *
                            0.55,
                    radius * 0.18,
                    0,
                    Math.PI * 2,
                );
                context.fill();
                context.restore();
            }
        };

        drawEye(
            LEFT_EYE,
            tracking.eyes.leftBlink,
            tracking.eyes.gazeX,
            tracking.eyes.gazeY,
        );

        drawEye(
            RIGHT_EYE,
            tracking.eyes.rightBlink,
            tracking.eyes.gazeX,
            tracking.eyes.gazeY,
        );

        const mouthPoints = MOUTH
            .map(destination)
            .filter(
                (point): point is Point =>
                    Boolean(point),
            );

        if (
            mouthPoints.length >= 8 &&
            tracking.mouth.open > 0.08
        ) {
            const bounds = pointsBounds(mouthPoints);
            const cx =
                (bounds.minX + bounds.maxX) *
                0.5;
            const cy =
                (bounds.minY + bounds.maxY) *
                0.5;

            const width =
                (bounds.maxX - bounds.minX) *
                (0.72 +
                    tracking.mouth.smile *
                        0.34 -
                    tracking.mouth.pucker *
                        0.22);

            const height =
                (bounds.maxY - bounds.minY) *
                (0.3 +
                    tracking.mouth.open *
                        0.95);

            context.save();
            context.globalAlpha =
                clamp(
                    0.2 +
                        tracking.mouth.open *
                            0.72,
                    0,
                    0.9,
                );
            context.fillStyle =
                "rgba(34,10,14,0.92)";
            context.beginPath();
            context.ellipse(
                cx,
                cy,
                Math.max(2, width * 0.5),
                Math.max(1.5, height * 0.5),
                0,
                0,
                Math.PI * 2,
            );
            context.fill();

            context.globalAlpha = 0.18;
            context.fillStyle =
                "rgba(245,174,180,0.82)";
            context.beginPath();
            context.ellipse(
                cx,
                cy + height * 0.22,
                Math.max(2, width * 0.27),
                Math.max(1, height * 0.12),
                0,
                0,
                Math.PI * 2,
            );
            context.fill();
            context.restore();
        }

        this.drawBrows(
            context,
            tracking,
            destination,
        );
    }

    private drawBrows(
        context: CanvasRenderingContext2D,
        tracking: AvatarTrackingState,
        destination: (index: number) => Point | null,
    ): void {
        const left =
            [70, 63, 105, 66, 107]
                .map(destination)
                .filter(
                    (point): point is Point =>
                        Boolean(point),
                );

        const right =
            [300, 293, 334, 296, 336]
                .map(destination)
                .filter(
                    (point): point is Point =>
                        Boolean(point),
                );

        const strengthLeft =
            clamp(
                tracking.brows.leftInnerUp * 0.45 +
                    tracking.brows.leftOuterUp * 0.55 -
                    tracking.brows.leftDown * 0.7,
                0,
                1,
            );

        const strengthRight =
            clamp(
                tracking.brows.rightInnerUp * 0.45 +
                    tracking.brows.rightOuterUp * 0.55 -
                    tracking.brows.rightDown * 0.7,
                0,
                1,
            );

        drawBrowLift(
            context,
            left,
            strengthLeft,
        );
        drawBrowLift(
            context,
            right,
            strengthRight,
        );
    }
}

async function createImageLandmarker(): Promise<FaceLandmarker> {
    const fileset =
        await FilesetResolver.forVisionTasks(
            MEDIAPIPE_WASM_URL,
        );

    const create = (
        delegate: "GPU" | "CPU",
    ) =>
        FaceLandmarker.createFromOptions(
            fileset,
            {
                baseOptions: {
                    modelAssetPath:
                        FACE_LANDMARKER_MODEL_URL,
                    delegate,
                },
                runningMode: "IMAGE",
                numFaces: 1,
                minFaceDetectionConfidence: 0.5,
                minFacePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5,
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: true,
            },
        );

    try {
        return await create("GPU");
    } catch (error) {
        console.warn(
            "[Miyor Portrait Pro] GPU source analysis failed; using CPU.",
            error,
        );
        return create("CPU");
    }
}

function toPuppetLandmark(
    landmark: NormalizedLandmark,
): PuppetLandmark {
    return {
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
    };
}

function triangulateFace(
    points: readonly PuppetLandmark[],
): readonly Triangle[] {
    if (points.length < 3) {
        return [];
    }

    type Vertex = { x: number; y: number };

    const vertices: Vertex[] = points.map(
        ({ x, y }) => ({ x, y }),
    );

    const superTriangle =
        createSuperTriangle(vertices);

    const working: Vertex[] = [
        ...vertices,
        ...superTriangle,
    ];

    const superStart = vertices.length;

    let triangles: Triangle[] = [
        [
            superStart,
            superStart + 1,
            superStart + 2,
        ],
    ];

    for (
        let pointIndex = 0;
        pointIndex < vertices.length;
        pointIndex += 1
    ) {
        const point = working[pointIndex];

        if (!point) {
            continue;
        }

        const bad: Triangle[] = [];

        for (const triangle of triangles) {
            if (
                pointInCircumcircle(
                    point,
                    triangle,
                    working,
                )
            ) {
                bad.push(triangle);
            }
        }

        const edgeCounts =
            new Map<
                string,
                [number, number, number]
            >();

        for (const triangle of bad) {
            addEdge(
                edgeCounts,
                triangle[0],
                triangle[1],
            );
            addEdge(
                edgeCounts,
                triangle[1],
                triangle[2],
            );
            addEdge(
                edgeCounts,
                triangle[2],
                triangle[0],
            );
        }

        triangles = triangles.filter(
            (triangle) =>
                !bad.includes(triangle),
        );

        for (const edge of edgeCounts.values()) {
            if (edge[2] !== 1) {
                continue;
            }

            triangles.push([
                edge[0],
                edge[1],
                pointIndex,
            ]);
        }
    }

    return triangles.filter(
        ([a, b, c]) =>
            a < superStart &&
            b < superStart &&
            c < superStart,
    );
}

function createSuperTriangle(
    points: readonly Point[],
): Point[] {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    const delta = Math.max(
        maxX - minX,
        maxY - minY,
        1,
    );

    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;

    return [
        {
            x: midX - 20 * delta,
            y: midY - delta,
        },
        {
            x: midX,
            y: midY + 20 * delta,
        },
        {
            x: midX + 20 * delta,
            y: midY - delta,
        },
    ];
}

function pointInCircumcircle(
    point: Point,
    triangle: Triangle,
    vertices: readonly Point[],
): boolean {
    const a = vertices[triangle[0]];
    const b = vertices[triangle[1]];
    const c = vertices[triangle[2]];

    if (!a || !b || !c) {
        return false;
    }

    const ax = a.x - point.x;
    const ay = a.y - point.y;
    const bx = b.x - point.x;
    const by = b.y - point.y;
    const cx = c.x - point.x;
    const cy = c.y - point.y;

    const determinant =
        (ax * ax + ay * ay) *
            (bx * cy - cx * by) -
        (bx * bx + by * by) *
            (ax * cy - cx * ay) +
        (cx * cx + cy * cy) *
            (ax * by - bx * ay);

    const orientation =
        (b.x - a.x) *
            (c.y - a.y) -
        (b.y - a.y) *
            (c.x - a.x);

    return orientation > 0
        ? determinant > 1e-12
        : determinant < -1e-12;
}

function addEdge(
    edges: Map<string, [number, number, number]>,
    a: number,
    b: number,
): void {
    const left = Math.min(a, b);
    const right = Math.max(a, b);
    const key = `${left}:${right}`;
    const current = edges.get(key);

    if (current) {
        current[2] += 1;
        return;
    }

    edges.set(key, [a, b, 1]);
}

function getBounds(
    landmarks: readonly PuppetLandmark[],
): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
} {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    for (const landmark of landmarks) {
        minX = Math.min(minX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxX = Math.max(maxX, landmark.x);
        maxY = Math.max(maxY, landmark.y);
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
    };
}

function pointsBounds(
    points: readonly Point[],
): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
} {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
}

function drawFeatheredFaceMask(
    context: CanvasRenderingContext2D,
    indices: readonly number[],
    landmarks: readonly AvatarLandmark[],
    destination: (index: number) => Point | null,
    width: number,
    height: number,
): void {
    const points = indices
        .map(destination)
        .filter(
            (point): point is Point =>
                Boolean(point),
        );

    if (points.length < 10) {
        return;
    }

    const bounds = pointsBounds(points);
    const centerX =
        (bounds.minX + bounds.maxX) * 0.5;
    const centerY =
        (bounds.minY + bounds.maxY) * 0.5;
    const expansion = 1.025;

    const expandedPoints = points.map(
        (point) => ({
            x:
                centerX +
                (point.x - centerX) *
                    expansion,
            y:
                centerY +
                (point.y - centerY) *
                    expansion,
        }),
    );

    context.save();
    context.clearRect(0, 0, width, height);
    context.fillStyle = "white";
    context.filter = "blur(5px)";
    context.beginPath();

    const first = expandedPoints[0];
    if (!first) {
        context.restore();
        return;
    }

    context.moveTo(first.x, first.y);

    for (
        let i = 1;
        i < expandedPoints.length;
        i += 1
    ) {
        const point = expandedPoints[i];
        if (!point) {
            continue;
        }
        context.lineTo(point.x, point.y);
    }

    context.closePath();
    context.fill();
    context.filter = "none";
    context.restore();
}

function drawBrowLift(
    context: CanvasRenderingContext2D,
    points: readonly Point[],
    strength: number,
): void {
    if (points.length < 3 || strength < 0.04) {
        return;
    }

    const bounds = pointsBounds(points);
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    const cy = (bounds.minY + bounds.maxY) * 0.5;

    context.save();
    context.globalAlpha = 0.12 * strength;
    context.strokeStyle = "rgba(255,255,255,0.85)";
    context.lineWidth = Math.max(
        1,
        (bounds.maxX - bounds.minX) * 0.025,
    );
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(
        bounds.minX,
        cy - strength * 3,
    );
    context.quadraticCurveTo(
        cx,
        bounds.minY - strength * 8,
        bounds.maxX,
        cy - strength * 3,
    );
    context.stroke();
    context.restore();
}

function clamp(
    value: number,
    min: number,
    max: number,
): number {
    return Math.min(max, Math.max(min, value));
}

function createPortraitBackgroundSurface(
    source: HTMLCanvasElement,
    landmarks: readonly PuppetLandmark[],
): HTMLCanvasElement {
    const background =
        document.createElement("canvas");

    background.width = source.width;
    background.height = source.height;

    const context =
        background.getContext("2d", {
            alpha: true,
            desynchronized: true,
        });

    if (!context) {
        throw new Error(
            "Unable to create the portrait background surface.",
        );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0);

    const mask = document.createElement("canvas");
    mask.width = source.width;
    mask.height = source.height;

    const maskContext =
        mask.getContext("2d");

    if (!maskContext) {
        return background;
    }

    const points = FACE_OVAL
        .map((index) => landmarks[index])
        .filter(
            (point): point is PuppetLandmark =>
                Boolean(point),
        );

    if (points.length < 10) {
        return background;
    }

    maskContext.fillStyle = "white";
    maskContext.filter = "blur(24px)";
    maskContext.beginPath();

    const first = points[0];
    if (!first) {
        return background;
    }

    maskContext.moveTo(
        first.x * source.width,
        first.y * source.height,
    );

    for (let i = 1; i < points.length; i += 1) {
        const point = points[i];
        if (!point) {
            continue;
        }

        maskContext.lineTo(
            point.x * source.width,
            point.y * source.height,
        );
    }

    maskContext.closePath();
    maskContext.fill();
    maskContext.filter = "none";

    const blurred =
        document.createElement("canvas");
    blurred.width = source.width;
    blurred.height = source.height;

    const blurredContext =
        blurred.getContext("2d");

    if (!blurredContext) {
        return background;
    }

    blurredContext.filter = "blur(16px)";
    blurredContext.drawImage(source, 0, 0);
    blurredContext.filter = "none";

    blurredContext.save();
    blurredContext.globalCompositeOperation =
        "destination-in";
    blurredContext.drawImage(mask, 0, 0);
    blurredContext.restore();

    context.drawImage(
        blurred,
        0,
        0,
    );

    return background;
}

function createEnhancedSurface(
    image: HTMLImageElement,
    mode: "natural" | "studio" | "off",
): HTMLCanvasElement {
    const maxDimension = 1600;
    const scale = Math.min(
        1,
        maxDimension /
            Math.max(
                image.naturalWidth,
                image.naturalHeight,
            ),
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(
        1,
        Math.round(image.naturalWidth * scale),
    );
    canvas.height = Math.max(
        1,
        Math.round(image.naturalHeight * scale),
    );

    const context = canvas.getContext("2d", {
        alpha: true,
        desynchronized: true,
    });

    if (!context) {
        throw new Error(
            "Unable to create the portrait enhancement surface.",
        );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (mode === "off") {
        context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height,
        );
        return canvas;
    }

    const filter =
        mode === "studio"
            ? "brightness(1.025) contrast(1.035) saturate(1.035)"
            : "brightness(1.01) contrast(1.015) saturate(1.01)";

    context.filter = filter;
    context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height,
    );
    context.filter = "none";

    if (mode === "studio") {
        const glow =
            context.createRadialGradient(
                canvas.width * 0.5,
                canvas.height * 0.32,
                0,
                canvas.width * 0.5,
                canvas.height * 0.32,
                Math.max(
                    canvas.width,
                    canvas.height,
                ) * 0.72,
            );

        glow.addColorStop(
            0,
            "rgba(255,255,255,0.045)",
        );
        glow.addColorStop(
            1,
            "rgba(255,255,255,0)",
        );

        context.fillStyle = glow;
        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height,
        );
    }

    return canvas;
}

function sampleCanvasColor(
    source: HTMLCanvasElement | null,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
): string {
    if (!source) {
        return "rgba(190,155,130,0.94)";
    }

    const context = source.getContext("2d");

    if (!context) {
        return "rgba(190,155,130,0.94)";
    }

    const sx = Math.max(
        0,
        Math.min(
            source.width - 1,
            Math.round(
                (x / Math.max(1, canvasWidth)) *
                    source.width,
            ),
        ),
    );

    const sy = Math.max(
        0,
        Math.min(
            source.height - 1,
            Math.round(
                (y / Math.max(1, canvasHeight)) *
                    source.height,
            ),
        ),
    );

    try {
        const pixel =
            context.getImageData(
                sx,
                sy,
                1,
                1,
            ).data;

        return `rgba(${pixel[0]},${pixel[1]},${pixel[2]},0.94)`;
    } catch {
        return "rgba(190,155,130,0.94)";
    }
}

function drawCover(
    context: CanvasRenderingContext2D,
    image: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    width: number,
    height: number,
): void {
    if (
        sourceWidth <= 0 ||
        sourceHeight <= 0 ||
        width <= 0 ||
        height <= 0
    ) {
        return;
    }

    const imageAspect =
        sourceWidth / sourceHeight;
    const canvasAspect =
        width / height;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspect > canvasAspect) {
        drawHeight = height;
        drawWidth = height * imageAspect;
        offsetX = (width - drawWidth) * 0.5;
        offsetY = 0;
    } else {
        drawWidth = width;
        drawHeight = width / imageAspect;
        offsetX = 0;
        offsetY = (height - drawHeight) * 0.5;
    }

    context.drawImage(
        image,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
    );
}

function drawImageTriangle(
    context: CanvasRenderingContext2D,
    image: CanvasImageSource,
    sourceA: Point,
    sourceB: Point,
    sourceC: Point,
    destA: Point,
    destB: Point,
    destC: Point,
): void {
    const determinant =
        (sourceA.x - sourceC.x) *
            (sourceB.y - sourceC.y) -
        (sourceB.x - sourceC.x) *
            (sourceA.y - sourceC.y);

    if (Math.abs(determinant) < 1e-6) {
        return;
    }

    const a =
        ((destA.x - destC.x) *
            (sourceB.y - sourceC.y) -
            (destB.x - destC.x) *
                (sourceA.y - sourceC.y)) /
        determinant;

    const b =
        ((destA.y - destC.y) *
            (sourceB.y - sourceC.y) -
            (destB.y - destC.y) *
                (sourceA.y - sourceC.y)) /
        determinant;

    const c =
        ((destB.x - destC.x) *
            (sourceA.x - sourceC.x) -
            (destA.x - destC.x) *
                (sourceB.x - sourceC.x)) /
        determinant;

    const d =
        ((destB.y - destC.y) *
            (sourceA.x - sourceC.x) -
            (destA.y - destC.y) *
                (sourceB.x - sourceC.x)) /
        determinant;

    const e =
        destC.x -
        a * sourceC.x -
        c * sourceC.y;

    const f =
        destC.y -
        b * sourceC.x -
        d * sourceC.y;

    context.save();
    context.beginPath();
    context.moveTo(destA.x, destA.y);
    context.lineTo(destB.x, destB.y);
    context.lineTo(destC.x, destC.y);
    context.closePath();
    context.clip();

    context.setTransform(
        a,
        b,
        c,
        d,
        e,
        f,
    );

    context.drawImage(image, 0, 0);
    context.restore();
}

function loadImage(
    source: string,
): Promise<HTMLImageElement> {
    return new Promise(
        (resolve, reject) => {
            const image = new Image();
            image.decoding = "async";

            image.onload = () => resolve(image);
            image.onerror = () =>
                reject(
                    new Error(
                        "Unable to load the portrait image.",
                    ),
                );

            image.src = source;
        },
    );
}
