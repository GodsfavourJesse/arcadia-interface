// import type { FaceTrackingState } from "@/app/types/face/face-tracking.types";

// import type {
//     AvatarRendererDiagnostics,
//     AvatarRendererFrame,
//     AvatarRendererOptions,
// } from "@/app/types/avatar/avatar-renderer.types";

// const DEFAULT_FACE_SCALE = 1.35;
// const DEFAULT_VERTICAL_OFFSET = 0;

// type FaceBounds = {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
// };

// export class AvatarImageRenderer {
//     private image: HTMLImageElement | null = null;

//     private imageUrl = "";

//     private width = 1280;

//     private height = 720;

//     private faceScale =
//         DEFAULT_FACE_SCALE;

//     private verticalOffset =
//         DEFAULT_VERTICAL_OFFSET;

//     private initialized = false;

//     private imageLoaded = false;

//     private framesRendered = 0;

//     private lastFrameTimestamp = 0;

//     private faceDetected = false;

//     private faceX = 0;

//     private faceY = 0;

//     private faceWidth = 0;

//     private faceHeight = 0;

//     async initialize(
//         options: AvatarRendererOptions,
//     ): Promise<void> {
//         if (
//             typeof window ===
//             "undefined"
//         ) {
//             throw new Error(
//                 "AvatarImageRenderer can only be initialized in a browser.",
//             );
//         }

//         if (
//             !options.imageUrl.trim()
//         ) {
//             throw new Error(
//                 "Avatar image URL is required.",
//             );
//         }

//         if (
//             !Number.isFinite(
//                 options.width,
//             ) ||
//             !Number.isFinite(
//                 options.height,
//             ) ||
//             options.width <= 0 ||
//             options.height <= 0
//         ) {
//             throw new Error(
//                 "Avatar renderer dimensions must be greater than zero.",
//             );
//         }

//         const faceScale =
//             options.faceScale ??
//             DEFAULT_FACE_SCALE;

//         const verticalOffset =
//             options.verticalOffset ??
//             DEFAULT_VERTICAL_OFFSET;

//         if (
//             !Number.isFinite(
//                 faceScale,
//             ) ||
//             faceScale <= 0
//         ) {
//             throw new Error(
//                 "Avatar face scale must be greater than zero.",
//             );
//         }

//         if (
//             !Number.isFinite(
//                 verticalOffset,
//             )
//         ) {
//             throw new Error(
//                 "Avatar vertical offset must be a finite number.",
//             );
//         }

//         /*
//          * Reset the previous renderer state
//          * before loading the new image.
//          */
//         this.dispose();

//         this.width =
//             options.width;

//         this.height =
//             options.height;

//         this.faceScale =
//             faceScale;

//         this.verticalOffset =
//             verticalOffset;

//         this.imageUrl =
//             options.imageUrl.trim();

//         const image =
//             new Image();

//         image.decoding =
//             "async";

//         /*
//          * Local object URLs and local public
//          * assets do not need cross-origin mode.
//          *
//          * Remote images do.
//          */
//         if (
//             !this.isLocalImageUrl(
//                 this.imageUrl,
//             )
//         ) {
//             image.crossOrigin =
//                 "anonymous";
//         }

//         await new Promise<void>(
//             (
//                 resolve,
//                 reject,
//             ) => {
//                 let settled =
//                     false;

//                 image.onload =
//                     () => {
//                         if (settled) {
//                             return;
//                         }

//                         settled = true;

//                         resolve();
//                     };

//                 image.onerror =
//                     () => {
//                         if (settled) {
//                             return;
//                         }

//                         settled = true;

//                         reject(
//                             new Error(
//                                 `Unable to load avatar image: ${this.imageUrl}`,
//                             ),
//                         );
//                     };

//                 image.src =
//                     this.imageUrl;
//             },
//         );

//         if (
//             image.naturalWidth <= 0 ||
//             image.naturalHeight <= 0
//         ) {
//             throw new Error(
//                 "Avatar image has invalid dimensions.",
//             );
//         }

//         this.image =
//             image;

//         this.imageLoaded =
//             true;

//         this.initialized =
//             true;

//         this.framesRendered =
//             0;

//         this.lastFrameTimestamp =
//             0;

//         this.resetFaceDiagnostics();
//     }

//     render(
//         frame: AvatarRendererFrame,
//     ): boolean {
//         if (
//             !this.initialized ||
//             !this.image ||
//             !this.imageLoaded
//         ) {
//             return false;
//         }

//         const {
//             context,
//             tracking,
//             timestamp,
//         } = frame;

//         /*
//          * Always clear the previous frame.
//          *
//          * This is important because the
//          * processed canvas must never reveal
//          * the original camera frame while
//          * avatar mode is active.
//          */
//         context.clearRect(
//             0,
//             0,
//             this.width,
//             this.height,
//         );

//         /*
//          * No valid face.
//          *
//          * We deliberately render the avatar
//          * instead of the real camera image.
//          */
//         if (
//             !tracking ||
//             !tracking.detected
//         ) {
//             this.resetFaceDiagnostics();

//             this.renderFallback(
//                 context,
//             );

//             this.recordFrame(
//                 timestamp,
//             );

//             return true;
//         }

//         const face =
//             this.getFaceBounds(
//                 tracking,
//             );

//         if (!face) {
//             this.resetFaceDiagnostics();

//             this.renderFallback(
//                 context,
//             );

//             this.recordFrame(
//                 timestamp,
//             );

//             return true;
//         }

//         /*
//          * Store diagnostics before rendering.
//          */
//         this.faceDetected =
//             true;

//         this.faceX =
//             face.x;

//         this.faceY =
//             face.y;

//         this.faceWidth =
//             face.width;

//         this.faceHeight =
//             face.height;

//         /*
//          * Draw the uploaded avatar around
//          * the user's tracked face position.
//          */
//         this.renderFaceAvatar(
//             context,
//             face.x,
//             face.y,
//             face.width,
//             face.height,
//         );

//         this.recordFrame(
//             timestamp,
//         );

//         return true;
//     }

//     getDiagnostics():
//         AvatarRendererDiagnostics {
//         return {
//             initialized:
//                 this.initialized,

//             imageLoaded:
//                 this.imageLoaded,

//             imageWidth:
//                 this.image?.naturalWidth ??
//                 0,

//             imageHeight:
//                 this.image?.naturalHeight ??
//                 0,

//             framesRendered:
//                 this.framesRendered,

//             lastFrameTimestamp:
//                 this.lastFrameTimestamp,

//             faceDetected:
//                 this.faceDetected,

//             faceX:
//                 this.faceX,

//             faceY:
//                 this.faceY,

//             faceWidth:
//                 this.faceWidth,

//             faceHeight:
//                 this.faceHeight,
//         };
//     }

//     dispose(): void {
//         if (this.image) {
//             this.image.onload =
//                 null;

//             this.image.onerror =
//                 null;

//             this.image =
//                 null;
//         }

//         this.imageUrl =
//             "";

//         this.initialized =
//             false;

//         this.imageLoaded =
//             false;

//         this.framesRendered =
//             0;

//         this.lastFrameTimestamp =
//             0;

//         this.resetFaceDiagnostics();
//     }

//     private renderFaceAvatar(
//         context: CanvasRenderingContext2D,
//         x: number,
//         y: number,
//         width: number,
//         height: number,
//     ): void {
//         if (!this.image) {
//             return;
//         }

//         /*
//          * Guard against invalid tracking
//          * coordinates.
//          */
//         if (
//             !Number.isFinite(x) ||
//             !Number.isFinite(y) ||
//             !Number.isFinite(width) ||
//             !Number.isFinite(height) ||
//             width <= 0 ||
//             height <= 0
//         ) {
//             this.renderFallback(
//                 context,
//             );

//             return;
//         }

//         /*
//          * Scale the uploaded image relative
//          * to the detected face width.
//          */
//         const scaledWidth =
//             width *
//             this.faceScale;

//         if (
//             !Number.isFinite(
//                 scaledWidth,
//             ) ||
//             scaledWidth <= 0
//         ) {
//             this.renderFallback(
//                 context,
//             );

//             return;
//         }

//         /*
//          * Preserve the uploaded image's
//          * original aspect ratio.
//          */
//         const aspectRatio =
//             this.image.naturalHeight /
//             this.image.naturalWidth;

//         const scaledHeight =
//             scaledWidth *
//             aspectRatio;

//         if (
//             !Number.isFinite(
//                 scaledHeight,
//             ) ||
//             scaledHeight <= 0
//         ) {
//             this.renderFallback(
//                 context,
//             );

//             return;
//         }

//         /*
//          * Position the avatar around the
//          * detected face center.
//          */
//         const centerX =
//             x +
//             width / 2;

//         const centerY =
//             y +
//             height / 2;

//         const drawX =
//             centerX -
//             scaledWidth / 2;

//         const drawY =
//             centerY -
//             scaledHeight / 2 +
//             height *
//                 this.verticalOffset;

//         context.drawImage(
//             this.image,
//             drawX,
//             drawY,
//             scaledWidth,
//             scaledHeight,
//         );
//     }

//     private renderFallback(
//         context: CanvasRenderingContext2D,
//     ): void {
//         if (!this.image) {
//             return;
//         }

//         const naturalWidth =
//             this.image.naturalWidth;

//         const naturalHeight =
//             this.image.naturalHeight;

//         if (
//             naturalWidth <= 0 ||
//             naturalHeight <= 0
//         ) {
//             return;
//         }

//         const aspectRatio =
//             naturalHeight /
//             naturalWidth;

//         let width =
//             this.width * 0.45;

//         let height =
//             width *
//             aspectRatio;

//         /*
//          * Prevent the fallback avatar from
//          * becoming taller than the output.
//          */
//         if (
//             height >
//             this.height * 0.8
//         ) {
//             height =
//                 this.height * 0.8;

//             width =
//                 height /
//                 aspectRatio;
//         }

//         const x =
//             (this.width -
//                 width) /
//             2;

//         const y =
//             (this.height -
//                 height) /
//             2;

//         context.drawImage(
//             this.image,
//             x,
//             y,
//             width,
//             height,
//         );
//     }

//     private getFaceBounds(
//         tracking: FaceTrackingState,
//     ): FaceBounds | null {
//         /*
//          * FaceTrackingState in the current
//          * project already exposes boundingBox.
//          */
//         const boundingBox =
//             tracking.boundingBox;

//         if (!boundingBox) {
//             return null;
//         }

//         const {
//             x,
//             y,
//             width,
//             height,
//         } = boundingBox;

//         if (
//             !Number.isFinite(x) ||
//             !Number.isFinite(y) ||
//             !Number.isFinite(width) ||
//             !Number.isFinite(height) ||
//             width <= 0 ||
//             height <= 0
//         ) {
//             return null;
//         }

//         /*
//          * FaceTracker currently produces
//          * pixel-space bounding-box values for
//          * the source video.
//          *
//          * If a normalized 0..1 box is ever
//          * supplied, convert it to renderer
//          * pixel coordinates.
//          */
//         const normalized =
//             x >= 0 &&
//             x <= 1 &&
//             y >= 0 &&
//             y <= 1 &&
//             width > 0 &&
//             width <= 1 &&
//             height > 0 &&
//             height <= 1;

//         if (normalized) {
//             return {
//                 x:
//                     x *
//                     this.width,

//                 y:
//                     y *
//                     this.height,

//                 width:
//                     width *
//                     this.width,

//                 height:
//                     height *
//                     this.height,
//             };
//         }

//         /*
//          * The source camera and processor
//          * currently use the same 1280x720
//          * coordinate space in the Phase 7 lab.
//          */
//         return {
//             x,
//             y,
//             width,
//             height,
//         };
//     }

//     private recordFrame(
//         timestamp: number,
//     ): void {
//         this.framesRendered +=
//             1;

//         this.lastFrameTimestamp =
//             timestamp;
//     }

//     private resetFaceDiagnostics(): void {
//         this.faceDetected =
//             false;

//         this.faceX =
//             0;

//         this.faceY =
//             0;

//         this.faceWidth =
//             0;

//         this.faceHeight =
//             0;
//     }

//     private isLocalImageUrl(
//         url: string,
//     ): boolean {
//         return (
//             url.startsWith("/") ||
//             url.startsWith("./") ||
//             url.startsWith("../") ||
//             url.startsWith("blob:") ||
//             url.startsWith("data:")
//         );
//     }
// }