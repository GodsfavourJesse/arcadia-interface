"use client";

import {
    FaceLandmarker,
    FilesetResolver,
    type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import type { FaceTrackingState } from "@/app/types/face/face-tracking.types";

import type { AvatarRendererDiagnostics } from "@/app/types/avatar/avatar-renderer.types";

import {
    getAvatarFaceBounds,
    getAvatarLandmarks,
} from "./avatar-face-adapter";

const MEDIAPIPE_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const MAX_RENDER_FPS = 30;

const MIN_RENDER_INTERVAL =
    1000 / MAX_RENDER_FPS;

const MIN_TRIANGLE_AREA = 0.000001;

type Point = {
    x: number;
    y: number;
};

type Landmark = {
    x: number;
    y: number;
    z: number;
};

type Triangle = [
    number,
    number,
    number,
];

type ImageTransform = {
    scale: number;
    offsetX: number;
    offsetY: number;
};

export class AvatarImageRenderer {
    private readonly canvas: HTMLCanvasElement;

    private readonly context: CanvasRenderingContext2D;

    private image: HTMLImageElement | null = null;

    /**
     * Landmarks detected on the uploaded avatar image.
     *
     * These never change after avatar analysis.
     */
    private sourceLandmarks: Landmark[] = [];

    /**
     * Triangulation generated from sourceLandmarks.
     */
    private triangles: Triangle[] = [];

    /** Temporal filter reduces landmark jitter without server latency. */
    private smoothedLiveLandmarks: Point[] = [];

    private trackingWasLost = true;

    private disposed = false;

    private initialized = false;

    private framesRendered = 0;

    private lastFrameTimestamp = 0;

    private lastRenderTime = 0;

    private width = 1;

    private height = 1;

    private diagnostics: AvatarRendererDiagnostics = {
        initialized: false,
        imageLoaded: false,
        imageWidth: 0,
        imageHeight: 0,

        framesRendered: 0,
        lastFrameTimestamp: 0,

        faceDetected: false,

        faceX: 0,
        faceY: 0,

        faceWidth: 0,
        faceHeight: 0,

        puppetReady: false,

        sourceLandmarks: 0,

        triangles: 0,

        leftEyeMovement: 0,
        rightEyeMovement: 0,

        leftEyebrowMovement: 0,
        rightEyebrowMovement: 0,

        mouthOpenness: 0,
        mouthWidth: 0,
        mouthSmile: 0,

        headYaw: 0,
        headPitch: 0,
        headRoll: 0,
    };

    constructor(
        canvas: HTMLCanvasElement,
        width: number,
        height: number,
    ) {
        this.canvas = canvas;

        const context =
            canvas.getContext(
                "2d",
                {
                    alpha: false,
                    desynchronized: true,
                },
            );

        if (!context) {
            throw new Error(
                "Unable to create avatar canvas context.",
            );
        }

        this.context = context;

        this.context.imageSmoothingEnabled =
            true;

        this.context.imageSmoothingQuality =
            "high";

        this.resize(
            width,
            height,
        );
    }

    async initialize(
        imageUrl: string,
    ): Promise<void> {
        if (this.disposed) {
            throw new Error(
                "Avatar renderer has been disposed.",
            );
        }

        if (!imageUrl) {
            throw new Error(
                "Avatar image URL is required.",
            );
        }

        this.disposeImage();

        this.sourceLandmarks = [];

        this.triangles = [];

        this.smoothedLiveLandmarks = [];

        this.trackingWasLost = true;


        this.framesRendered = 0;

        this.lastFrameTimestamp = 0;

        this.lastRenderTime = 0;

        const image =
            await loadImage(
                imageUrl,
            );

        if (this.disposed) {
            return;
        }

        if (
            image.naturalWidth <= 0 ||
            image.naturalHeight <= 0
        ) {
            throw new Error(
                "Avatar image has invalid dimensions.",
            );
        }

        this.image = image;

        this.initialized = false;

        this.diagnostics = {
            ...this.diagnostics,

            initialized: false,

            imageLoaded: true,

            imageWidth:
                image.naturalWidth,

            imageHeight:
                image.naturalHeight,

            framesRendered: 0,

            lastFrameTimestamp: 0,

            faceDetected: false,

            faceX: 0,
            faceY: 0,

            faceWidth: 0,
            faceHeight: 0,

            puppetReady: false,

            sourceLandmarks: 0,

            triangles: 0,
        };

        await this.analyzeAvatarFace();

        if (this.disposed) {
            return;
        }

        this.initialized =
            this.sourceLandmarks.length >= 3 &&
            this.triangles.length > 0;

        if (!this.initialized) {
            throw new Error(
                "Unable to create a usable avatar face mesh.",
            );
        }

        this.diagnostics = {
            ...this.diagnostics,

            initialized: true,

            puppetReady: true,

            sourceLandmarks:
                this.sourceLandmarks.length,

            triangles:
                this.triangles.length,
        };

    }

    render(
        tracking:
            FaceTrackingState | null,

        timestamp:
            number,
    ): boolean {
        if (
            this.disposed ||
            !this.image ||
            !this.initialized
        ) {
            return false;
        }

        const now =
            performance.now();

        if (
            this.lastRenderTime > 0 &&
            now -
                this.lastRenderTime <
                MIN_RENDER_INTERVAL
        ) {
            return true;
        }

        this.lastRenderTime = now;

        this.framesRendered += 1;

        this.lastFrameTimestamp =
            timestamp;

        this.diagnostics = {
            ...this.diagnostics,

            framesRendered:
                this.framesRendered,

            lastFrameTimestamp:
                this.lastFrameTimestamp,
        };

        if (
            !tracking?.detected ||
            tracking.landmarks.length <
                3 ||
            tracking.landmarks.length !==
                this.sourceLandmarks.length ||
            this.triangles.length === 0
        ) {
            this.trackingWasLost = true;
            this.diagnostics = {
                ...this.diagnostics,

                faceDetected: false,
            };
            return true;
        }

        this.updateDiagnostics(
            tracking,
        );

        this.renderPuppet(
            tracking,
        );

        return true;
    }

    resize(
        width: number,
        height: number,
    ): void {
        this.width =
            Math.max(
                Math.floor(width),
                1,
            );

        this.height =
            Math.max(
                Math.floor(height),
                1,
            );

        this.canvas.width =
            this.width;

        this.canvas.height =
            this.height;

        this.context.imageSmoothingEnabled =
            true;

        this.context.imageSmoothingQuality =
            "high";
    }

    getDiagnostics():
        AvatarRendererDiagnostics {
        return {
            ...this.diagnostics,
        };
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        this.disposeImage();

        this.sourceLandmarks = [];

        this.triangles = [];

        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );

        this.initialized = false;

        this.diagnostics = {
            ...this.diagnostics,

            initialized: false,

            imageLoaded: false,

            puppetReady: false,

            sourceLandmarks: 0,

            triangles: 0,
        };
    }

    /**
     * Analyze the uploaded avatar image once.
     *
     * IMPORTANT:
     *
     * This is IMAGE mode only.
     *
     * There is deliberately no detectForVideo()
     * or live MediaPipe loop here.
     */
    private async analyzeAvatarFace():
        Promise<void> {
        const image = this.image;

        if (!image) {
            return;
        }

        const landmarker =
            await createImageLandmarker();

        try {
            const result =
                landmarker.detect(
                    image,
                );

            const landmarks =
                result.faceLandmarks?.[0] ??
                [];

            if (
                landmarks.length <
                3
            ) {
                throw new Error(
                    "No usable face was detected in the avatar image.",
                );
            }

            this.sourceLandmarks =
                landmarks.map(
                    toLandmark,
                );

            this.triangles =
                triangulateFace(
                    this.sourceLandmarks,
                );
        } finally {
            landmarker.close();
        }
    }

    private renderStatic(): void {
        const image = this.image;

        if (
            !image ||
            this.disposed
        ) {
            return;
        }

        this.context.save();

        resetContext(
            this.context,
        );

        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        drawCover(
            this.context,
            image,
            this.width,
            this.height,
        );

        this.context.restore();
    }

    /** Warp only the uploaded face mesh onto the live camera landmarks. */
    private renderPuppet(
        tracking: FaceTrackingState,
    ): void {
        const image = this.image;

        if (!image) {
            return;
        }

        const liveLandmarks =
            getAvatarLandmarks(
                tracking,
            );

        if (
            liveLandmarks.length !==
            this.sourceLandmarks.length
        ) {
            return;
        }

        const sourceToImage = (landmark: Landmark): Point => ({
            x: landmark.x * image.naturalWidth,
            y: landmark.y * image.naturalHeight,
        });
        const destinationLandmarks: Point[] = liveLandmarks.map((landmark, index) => {
            const target = {
                x: landmark.x * this.width,
                y: landmark.y * this.height,
            };
            const previous = this.smoothedLiveLandmarks[index];
            const smoothing = this.trackingWasLost || !previous ? 1 : 0.58;
            const next = previous
                ? {
                      x: previous.x + (target.x - previous.x) * smoothing,
                      y: previous.y + (target.y - previous.y) * smoothing,
                  }
                : target;

            this.smoothedLiveLandmarks[index] = next;
            return next;
        });
        this.trackingWasLost = false;
        const imageTransform: ImageTransform = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
        };

        // Each source triangle is clipped and warped to the matching live
        // landmarks, leaving the camera visible everywhere outside the face.
        this.context.save();

        for (
            const triangle of
                this.triangles
        ) {
            const [
                indexA,
                indexB,
                indexC,
            ] = triangle;

            const sourceA =
                this.sourceLandmarks[
                    indexA
                ];

            const sourceB =
                this.sourceLandmarks[
                    indexB
                ];

            const sourceC =
                this.sourceLandmarks[
                    indexC
                ];

            const destinationA =
                destinationLandmarks[
                    indexA
                ];

            const destinationB =
                destinationLandmarks[
                    indexB
                ];

            const destinationC =
                destinationLandmarks[
                    indexC
                ];

            if (
                !sourceA ||
                !sourceB ||
                !sourceC ||
                !destinationA ||
                !destinationB ||
                !destinationC
            ) {
                continue;
            }

            const sourcePointA =
                sourceToImage(
                    sourceA,
                );

            const sourcePointB =
                sourceToImage(
                    sourceB,
                );

            const sourcePointC =
                sourceToImage(
                    sourceC,
                );

            if (
                Math.abs(
                    triangleArea(
                        sourcePointA,
                        sourcePointB,
                        sourcePointC,
                    ),
                ) <
                MIN_TRIANGLE_AREA
            ) {
                continue;
            }

            if (
                Math.abs(
                    triangleArea(
                        destinationA,
                        destinationB,
                        destinationC,
                    ),
                ) <
                MIN_TRIANGLE_AREA
            ) {
                continue;
            }

            drawImageTriangleFromCanvas(
                this.context,

                image,

                sourcePointA,
                sourcePointB,
                sourcePointC,

                destinationA,
                destinationB,
                destinationC,

                imageTransform,
            );
        }

        this.context.restore();
    }

    private updateDiagnostics(
        tracking:
            FaceTrackingState,
    ): void {
        const bounds =
            getAvatarFaceBounds(
                tracking,
            );

        this.diagnostics = {
            ...this.diagnostics,

            faceDetected:
                tracking.detected,

            faceX:
                bounds?.x ?? 0,

            faceY:
                bounds?.y ?? 0,

            faceWidth:
                bounds?.width ?? 0,

            faceHeight:
                bounds?.height ?? 0,

            leftEyeMovement:
                tracking.eyes.left,

            rightEyeMovement:
                tracking.eyes.right,

            leftEyebrowMovement:
                tracking.eyebrows.left,

            rightEyebrowMovement:
                tracking.eyebrows.right,

            mouthOpenness:
                tracking.mouth.openness,

            mouthWidth:
                tracking.mouth.width,

            mouthSmile:
                tracking.mouth.smile,

            headYaw:
                tracking.rotation.yaw,

            headPitch:
                tracking.rotation.pitch,

            headRoll:
                tracking.rotation.roll,
        };
    }

    private disposeImage(): void {
        if (this.image) {
            this.image.onload = null;

            this.image.onerror = null;
        }

        this.image = null;
    }
}

async function loadImage(
    imageUrl: string,
): Promise<HTMLImageElement> {
    return new Promise(
        (
            resolve,
            reject,
        ) => {
            const image =
                new Image();

            image.decoding =
                "async";

            if (
                !imageUrl.startsWith(
                    "/",
                ) &&
                !imageUrl.startsWith(
                    "blob:",
                ) &&
                !imageUrl.startsWith(
                    "data:",
                )
            ) {
                image.crossOrigin =
                    "anonymous";
            }

            image.onload =
                () => {
                    resolve(
                        image,
                    );
                };

            image.onerror =
                () => {
                    reject(
                        new Error(
                            "Unable to load avatar image.",
                        ),
                    );
                };

            image.src =
                imageUrl;
        },
    );
}

async function createImageLandmarker():
    Promise<FaceLandmarker> {
    const fileset =
        await FilesetResolver.forVisionTasks(
            MEDIAPIPE_WASM_URL,
        );

    try {
        return await FaceLandmarker.createFromOptions(
            fileset,
            {
                baseOptions: {
                    modelAssetPath:
                        FACE_LANDMARKER_MODEL_URL,

                    delegate:
                        "GPU",
                },

                runningMode:
                    "IMAGE",

                numFaces: 1,

                minFaceDetectionConfidence:
                    0.35,

                minFacePresenceConfidence:
                    0.35,

                minTrackingConfidence:
                    0.4,

                outputFaceBlendshapes:
                    false,

                outputFacialTransformationMatrixes:
                    false,
            },
        );
    } catch {
        return FaceLandmarker.createFromOptions(
            fileset,
            {
                baseOptions: {
                    modelAssetPath:
                        FACE_LANDMARKER_MODEL_URL,

                    delegate:
                        "CPU",
                },

                runningMode:
                    "IMAGE",

                numFaces: 1,

                minFaceDetectionConfidence:
                    0.35,

                minFacePresenceConfidence:
                    0.35,

                minTrackingConfidence:
                    0.4,

                outputFaceBlendshapes:
                    false,

                outputFacialTransformationMatrixes:
                    false,
            },
        );
    }
}

function toLandmark(
    landmark:
        NormalizedLandmark,
): Landmark {
    return {
        x:
            clamp01(
                landmark.x,
            ),

        y:
            clamp01(
                landmark.y,
            ),

        z:
            Number.isFinite(
                landmark.z,
            )
                ? landmark.z
                : 0,
    };
}

function clamp01(
    value: number,
): number {
    return Math.min(
        Math.max(
            value,
            0,
        ),
        1,
    );
}

function triangleArea(
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

function resetContext(
    context:
        CanvasRenderingContext2D,
): void {
    context.setTransform(
        1,
        0,
        0,
        1,
        0,
        0,
    );

    context.globalAlpha =
        1;

    context.globalCompositeOperation =
        "source-over";
}

/**
 * Cover transform used by the original avatar image.
 */
function getCoverTransform(
    image: HTMLImageElement,
    width: number,
    height: number,
): ImageTransform {
    const scale =
        Math.max(
            width /
                image.naturalWidth,

            height /
                image.naturalHeight,
        );

    const drawWidth =
        image.naturalWidth *
        scale;

    const drawHeight =
        image.naturalHeight *
        scale;

    return {
        scale,

        offsetX:
            (
                width -
                drawWidth
            ) /
            2,

        offsetY:
            (
                height -
                drawHeight
            ) /
            2,
    };
}

function drawCover(
    context:
        CanvasRenderingContext2D,

    image:
        HTMLImageElement,

    width:
        number,

    height:
        number,
): void {
    const transform =
        getCoverTransform(
            image,
            width,
            height,
        );

    context.drawImage(
        image,

        transform.offsetX,

        transform.offsetY,

        image.naturalWidth *
            transform.scale,

        image.naturalHeight *
            transform.scale,
    );
}

/**
 * Draw an image triangle where the source and
 * destination coordinates are both in canvas space.
 *
 * The source triangle corresponds to the same region
 * already drawn by drawCover().
 *
 * We convert canvas-space source coordinates back into
 * image-space coordinates before applying the affine
 * transform to the source image.
 */
function drawImageTriangleFromCanvas(
    context:
        CanvasRenderingContext2D,

    image:
        HTMLImageElement,

    sourceA:
        Point,

    sourceB:
        Point,

    sourceC:
        Point,

    destinationA:
        Point,

    destinationB:
        Point,

    destinationC:
        Point,

    imageTransform:
        ImageTransform,
): void {
    const scale =
        imageTransform.scale;

    if (
        scale <= 0
    ) {
        return;
    }

    const sourceImageA: Point = {
        x:
            (
                sourceA.x -
                imageTransform.offsetX
            ) /
            scale,

        y:
            (
                sourceA.y -
                imageTransform.offsetY
            ) /
            scale,
    };

    const sourceImageB: Point = {
        x:
            (
                sourceB.x -
                imageTransform.offsetX
            ) /
            scale,

        y:
            (
                sourceB.y -
                imageTransform.offsetY
            ) /
            scale,
    };

    const sourceImageC: Point = {
        x:
            (
                sourceC.x -
                imageTransform.offsetX
            ) /
            scale,

        y:
            (
                sourceC.y -
                imageTransform.offsetY
            ) /
            scale,
    };

    const denominator =
        sourceImageA.x *
            (
                sourceImageB.y -
                sourceImageC.y
            ) +
        sourceImageB.x *
            (
                sourceImageC.y -
                sourceImageA.y
            ) +
        sourceImageC.x *
            (
                sourceImageA.y -
                sourceImageB.y
            );

    if (
        Math.abs(
            denominator,
        ) <
        MIN_TRIANGLE_AREA
    ) {
        return;
    }

    const a =
        (
            destinationA.x *
                (
                    sourceImageB.y -
                    sourceImageC.y
                ) +
            destinationB.x *
                (
                    sourceImageC.y -
                    sourceImageA.y
                ) +
            destinationC.x *
                (
                    sourceImageA.y -
                    sourceImageB.y
                )
        ) /
        denominator;

    const b =
        (
            destinationA.y *
                (
                    sourceImageB.y -
                    sourceImageC.y
                ) +
            destinationB.y *
                (
                    sourceImageC.y -
                    sourceImageA.y
                ) +
            destinationC.y *
                (
                    sourceImageA.y -
                    sourceImageB.y
                )
        ) /
        denominator;

    const c =
        (
            destinationA.x *
                (
                    sourceImageC.x -
                    sourceImageB.x
                ) +
            destinationB.x *
                (
                    sourceImageA.x -
                    sourceImageC.x
                ) +
            destinationC.x *
                (
                    sourceImageB.x -
                    sourceImageA.x
                )
        ) /
        denominator;

    const d =
        (
            destinationA.y *
                (
                    sourceImageC.x -
                    sourceImageB.x
                ) +
            destinationB.y *
                (
                    sourceImageA.x -
                    sourceImageC.x
                ) +
            destinationC.y *
                (
                    sourceImageB.x -
                    sourceImageA.x
                )
        ) /
        denominator;

    const e =
        (
            destinationA.x *
                (
                    sourceImageB.x *
                        sourceImageC.y -
                    sourceImageC.x *
                        sourceImageB.y
                ) +
            destinationB.x *
                (
                    sourceImageC.x *
                        sourceImageA.y -
                    sourceImageA.x *
                        sourceImageC.y
                ) +
            destinationC.x *
                (
                    sourceImageA.x *
                        sourceImageB.y -
                    sourceImageB.x *
                        sourceImageA.y
                )
        ) /
        denominator;

    const f =
        (
            destinationA.y *
                (
                    sourceImageB.x *
                        sourceImageC.y -
                    sourceImageC.x *
                        sourceImageB.y
                ) +
            destinationB.y *
                (
                    sourceImageC.x *
                        sourceImageA.y -
                    sourceImageA.x *
                        sourceImageC.y
                ) +
            destinationC.y *
                (
                    sourceImageA.x *
                        sourceImageB.y -
                    sourceImageB.x *
                        sourceImageA.y
                )
        ) /
        denominator;

    context.save();

    context.beginPath();

    context.moveTo(
        destinationA.x,
        destinationA.y,
    );

    context.lineTo(
        destinationB.x,
        destinationB.y,
    );

    context.lineTo(
        destinationC.x,
        destinationC.y,
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

/**
 * Delaunay-style Bowyer-Watson triangulation.
 *
 * The circumcircle test is orientation-aware so that
 * triangles with either winding direction are handled
 * correctly.
 */
function triangulateFace(
    points:
        readonly Landmark[],
): Triangle[] {
    if (
        points.length <
        3
    ) {
        return [];
    }

    type Vertex = {
        x: number;
        y: number;
        index: number;
    };

    type WorkingTriangle = [
        number,
        number,
        number,
    ];

    const vertices:
        Vertex[] =
        points.map(
            (
                point,
                index,
            ) => ({
                x:
                    point.x,

                y:
                    point.y,

                index,
            }),
        );

    const superTriangle =
        createSuperTriangle(
            vertices,
        );

    const superVertices =
        superTriangle.map(
            (
                vertex,
                index,
            ) => ({
                x:
                    vertex.x,

                y:
                    vertex.y,

                index:
                    vertices.length +
                    index,
            }),
        );

    const allVertices:
        Vertex[] = [
        ...vertices,
        ...superVertices,
    ];

    const superStart =
        vertices.length;

    let triangles:
        WorkingTriangle[] = [
        [
            superStart,
            superStart + 1,
            superStart + 2,
        ],
    ];

    for (
        let index = 0;
        index <
        vertices.length;
        index += 1
    ) {
        const point =
            allVertices[index]!;

        const bad:
            WorkingTriangle[] =
            [];

        for (
            const triangle of
                triangles
        ) {
            const a =
                allVertices[
                    triangle[0]
                ]!;

            const b =
                allVertices[
                    triangle[1]
                ]!;

            const c =
                allVertices[
                    triangle[2]
                ]!;

            if (
                pointInCircumcircle(
                    point,
                    a,
                    b,
                    c,
                )
            ) {
                bad.push(
                    triangle,
                );
            }
        }

        const edgeCount =
            new Map<
                string,
                {
                    a: number;
                    b: number;
                    count: number;
                }
            >();

        for (
            const triangle of
                bad
        ) {
            const edges:
                [
                    number,
                    number,
                ][] = [
                [
                    triangle[0],
                    triangle[1],
                ],
                [
                    triangle[1],
                    triangle[2],
                ],
                [
                    triangle[2],
                    triangle[0],
                ],
            ];

            for (
                const [a, b] of
                    edges
            ) {
                const min =
                    Math.min(
                        a,
                        b,
                    );

                const max =
                    Math.max(
                        a,
                        b,
                    );

                const key =
                    `${min}:${max}`;

                const existing =
                    edgeCount.get(
                        key,
                    );

                if (existing) {
                    existing.count +=
                        1;
                } else {
                    edgeCount.set(
                        key,
                        {
                            a: min,
                            b: max,
                            count: 1,
                        },
                    );
                }
            }
        }

        triangles =
            triangles.filter(
                (
                    triangle,
                ) =>
                    !bad.includes(
                        triangle,
                    ),
            );

        for (
            const edge of
                edgeCount.values()
        ) {
            if (
                edge.count !==
                1
            ) {
                continue;
            }

            triangles.push([
                edge.a,
                edge.b,
                index,
            ]);
        }
    }

    return triangles
        .filter(
            (
                triangle,
            ) =>
                triangle.every(
                    (
                        index,
                    ) =>
                        index <
                        vertices.length,
                ),
        )
        .filter(
            (
                [
                    a,
                    b,
                    c,
                ],
            ) =>
                Math.abs(
                    triangleArea(
                        points[a]!,
                        points[b]!,
                        points[c]!,
                    ),
                ) >
                MIN_TRIANGLE_AREA,
        );
}

function createSuperTriangle(
    points:
        readonly {
            x: number;
            y: number;
        }[],
): {
    x: number;
    y: number;
}[] {
    let minX =
        points[0]?.x ??
        0;

    let minY =
        points[0]?.y ??
        0;

    let maxX =
        minX;

    let maxY =
        minY;

    for (
        const point of
            points
    ) {
        minX =
            Math.min(
                minX,
                point.x,
            );

        minY =
            Math.min(
                minY,
                point.y,
            );

        maxX =
            Math.max(
                maxX,
                point.x,
            );

        maxY =
            Math.max(
                maxY,
                point.y,
            );
    }

    const width =
        Math.max(
            maxX - minX,
            0.001,
        );

    const height =
        Math.max(
            maxY - minY,
            0.001,
        );

    const padding =
        Math.max(
            width,
            height,
        ) *
        10;

    const centerX =
        (
            minX +
            maxX
        ) /
        2;

    const centerY =
        (
            minY +
            maxY
        ) /
        2;

    return [
        {
            x:
                centerX -
                padding,

            y:
                centerY -
                padding,
        },

        {
            x:
                centerX,

            y:
                centerY +
                padding,
        },

        {
            x:
                centerX +
                padding,

            y:
                centerY -
                padding,
        },
    ];
}

function pointInCircumcircle(
    point: {
        x: number;
        y: number;
    },

    a: {
        x: number;
        y: number;
    },

    b: {
        x: number;
        y: number;
    },

    c: {
        x: number;
        y: number;
    },
): boolean {
    const ax =
        a.x -
        point.x;

    const ay =
        a.y -
        point.y;

    const bx =
        b.x -
        point.x;

    const by =
        b.y -
        point.y;

    const cx =
        c.x -
        point.x;

    const cy =
        c.y -
        point.y;

    const determinant =
        (ax * ax +
            ay * ay) *
            (
                bx * cy -
                by * cx
            ) -
        (bx * bx +
            by * by) *
            (
                ax * cy -
                ay * cx
            ) +
        (cx * cx +
            cy * cy) *
            (
                ax * by -
                ay * bx
            );

    const orientation =
        triangleArea(
            a,
            b,
            c,
        );

    if (
        Math.abs(
            orientation,
        ) <
        MIN_TRIANGLE_AREA
    ) {
        return false;
    }

    return orientation >
        0
        ? determinant > 0
        : determinant < 0;
}
