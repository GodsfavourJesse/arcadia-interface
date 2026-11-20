import type {
    FaceTrackingState,
} from "@/app/types/face/face-tracking.types";

import {
    AvatarImageRenderer,
} from "@/app/lib/avatar/avatar-image-renderer";

import type {
    VideoProcessorDiagnostics,
    VideoProcessorMode,
    VideoProcessorOptions,
    VideoProcessorOutput,
} from "@/app/types/video/video-processor.types";

const DEFAULT_WIDTH =
    1280;

const DEFAULT_HEIGHT =
    720;

const DEFAULT_FPS =
    30;

export class VideoProcessor {
    private canvas:
        HTMLCanvasElement | null =
        null;

    private context:
        CanvasRenderingContext2D | null =
        null;

    private stream:
        MediaStream | null =
        null;

    private videoTrack:
        MediaStreamTrack | null =
        null;

    private sourceVideo:
        HTMLVideoElement | null =
        null;

    private width =
        DEFAULT_WIDTH;

    private height =
        DEFAULT_HEIGHT;

    private fps =
        DEFAULT_FPS;

    private mode:
        VideoProcessorMode =
        "camera";

    private frameCount =
        0;

    private lastFrameTimestamp =
        0;

    private initialized =
        false;

    private avatarRenderer:
        AvatarImageRenderer | null =
        null;

    initialize(
        options:
            VideoProcessorOptions = {},
    ): VideoProcessorOutput {
        if (
            this.initialized
        ) {
            return this.getOutput();
        }

        this.width =
            options.width ??
            DEFAULT_WIDTH;

        this.height =
            options.height ??
            DEFAULT_HEIGHT;

        this.fps =
            options.fps ??
            DEFAULT_FPS;

        this.mode =
            options.mode ??
            "camera";

        if (
            this.width <= 0 ||
            this.height <= 0
        ) {
            throw new Error(
                "VideoProcessor dimensions must be greater than zero.",
            );
        }

        if (
            this.fps <= 0 ||
            this.fps > 60
        ) {
            throw new Error(
                "VideoProcessor FPS must be between 1 and 60.",
            );
        }

        if (
            typeof document ===
            "undefined"
        ) {
            throw new Error(
                "VideoProcessor can only be initialized in a browser.",
            );
        }

        const canvas =
            document.createElement(
                "canvas",
            );

        canvas.width =
            this.width;

        canvas.height =
            this.height;

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
                "Unable to create the video processor canvas.",
            );
        }

        this.canvas =
            canvas;

        this.context =
            context;

        this.stream =
            canvas.captureStream(
                this.fps,
            );

        const [
            videoTrack,
        ] =
            this.stream.getVideoTracks();

        if (!videoTrack) {
            this.stream
                .getTracks()
                .forEach(
                    (
                        track,
                    ) => {
                        track.stop();
                    },
                );

            this.stream =
                null;

            this.canvas =
                null;

            this.context =
                null;

            throw new Error(
                "Unable to create the processed video track.",
            );
        }

        this.videoTrack =
            videoTrack;

        this.frameCount =
            0;

        this.lastFrameTimestamp =
            0;

        this.initialized =
            true;

        return this.getOutput();
    }

    setSourceVideo(
        video:
            HTMLVideoElement |
            null,
    ): void {
        this.sourceVideo =
            video;
    }

    setMode(
        mode:
            VideoProcessorMode,
    ): void {
        if (
            this.mode ===
            mode
        ) {
            return;
        }

        this.mode =
            mode;
    }

    async setAvatarImage(
        imageUrl:
            string,
    ): Promise<void> {
        if (
            !this.initialized
        ) {
            throw new Error(
                "VideoProcessor must be initialized before setting an avatar.",
            );
        }

        if (!this.canvas) {
            throw new Error(
                "VideoProcessor canvas is unavailable.",
            );
        }

        const renderer =
            new AvatarImageRenderer(
                this.canvas,
                this.width,
                this.height,
            );

        try {
            await renderer.initialize(
                imageUrl,
            );
        } catch (error) {
            renderer.dispose();

            throw error;
        }

        this.avatarRenderer?.dispose();

        this.avatarRenderer =
            renderer;

        this.mode =
            "avatar";
    }

    clearAvatar(): void {
        this.avatarRenderer?.dispose();

        this.avatarRenderer =
            null;

        this.mode =
            "camera";
    }

    render(
        tracking:
            FaceTrackingState |
            null =
            null,

        timestamp =
            performance.now(),
    ): void {
        if (
            !this.initialized ||
            !this.canvas ||
            !this.context
        ) {
            return;
        }

        let rendered =
            false;

        if (
            this.mode ===
                "avatar" &&
            this.avatarRenderer
        ) {
            // Keep the live camera as the frame background. The avatar
            // renderer adds only the tracked face mask on top of it.
            rendered = this.renderCameraFrame();

            if (rendered) {
                this.avatarRenderer.render(
                    tracking,
                    timestamp,
                );
            }
        } else {
            rendered =
                this.renderCameraFrame();
        }

        if (!rendered) {
            return;
        }

        this.frameCount +=
            1;

        this.lastFrameTimestamp =
            timestamp;
    }

    getDiagnostics():
        VideoProcessorDiagnostics {
        const avatarDiagnostics =
            this.avatarRenderer
                ?.getDiagnostics();

        return {
            width:
                this.width,

            height:
                this.height,

            fps:
                this.fps,

            mode:
                this.mode,

            frameCount:
                this.frameCount,

            lastFrameTimestamp:
                this.lastFrameTimestamp,

            outputTrackReady:
                Boolean(
                    this.videoTrack &&
                        this.videoTrack
                            .readyState ===
                            "live",
                ),

            avatarReady:
                Boolean(
                    this.avatarRenderer,
                ),

            avatarImageLoaded:
                avatarDiagnostics
                    ?.imageLoaded ??
                false,

            avatarFramesRendered:
                avatarDiagnostics
                    ?.framesRendered ??
                0,

            faceDetected:
                avatarDiagnostics
                    ?.faceDetected ??
                false,

            faceX:
                avatarDiagnostics
                    ?.faceX ??
                0,

            faceY:
                avatarDiagnostics
                    ?.faceY ??
                0,

            faceWidth:
                avatarDiagnostics
                    ?.faceWidth ??
                0,

            faceHeight:
                avatarDiagnostics
                    ?.faceHeight ??
                0,
        };
    }

    getOutput():
        VideoProcessorOutput {
        if (
            !this.canvas ||
            !this.stream ||
            !this.videoTrack
        ) {
            throw new Error(
                "VideoProcessor has not been initialized.",
            );
        }

        return {
            canvas:
                this.canvas,

            stream:
                this.stream,

            videoTrack:
                this.videoTrack,
        };
    }

    stop(): void {
        this.stream
            ?.getTracks()
            .forEach(
                (
                    track,
                ) => {
                    track.stop();
                },
            );

        this.avatarRenderer?.dispose();

        this.avatarRenderer =
            null;

        this.stream =
            null;

        this.videoTrack =
            null;

        this.canvas =
            null;

        this.context =
            null;

        this.sourceVideo =
            null;

        this.frameCount =
            0;

        this.lastFrameTimestamp =
            0;

        this.initialized =
            false;

        this.mode =
            "camera";
    }

    private renderCameraFrame():
        boolean {
        if (
            !this.context ||
            !this.sourceVideo
        ) {
            return false;
        }

        const video =
            this.sourceVideo;

        if (
            video.readyState <
                HTMLMediaElement.HAVE_CURRENT_DATA ||
            video.videoWidth <= 0 ||
            video.videoHeight <= 0 ||
            video.paused ||
            video.ended
        ) {
            return false;
        }

        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        this.context.drawImage(
            video,
            0,
            0,
            this.width,
            this.height,
        );

        return true;
    }
}
