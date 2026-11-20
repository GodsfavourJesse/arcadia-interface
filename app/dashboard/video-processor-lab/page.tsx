"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { useCameraVideoSource } from "@/app/hooks/video/useCameraVideoSource";
import { useFaceTracking } from "@/app/hooks/face/useFaceTracking";
import { useVideoProcessor } from "@/app/hooks/video/useVideoProcessor";
import { tryGenerateNeuralFaceReference } from "@/app/lib/face/face-engine-client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIDE = 4096;
const MAX_IMAGE_PIXELS = 16_777_216;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function VideoProcessorLabPage() {
    const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
    const outputVideoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const avatarObjectUrlRef = useRef<string | null>(null);

    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imageNotice, setImageNotice] = useState<string | null>(null);
    const [appliedImageUrl, setAppliedImageUrl] = useState<string | null>(null);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [trackingRetryKey, setTrackingRetryKey] = useState(0);
    const [processorRetryKey, setProcessorRetryKey] = useState(0);

    const {
        stream: cameraStream,
        state: cameraState,
        error: cameraError,
        start: startCamera,
        stop: stopCamera,
    } = useCameraVideoSource({
        enabled: true,
        maxFps: 30,
    });

    useEffect(() => {
        const video = sourceVideoRef.current;
        if (!video) return;

        video.srcObject = cameraStream;
        if (cameraStream) void video.play().catch(() => undefined);

        return () => {
            if (video.srcObject === cameraStream) video.srcObject = null;
        };
    }, [cameraStream]);

    const {
        state: trackingState,
        initialized: trackingInitialized,
        error: trackingError,
    } = useFaceTracking({
        videoRef: sourceVideoRef,
        enabled: Boolean(cameraStream),
        detectionFps: 30,
        retryKey: trackingRetryKey,
    });

    const {
        stream: processedStream,
        initialized: processorInitialized,
        error: processorError,
        diagnostics,
        setAvatarImage,
        setMode,
        clearAvatar,
    } = useVideoProcessor({
        sourceVideoRef,
        trackingState,
        enabled: Boolean(cameraStream),
        width: 1280,
        height: 720,
        fps: 30,
        mode: "camera",
        retryKey: processorRetryKey,
    });

    useEffect(() => {
        const video = outputVideoRef.current;
        if (!video) return;

        video.srcObject = processedStream;
        if (processedStream) void video.play().catch(() => undefined);

        return () => {
            if (video.srcObject === processedStream) video.srcObject = null;
        };
    }, [processedStream]);

    useEffect(() => {
        return () => {
            if (avatarObjectUrlRef.current) {
                URL.revokeObjectURL(avatarObjectUrlRef.current);
                avatarObjectUrlRef.current = null;
            }
        };
    }, []);

    const handleStartCamera = async () => {
        try {
            await startCamera();
        } catch {
            // The camera hook exposes an actionable error for the page.
        }
    };

    const handleStopCamera = () => {
        clearAvatar();
        setAppliedImageUrl(null);
        setImageNotice(null);
        stopCamera();
    };

    const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;

        setImageError(null);
        setImageNotice(null);

        if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
            setImageError("Choose a JPEG, PNG, or WebP image.");
            return;
        }

        if (file.size > MAX_IMAGE_BYTES) {
            setImageError("This image is over 10 MB. Choose a smaller file for faster setup.");
            return;
        }

        let bitmap: ImageBitmap | null = null;
        try {
            if (typeof createImageBitmap === "function") {
                bitmap = await createImageBitmap(file);
                const { width, height } = bitmap;
                if (
                    width > MAX_IMAGE_SIDE ||
                    height > MAX_IMAGE_SIDE ||
                    width * height > MAX_IMAGE_PIXELS
                ) {
                    setImageError("This image is too large to process smoothly. Choose one up to 4096 × 4096 pixels.");
                    return;
                }
            }
        } catch {
            setImageError("MIYOR couldn’t read this image. Try a different JPEG, PNG, or WebP photo.");
            return;
        } finally {
            bitmap?.close();
        }

        const nextUrl = URL.createObjectURL(file);
        if (avatarObjectUrlRef.current) {
            URL.revokeObjectURL(avatarObjectUrlRef.current);
        }
        avatarObjectUrlRef.current = nextUrl;
        setSelectedImageUrl(nextUrl);
        setSelectedImageName(file.name);
        setSelectedImageFile(file);
    };

    const handleApplyEffect = async () => {
        if (!selectedImageUrl) {
            setImageError("Choose a face photo first.");
            return;
        }

        if (!cameraStream) {
            setImageError("Enable your camera before applying the effect.");
            return;
        }

        if (!trackingInitialized) {
            setImageError("Face tracking is still preparing. Wait for it to be ready, then try again.");
            return;
        }

        if (!processorInitialized) {
            setImageError("The video preview isn’t ready yet. Retry the video processor below.");
            return;
        }

        setImageError(null);
        setImageNotice(null);
        setIsAnalyzingImage(true);
        try {
            const neuralAttempt = selectedImageFile && trackingState?.detected
                ? await tryGenerateNeuralFaceReference(
                    selectedImageFile,
                    trackingState,
                    sourceVideoRef.current?.videoWidth ?? 1280,
                    sourceVideoRef.current?.videoHeight ?? 720,
                )
                : {
                    kind: "fallback" as const,
                    message: "The neural engine could not prepare a face crop. The live on-device transformation is active.",
                };
            const avatarSource = neuralAttempt.kind === "generated"
                ? neuralAttempt.imageUrl
                : selectedImageUrl;

            await setAvatarImage(avatarSource);
            setMode("avatar");
            setAppliedImageUrl(selectedImageUrl);
            setImageNotice(neuralAttempt.kind === "generated"
                ? "Neural generation prepared the reference face; live expression tracking and video rendering continue on this device."
                : neuralAttempt.message);
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Unable to prepare this face effect.";
            const normalized = message.toLowerCase();
            if (normalized.includes("no usable face") || normalized.includes("no face")) {
                setImageError("No clear face was found. Choose a well-lit photo with one front-facing face, fully visible.");
            } else if (normalized.includes("unable to load avatar image")) {
                setImageError("The photo couldn’t be loaded. Choose another JPEG, PNG, or WebP image.");
            } else if (
                normalized.includes("failed to fetch") ||
                normalized.includes("network") ||
                normalized.includes("wasm") ||
                normalized.includes("model")
            ) {
                setImageError("MIYOR couldn’t load the face-analysis model. Check your connection and try again. Your camera stays on this device.");
            } else {
                setImageError(message);
            }
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const handleReturnToCamera = () => {
        clearAvatar();
        setAppliedImageUrl(null);
        setImageError(null);
    };

    const effectReady = Boolean(
        selectedImageUrl &&
            selectedImageUrl === appliedImageUrl &&
            diagnostics.avatarReady,
    );
    const faceDetected = Boolean(trackingState?.detected);

    const cameraStatus = cameraStream
        ? "Camera ready"
        : cameraState === "starting"
          ? "Requesting camera access"
          : cameraState === "error"
            ? "Camera needs attention"
            : "Camera off";
    const trackingStatus = !cameraStream
        ? "Enable the camera first"
        : trackingError
          ? "Tracking unavailable"
          : !trackingInitialized
            ? "Loading face tracking"
            : faceDetected
              ? "Face detected"
              : "Move into view";
    const effectStatus = isAnalyzingImage
        ? "Preparing face transformation…"
        : effectReady
          ? "Effect ready"
          : selectedImageUrl
            ? "Photo selected · apply to continue"
            : "Choose a photo";

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
            <div className="mx-auto max-w-6xl space-y-7">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">MIYOR · VIDEO EFFECTS</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Face preview</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                            Check your camera, choose a face photo, and preview the effect before using it in a call.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100 sm:self-auto">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        Processed in this browser
                    </div>
                </header>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/65 sm:px-5">
                    Your camera and selected photo stay on this device. MIYOR uses the camera only after you enable it; the preview does not start a call.
                </div>

                <section className="grid gap-5 lg:grid-cols-2">
                    <PreviewPanel
                        title="Camera"
                        status={cameraStatus}
                        statusTone={cameraStream ? "good" : cameraState === "error" ? "error" : "neutral"}
                    >
                        {cameraStream ? (
                            <video ref={sourceVideoRef} autoPlay muted playsInline className="aspect-video w-full bg-black object-cover" />
                        ) : (
                            <div className="flex aspect-video flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_38%,rgba(99,102,241,0.18),transparent_46%),#050814] px-5 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl" aria-hidden="true">◉</span>
                                <p className="mt-4 text-sm font-medium">Camera preview is off</p>
                                <p className="mt-1 max-w-xs text-xs leading-5 text-white/50">Allow camera and microphone access to begin the local preview.</p>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                            <p className="text-xs text-white/50">{cameraStream ? "Your face is tracked locally." : "No camera frames are being processed."}</p>
                            {cameraStream ? (
                                <button type="button" onClick={handleStopCamera} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10">Turn camera off</button>
                            ) : (
                                <button type="button" onClick={() => void handleStartCamera()} disabled={cameraState === "starting"} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60">
                                    {cameraState === "starting" ? "Waiting for permission…" : cameraState === "error" ? "Try camera again" : "Enable camera"}
                                </button>
                            )}
                        </div>
                    </PreviewPanel>

                    <PreviewPanel
                        title="Effect preview"
                        status={diagnostics.mode === "avatar" ? effectReady ? "Effect on" : "Previous effect active" : cameraStream ? "Original camera" : "Waiting for camera"}
                        statusTone={effectReady ? "good" : "neutral"}
                    >
                        {processedStream ? (
                            <video ref={outputVideoRef} autoPlay muted playsInline className="aspect-video w-full bg-black object-cover" />
                        ) : (
                            <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_38%,rgba(14,165,233,0.12),transparent_46%),#050814] px-5 text-center">
                                <p className="text-sm text-white/50">Enable the camera to prepare the output preview.</p>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                            <p className="text-xs text-white/50">This preview stream is ready for the call media pipeline.</p>
                            {diagnostics.mode === "avatar" && (
                                <button type="button" onClick={handleReturnToCamera} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10">Return to camera</button>
                            )}
                        </div>
                    </PreviewPanel>
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Choose a face photo</h2>
                                <p className="mt-1 max-w-xl text-sm leading-6 text-white/55">
                                    Use one well-lit, front-facing face with the full face visible. JPEG, PNG, or WebP · up to 10 MB.
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) => void handleImageFile(event)}
                                className="hidden"
                            />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzingImage} className="shrink-0 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                                {selectedImageUrl ? "Choose another photo" : "Choose photo"}
                            </button>
                        </div>

                        {selectedImageUrl && (
                            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-3">
                                <img src={selectedImageUrl} alt="Selected face photo" className="h-16 w-16 rounded-lg object-cover" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{selectedImageName}</p>
                                    <p className="mt-1 text-xs text-white/50">{effectStatus}</p>
                                </div>
                                <StatusPill label="Face tracking" value={trackingStatus} tone={trackingError ? "error" : faceDetected ? "good" : "neutral"} />
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleApplyEffect()}
                                disabled={!selectedImageUrl || !cameraStream || !trackingInitialized || !processorInitialized || isAnalyzingImage}
                                className="rounded-xl bg-indigo-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isAnalyzingImage ? "Analyzing photo…" : effectReady ? "Apply again" : "Apply face effect"}
                            </button>
                            {effectReady && (
                                <button type="button" onClick={handleReturnToCamera} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10">
                                    Remove effect
                                </button>
                            )}
                        </div>

                        {imageError && <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">{imageError}</p>}
                        {imageNotice && <p aria-live="polite" className="mt-4 rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-cyan-50">{imageNotice}</p>}
                        {cameraError && <p role="alert" className="mt-4 rounded-xl border border-amber-200/15 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">{cameraError}</p>}
                        {trackingError && (
                            <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200/15 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                                <p>Face tracking couldn’t start. Check your connection, then retry the tracker.</p>
                                <button type="button" onClick={() => setTrackingRetryKey((key) => key + 1)} className="shrink-0 rounded-lg border border-amber-100/20 px-3 py-2 text-xs font-semibold hover:bg-white/5">Retry tracking</button>
                            </div>
                        )}
                        {processorError && (
                            <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100 sm:flex-row sm:items-center sm:justify-between">
                                <p>The video preview couldn’t start. Your camera feed is unchanged.</p>
                                <button type="button" onClick={() => setProcessorRetryKey((key) => key + 1)} className="shrink-0 rounded-lg border border-red-100/20 px-3 py-2 text-xs font-semibold hover:bg-white/5">Retry preview</button>
                            </div>
                        )}
                    </div>

                    <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <h2 className="text-sm font-semibold">Preview status</h2>
                        <div className="mt-4 space-y-3">
                            <StatusPill label="Camera" value={cameraStatus} tone={cameraStream ? "good" : cameraState === "error" ? "error" : "neutral"} />
                            <StatusPill label="Face tracking" value={trackingStatus} tone={trackingError ? "error" : faceDetected ? "good" : "neutral"} />
                            <StatusPill label="Photo effect" value={effectStatus} tone={effectReady ? "good" : "neutral"} />
                            <StatusPill label="Output" value={diagnostics.outputTrackReady ? "Ready" : processorError ? "Unavailable" : "Preparing"} tone={diagnostics.outputTrackReady ? "good" : processorError ? "error" : "neutral"} />
                        </div>
                        {cameraStream && trackingInitialized && !faceDetected && (
                            <p className="mt-4 text-xs leading-5 text-white/50">Center your face in the camera and face the light. The camera view remains available if tracking is lost.</p>
                        )}
                    </aside>
                </section>
            </div>
        </main>
    );
}

function PreviewPanel({
    title,
    status,
    statusTone,
    children,
}: {
    title: string;
    status: string;
    statusTone: "good" | "error" | "neutral";
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <header className="flex items-center justify-between gap-3 px-4 py-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                <StatusPill label="" value={status} tone={statusTone} />
            </header>
            {children}
        </section>
    );
}

function StatusPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "good" | "error" | "neutral";
}) {
    const toneClass = tone === "good"
        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
        : tone === "error"
          ? "border-red-300/20 bg-red-400/10 text-red-100"
          : "border-white/10 bg-white/5 text-white/65";

    return (
        <div className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 ${toneClass}`}>
            {label && <span className="text-xs text-white/50">{label}</span>}
            <span className="truncate text-xs font-medium">{value}</span>
        </div>
    );
}
