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

const MEDIAPIPE_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const MAX_RENDER_FPS = 30;
const MIN_RENDER_INTERVAL = 1000 / MAX_RENDER_FPS;

const MIN_TRIANGLE_AREA = 0.000001;
const FACE_PADDING = 0.08;

/**
 * The renderer deliberately uses only x/y/z.
 *
 * MediaPipe's NormalizedLandmark also contains `visibility`, but
 * the avatar renderer does not need that property. Keeping this
 * internal type independent from MediaPipe makes the renderer
 * compatible with AvatarTrackingState.
 */
type PuppetLandmark = Pick<AvatarLandmark, "x" | "y" | "z">;

/**
 * A single portrait is turned into a lightweight 2D facial puppet.
 *
 * Pipeline:
 *
 *   uploaded image
 *        ↓
 *   MediaPipe detects source face once
 *        ↓
 *   source face mesh
 *        ↓
 *   live camera face mesh
 *        ↓
 *   triangle deformation
 *        ↓
 *   canvas.captureStream()
 *        ↓
 *   WebRTC video track
 *
 * The image and facial landmarks remain local to the browser.
 */
export class ImagePuppetRenderer implements AvatarRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private image: HTMLImageElement | null = null;
    private sourceSurface: HTMLCanvasElement | null = null;

    private sourceLandmarks: readonly PuppetLandmark[] = [];

    private triangles: readonly [number, number, number][] = [];

    private disposed = false;

    private lastRenderTime = 0;

    private width = 1;
    private height = 1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        const context = canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
        });

        if (!context) {
            throw new Error(
                "Unable to create a 2D rendering context for the image avatar.",
            );
        }

        this.context = context;

        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = "high";

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
        this.sourceSurface = createEnhancedSurface(image);
        this.sourceLandmarks = [];
        this.triangles = [];
        this.lastRenderTime = 0;

        try {
            const landmarker = await createImageLandmarker();

            if (this.disposed) {
                landmarker.close();
                return;
            }

            const result = landmarker.detect(image);

            landmarker.close();

            const landmarks = result.faceLandmarks?.[0] ?? [];

            if (landmarks.length >= 20) {
                this.sourceLandmarks = landmarks.map(toPuppetLandmark);

                this.triangles = triangulateFace(
                    this.sourceLandmarks,
                );
            }
        } catch (error) {
            console.warn(
                "[Avatar] Image face analysis unavailable; using static portrait fallback.",
                error,
            );
        }

        this.renderStatic();
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
            !tracking.faceDetected ||
            tracking.landmarks.length < 20 ||
            this.sourceLandmarks.length !==
                tracking.landmarks.length ||
            this.triangles.length === 0
        ) {
            this.renderStatic();
            return;
        }

        this.renderPuppet(tracking, tracking.landmarks);
    }

    resize(width: number, height: number): void {
        if (this.disposed) {
            return;
        }

        this.width = Math.max(
            Math.floor(width),
            1,
        );

        this.height = Math.max(
            Math.floor(height),
            1,
        );

        this.canvas.width = this.width;
        this.canvas.height = this.height;

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
        this.sourceSurface = null;
        this.sourceLandmarks = [];
        this.triangles = [];

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

    private renderStatic(): void {
        const image = this.image;
        const surface = this.sourceSurface;

        if (!image || !surface || this.disposed) {
            return;
        }

        this.context.save();

        this.context.setTransform(
            1,
            0,
            0,
            1,
            0,
            0,
        );

        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        drawCover(
            this.context,
            surface,
            surface.width,
            surface.height,
            this.width,
            this.height,
        );

        this.context.restore();
    }

    private renderPuppet(
        tracking: AvatarTrackingState,
        liveLandmarks: readonly AvatarLandmark[],
    ): void {
        const image = this.image;
        const surface = this.sourceSurface;

        if (!image || !surface || this.disposed) {
            return;
        }

        if (
            this.sourceLandmarks.length !==
            liveLandmarks.length
        ) {
            this.renderStatic();
            return;
        }

        const sourceBounds = getBounds(
            this.sourceLandmarks,
        );

        const liveBounds = getBounds(
            liveLandmarks,
        );

        const sourceWidth = Math.max(
            sourceBounds.maxX -
                sourceBounds.minX,
            0.001,
        );

        const sourceHeight = Math.max(
            sourceBounds.maxY -
                sourceBounds.minY,
            0.001,
        );

        const liveWidth = Math.max(
            liveBounds.maxX -
                liveBounds.minX,
            0.001,
        );

        const liveHeight = Math.max(
            liveBounds.maxY -
                liveBounds.minY,
            0.001,
        );

        /*
         * We start with the original image.
         *
         * The facial triangles are then painted on top of it.
         * This gives us a graceful fallback when the live face
         * temporarily loses tracking.
         */
        this.context.save();

        this.context.setTransform(
            1,
            0,
            0,
            1,
            0,
            0,
        );

        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        drawCover(
            this.context,
            surface,
            surface.width,
            surface.height,
            this.width,
            this.height,
        );

        this.context.restore();

        /*
         * Keep the live face centered and preserve a little
         * breathing room around it.
         */
        const paddedMinX = clamp01(
            liveBounds.minX -
                liveWidth * FACE_PADDING,
        );

        const paddedMaxX = clamp01(
            liveBounds.maxX +
                liveWidth * FACE_PADDING,
        );

        const paddedMinY = clamp01(
            liveBounds.minY -
                liveHeight * FACE_PADDING,
        );

        const paddedMaxY = clamp01(
            liveBounds.maxY +
                liveHeight * FACE_PADDING,
        );

        const paddedLiveWidth = Math.max(
            paddedMaxX -
                paddedMinX,
            0.001,
        );

        const paddedLiveHeight = Math.max(
            paddedMaxY -
                paddedMinY,
            0.001,
        );

        const mapSourceToCanvas = (
            landmark: PuppetLandmark,
        ): Point => {
            const u =
                (landmark.x -
                    sourceBounds.minX) /
                sourceWidth;

            const v =
                (landmark.y -
                    sourceBounds.minY) /
                sourceHeight;

            return {
                x:
                    (paddedMinX +
                        u *
                            paddedLiveWidth) *
                    this.width,

                y:
                    (paddedMinY +
                        v *
                            paddedLiveHeight) *
                    this.height,
            };
        };

        const sourceToImage = (
            landmark: PuppetLandmark,
        ): Point => ({
            x: landmark.x * surface.width,
            y: landmark.y * surface.height,
        });

        /*
         * Paint the warped facial triangles.
         */
        for (const [a, b, c] of this.triangles) {
            const sourceA =
                this.sourceLandmarks[a];

            const sourceB =
                this.sourceLandmarks[b];

            const sourceC =
                this.sourceLandmarks[c];

            const liveA =
                liveLandmarks[a];

            const liveB =
                liveLandmarks[b];

            const liveC =
                liveLandmarks[c];

            if (
                !sourceA ||
                !sourceB ||
                !sourceC ||
                !liveA ||
                !liveB ||
                !liveC
            ) {
                continue;
            }

            const sourcePointA =
                sourceToImage(sourceA);

            const sourcePointB =
                sourceToImage(sourceB);

            const sourcePointC =
                sourceToImage(sourceC);

            const destinationA =
                mapSourceToCanvas(liveA);

            const destinationB =
                mapSourceToCanvas(liveB);

            const destinationC =
                mapSourceToCanvas(liveC);

            if (
                Math.abs(
                    triangleArea2(
                        sourcePointA,
                        sourcePointB,
                        sourcePointC,
                    ),
                ) < MIN_TRIANGLE_AREA
            ) {
                continue;
            }

            if (
                Math.abs(
                    triangleArea2(
                        destinationA,
                        destinationB,
                        destinationC,
                    ),
                ) < MIN_TRIANGLE_AREA
            ) {
                continue;
            }

            drawImageTriangle(
                this.context,
                surface,
                sourcePointA,
                sourcePointB,
                sourcePointC,
                destinationA,
                destinationB,
                destinationC,
            );
        }

        this.renderExpressionCorrections(
            tracking,
            liveLandmarks,
        );
    }

    /**
     * Adds small, local expression corrections on top of the mesh.
     *
     * A pure texture warp cannot invent an eyelid that is absent from
     * the source portrait. These corrections close the eyelids and
     * open the mouth using the live MediaPipe blendshape values while
     * keeping the operation entirely local and GPU/canvas friendly.
     */
    private renderExpressionCorrections(
        tracking: AvatarTrackingState,
        liveLandmarks: readonly AvatarLandmark[],
    ): void {
        if (liveLandmarks.length < 478) {
            return;
        }

        this.context.save();

        const leftBlink = tracking.eyes.leftBlink;
        const rightBlink = tracking.eyes.rightBlink;

        drawEyeCorrection(
            this.context,
            liveLandmarks,
            [33, 160, 158, 133, 153, 144],
            leftBlink,
            tracking.eyes.gazeX,
            tracking.eyes.gazeY,
        );

        drawEyeCorrection(
            this.context,
            liveLandmarks,
            [362, 385, 387, 263, 373, 380],
            rightBlink,
            tracking.eyes.gazeX,
            tracking.eyes.gazeY,
        );

        drawMouthCorrection(
            this.context,
            liveLandmarks,
            tracking.mouth.open,
            tracking.mouth.smile,
            tracking.mouth.pucker,
        );

        this.context.restore();
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

                minFaceDetectionConfidence:
                    0.35,

                minFacePresenceConfidence:
                    0.35,

                minTrackingConfidence:
                    0.4,

                outputFaceBlendshapes: false,

                outputFacialTransformationMatrixes:
                    false,
            },
        );

    try {
        return await create("GPU");
    } catch (gpuError) {
        console.warn(
            "[Avatar] GPU image face analysis failed; falling back to CPU.",
            gpuError,
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
): readonly [number, number, number][] {
    if (points.length < 3) {
        return [];
    }

    type Vertex = {
        x: number;
        y: number;
        originalIndex: number;
    };

    type WorkingVertex = {
        x: number;
        y: number;
        originalIndex: number | null;
    };

    type Triangle = [
        number,
        number,
        number,
    ];

    const vertices: Vertex[] = points.map(
        (point, index) => ({
            x: point.x,
            y: point.y,
            originalIndex: index,
        }),
    );

    const superTriangle = createSuperTriangle(
        vertices,
    );

    const working: WorkingVertex[] = [
        ...vertices,
        ...superTriangle.map(
            (point) => ({
                x: point.x,
                y: point.y,
                originalIndex: null,
            }),
        ),
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

        triangles =
            triangles.filter(
                (triangle) =>
                    !bad.includes(
                        triangle,
                    ),
            );

        for (const edge of edgeCounts.values()) {
            if (edge[2] !== 1) {
                continue;
            }

            const [a, b] = edge;

            triangles.push([
                a,
                b,
                pointIndex,
            ]);
        }
    }

    return triangles
        .filter(
            ([a, b, c]) =>
                a < superStart &&
                b < superStart &&
                c < superStart,
        )
        .map(
            ([a, b, c]) => [
                a,
                b,
                c,
            ],
        );
}

function createSuperTriangle(
    points: readonly {
        x: number;
        y: number;
    }[],
): {
    x: number;
    y: number;
}[] {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
        minX = Math.min(
            minX,
            point.x,
        );

        minY = Math.min(
            minY,
            point.y,
        );

        maxX = Math.max(
            maxX,
            point.x,
        );

        maxY = Math.max(
            maxY,
            point.y,
        );
    }

    const dx = maxX - minX;
    const dy = maxY - minY;

    const delta = Math.max(
        dx,
        dy,
        1,
    );

    const midX =
        (minX + maxX) / 2;

    const midY =
        (minY + maxY) / 2;

    return [
        {
            x:
                midX -
                20 * delta,
            y:
                midY -
                delta,
        },

        {
            x: midX,

            y:
                midY +
                20 * delta,
        },

        {
            x:
                midX +
                20 * delta,

            y:
                midY -
                delta,
        },
    ];
}

function pointInCircumcircle(
    point: {
        x: number;
        y: number;
    },

    triangle: [
        number,
        number,
        number,
    ],

    vertices: readonly {
        x: number;
        y: number;
    }[],
): boolean {
    const a =
        vertices[triangle[0]];

    const b =
        vertices[triangle[1]];

    const c =
        vertices[triangle[2]];

    if (!a || !b || !c) {
        return false;
    }

    const ax =
        a.x - point.x;

    const ay =
        a.y - point.y;

    const bx =
        b.x - point.x;

    const by =
        b.y - point.y;

    const cx =
        c.x - point.x;

    const cy =
        c.y - point.y;

    const determinant =
        (ax * ax +
            ay * ay) *
            (bx * cy -
                cx * by) -

        (bx * bx +
            by * by) *
            (ax * cy -
                cx * ay) +

        (cx * cx +
            cy * cy) *
            (ax * by -
                bx * ay);

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
    edges: Map<
        string,
        [number, number, number]
    >,

    a: number,
    b: number,
): void {
    const left = Math.min(a, b);
    const right = Math.max(a, b);

    const key =
        `${left}:${right}`;

    const current =
        edges.get(key);

    if (current) {
        current[2] += 1;
        return;
    }

    edges.set(
        key,
        [a, b, 1],
    );
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
        minX = Math.min(
            minX,
            landmark.x,
        );

        minY = Math.min(
            minY,
            landmark.y,
        );

        maxX = Math.max(
            maxX,
            landmark.x,
        );

        maxY = Math.max(
            maxY,
            landmark.y,
        );
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
    };
}

function createEnhancedSurface(
    image: HTMLImageElement,
): HTMLCanvasElement {
    const maxDimension = 1600;
    const scale = Math.min(
        1,
        maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d", {
        alpha: true,
        desynchronized: true,
    });

    if (!context) {
        throw new Error("Unable to create the portrait enhancement surface.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.filter = "brightness(1.02) contrast(1.04) saturate(1.05)";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.filter = "none";

    // Very subtle studio-light lift. It improves flat phone portraits
    // without replacing the user's appearance with an AI-generated face.
    const glow = context.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.34,
        0,
        canvas.width * 0.5,
        canvas.height * 0.34,
        Math.max(canvas.width, canvas.height) * 0.65,
    );
    glow.addColorStop(0, "rgba(255,255,255,0.055)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
}

function sampleCanvasColor(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
): string {

    try {
        const pixel = context.getImageData(x, y, 1, 1).data;
        return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, 0.94)`;
    } catch {
        return "rgba(190, 155, 130, 0.94)";
    }
}

function drawEyeCorrection(
    context: CanvasRenderingContext2D,
    landmarks: readonly AvatarLandmark[],
    indices: readonly number[],
    blink: number,
    gazeX: number,
    gazeY: number,
): void {
    const points = indices
        .map((index) => landmarks[index])
        .filter((point): point is AvatarLandmark => Boolean(point));

    if (points.length < 6) {
        return;
    }

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));

    // This correction is deliberately conservative. The underlying
    // 478-point mesh does the majority of the eye motion.
    if (blink > 0.18) {
        const alpha = Math.min(0.9, (blink - 0.18) / 0.7);
        const centerX = (minX + maxX) * 0.5 * context.canvas.width;
        const centerY = (minY + maxY) * 0.5 * context.canvas.height;
        const width = (maxX - minX) * context.canvas.width * 0.96;
        const height = Math.max(
            (maxY - minY) * context.canvas.height * 1.4,
            3,
        );

        context.save();
        context.globalAlpha = alpha;
        const sampleY = Math.max(0, Math.round((minY - (maxY - minY) * 0.18) * context.canvas.height));
        const sampleX = Math.round(((minX + maxX) * 0.5) * context.canvas.width);
        context.fillStyle = sampleCanvasColor(context, sampleX, sampleY);
        context.beginPath();
        context.ellipse(centerX, centerY, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
    } else if (Math.abs(gazeX) > 0.08 || Math.abs(gazeY) > 0.08) {
        // Small catchlight/gaze cue. The real iris texture remains supplied
        // by the facial mesh, while this makes gaze changes easier to perceive.
        const centerX = (minX + maxX) * 0.5 * context.canvas.width;
        const centerY = (minY + maxY) * 0.5 * context.canvas.height;
        const radius = Math.max(
            1.2,
            Math.min(maxX - minX, maxY - minY) * context.canvas.width * 0.06,
        );
        const dx = gazeX * radius * 0.7;
        const dy = -gazeY * radius * 0.45;

        context.save();
        context.globalAlpha = 0.28;
        context.fillStyle = "rgba(255,255,255,0.9)";
        context.beginPath();
        context.arc(centerX + dx, centerY + dy, radius * 0.18, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

function drawMouthCorrection(
    context: CanvasRenderingContext2D,
    landmarks: readonly AvatarLandmark[],
    mouthOpen: number,
    smile: number,
    pucker: number,
): void {
    const indices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
    const points = indices
        .map((index) => landmarks[index])
        .filter((point): point is AvatarLandmark => Boolean(point));

    if (points.length < 8 || mouthOpen < 0.12) {
        return;
    }

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));

    const cx = (minX + maxX) * 0.5 * context.canvas.width;
    const cy = (minY + maxY) * 0.5 * context.canvas.height;
    const width = (maxX - minX) * context.canvas.width;
    const height = (maxY - minY) * context.canvas.height;
    const openHeight = height * (0.22 + mouthOpen * 0.72);
    const widthScale = 0.72 + smile * 0.32 - pucker * 0.24;

    context.save();
    context.globalAlpha = Math.min(0.88, 0.18 + mouthOpen * 0.75);
    context.fillStyle = "rgba(38, 13, 17, 0.92)";
    context.beginPath();
    context.ellipse(
        cx,
        cy + height * 0.05,
        Math.max(2, width * 0.5 * widthScale),
        Math.max(1.5, openHeight * 0.5),
        0,
        0,
        Math.PI * 2,
    );
    context.fill();

    // A small lower-lip highlight keeps the mouth from looking like a flat hole.
    context.globalAlpha = 0.18 + mouthOpen * 0.15;
    context.fillStyle = "rgba(238, 176, 177, 0.75)";
    context.beginPath();
    context.ellipse(
        cx,
        cy + openHeight * 0.25,
        Math.max(2, width * 0.28),
        Math.max(1, openHeight * 0.12),
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Draw an image using object-fit: cover semantics.
 *
 * This was missing from the original implementation, which caused
 * the second TypeScript error.
 */
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
        sourceWidth /
        sourceHeight;

    const canvasAspect =
        width / height;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspect > canvasAspect) {
        /*
         * Image is wider than the canvas.
         * Fit height and crop left/right.
         */
        drawHeight = height;
        drawWidth =
            height * imageAspect;

        offsetX =
            (width - drawWidth) / 2;

        offsetY = 0;
    } else {
        /*
         * Image is taller than the canvas.
         * Fit width and crop top/bottom.
         */
        drawWidth = width;
        drawHeight =
            width / imageAspect;

        offsetX = 0;

        offsetY =
            (height - drawHeight) / 2;
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

    if (
        Math.abs(determinant) <
        1e-6
    ) {
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

    context.moveTo(
        destA.x,
        destA.y,
    );

    context.lineTo(
        destB.x,
        destB.y,
    );

    context.lineTo(
        destC.x,
        destC.y,
    );

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

    context.drawImage(
        image,
        0,
        0,
    );

    context.restore();
}

type Point = {
    x: number;
    y: number;
};

function triangleArea2(
    a: Point,
    b: Point,
    c: Point,
): number {
    return (
        (b.x - a.x) *
            (c.y - a.y) -
        (b.y - a.y) *
            (c.x - a.x)
    );
}

function clamp01(
    value: number,
): number {
    return Math.min(
        1,
        Math.max(0, value),
    );
}

function loadImage(
    source: string,
): Promise<HTMLImageElement> {
    return new Promise(
        (resolve, reject) => {
            const image =
                new Image();

            image.decoding =
                "async";

            image.onload = () =>
                resolve(image);

            image.onerror = () =>
                reject(
                    new Error(
                        `Failed to load avatar image: ${source}`,
                    ),
                );

            image.src = source;
        },
    );
}