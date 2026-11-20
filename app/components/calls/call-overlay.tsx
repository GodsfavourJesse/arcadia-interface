"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConversation } from "@/app/services/conversation/conversations.service";
import { useActiveCall } from "@/app/hooks/calls/useActiveCall";
import { useCallMediaSession } from "@/app/hooks/calls/useCallMediaSession";
import { useCallRingtone } from "@/app/hooks/calls/useCallRingtone";
import { useCallStore } from "@/app/store/calls/call.store";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { CALL_TYPE } from "@/app/types/calls/calls.types";
import { LiveFaceSwapProcessor } from "@/app/lib/video/live-face-swap-processor";
import { compressReferenceImage } from "@/app/lib/face/face-engine-landmarks";
import { CallControls } from "./call-controls";
import { motion } from "framer-motion";

type Profile = { displayName: string; profilePictureUrl: string | null };

function VideoSurface({
    stream,
    muted = false,
    className,
}: {
    stream: MediaStream | null;
    muted?: boolean;
    className: string;
}) {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!videoElement) return;

        videoElement.srcObject = stream;
        videoElement.muted = muted;
        if (stream) void videoElement.play().catch(() => undefined);

        return () => {
            videoElement.pause();
            videoElement.srcObject = null;
        };
    }, [muted, stream, videoElement]);

    return (
        <video
            ref={setVideoElement}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
}

function RemoteAudio({
    stream,
    enabled,
}: {
    stream: MediaStream | null;
    enabled: boolean;
}) {
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioElement) return;

        audioElement.srcObject = stream;
        audioElement.muted = !enabled;
        if (stream && enabled) void audioElement.play().catch(() => undefined);

        return () => {
            audioElement.pause();
            audioElement.srcObject = null;
        };
    }, [audioElement, enabled, stream]);

    return <audio ref={setAudioElement} autoPlay className="hidden" />;
}

function MediaToggle({
    label,
    active,
    onClick,
    children,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm transition ${
                active
                    ? "border-white/15 bg-white/10 text-white hover:bg-white/20"
                    : "border-red-300/30 bg-red-500/20 text-red-100 hover:bg-red-500/30"
            }`}
        >
            {children}
        </button>
    );
}

export function CallOverlay() {
    const { user } = useAuth();
    const {
        activeCall,
        myParticipant,
        isIncoming,
        isOutgoing,
        isAccepted,
        isConnected,
        isTerminal,
        isActionPending,
        error,
    } = useActiveCall();
    const accept = useCallStore((state) => state.accept);
    const decline = useCallStore((state) => state.decline);
    const cancel = useCallStore((state) => state.cancel);
    const end = useCallStore((state) => state.end);
    const fail = useCallStore((state) => state.fail);
    const reset = useCallStore((state) => state.reset);
    const clearError = useCallStore((state) => state.clearError);
    const [profile, setProfile] = useState<Profile>({
        displayName: "Miyor contact",
        profilePictureUrl: null,
    });
    const [speakerEnabled, setSpeakerEnabled] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const [effectsOpen, setEffectsOpen] = useState(false);
    const [effectImageUrl, setEffectImageUrl] = useState<string | null>(null);
    const [effectImageName, setEffectImageName] = useState<string | null>(null);
    const [effectImageFile, setEffectImageFile] = useState<File | null>(null);
    const [effectNotice, setEffectNotice] = useState<string | null>(null);
    const [effectActive, setEffectActive] = useState(false);
    const [effectError, setEffectError] = useState<string | null>(null);
    const [effectBusy, setEffectBusy] = useState(false);
    const [swapProcessor, setSwapProcessor] = useState<LiveFaceSwapProcessor | null>(null);
    const effectVideoRef = useRef<HTMLVideoElement | null>(null);
    const effectFileRef = useRef<HTMLInputElement | null>(null);
    const swapProcessorRef = useRef<LiveFaceSwapProcessor | null>(null);

    const isCaller = myParticipant?.role === "caller";
    const enabled = Boolean(
        activeCall && !isTerminal && (isAccepted || isConnected),
    );
    const isVideoCall = activeCall?.type === CALL_TYPE.VIDEO;

    const markConnected = useCallback(() => {
        if (isCaller) void useCallStore.getState().markConnected();
    }, [isCaller]);
    const handleFailed = useCallback(() => {
        void fail();
    }, [fail]);

    const media = useCallMediaSession({
        callId: activeCall?.id ?? null,
        callType: activeCall?.type ?? null,
        isCaller,
        enabled,
        onConnected: markConnected,
        onFailed: handleFailed,
    });

    const canPrepareEffect = Boolean(isVideoCall && enabled && media.localStream && (effectsOpen || effectActive));
    const effectInputStream = canPrepareEffect ? media.localStream : null;

    useEffect(() => {
        const video = effectVideoRef.current;
        if (!video) return;
        video.srcObject = effectInputStream;
        if (effectInputStream) void video.play().catch(() => undefined);
        return () => {
            if (video.srcObject === effectInputStream) video.srcObject = null;
        };
    }, [effectInputStream]);

    useEffect(() => {
        const track = swapProcessor?.videoTrack;
        if (track && effectActive) track.enabled = media.isCameraEnabled;
    }, [effectActive, media.isCameraEnabled, swapProcessor]);

    useEffect(() => {
        swapProcessorRef.current = swapProcessor;
    }, [swapProcessor]);

    useEffect(() => {
        if (!effectActive || !swapProcessor) return;
        const refreshMetrics = () => {
            const metrics = swapProcessor.diagnostics;
            if (!metrics.framesRendered) {
                setEffectNotice("Live face-swap model connected · preparing the first frames…");
                return;
            }
            const fps = Math.round(metrics.processedFps);
            const inference = Math.round(metrics.lastInferenceMs);
            setEffectNotice(
                fps >= 15
                    ? `Live face swap · ${fps} FPS · ${inference} ms per frame`
                    : `Live face swap · ${fps} FPS · ${inference} ms per frame. A faster GPU or closer service region is needed for smoother video.`,
            );
        };
        refreshMetrics();
        const timer = window.setInterval(refreshMetrics, 1200);
        return () => window.clearInterval(timer);
    }, [effectActive, swapProcessor]);

    useEffect(() => {
        return () => {
            swapProcessorRef.current?.stop();
            swapProcessorRef.current = null;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (effectImageUrl?.startsWith("blob:")) URL.revokeObjectURL(effectImageUrl);
        };
    }, [effectImageUrl]);

    useEffect(() => {
        setEffectsOpen(false);
        setEffectActive(false);
        setEffectImageUrl(null);
        setEffectImageName(null);
        setEffectImageFile(null);
        setEffectNotice(null);
        setEffectError(null);
        swapProcessorRef.current?.stop();
        swapProcessorRef.current = null;
        setSwapProcessor(null);
    }, [activeCall?.id]);

    useCallRingtone(isIncoming);

    useEffect(() => {
        let cancelled = false;
        const conversationId = activeCall?.conversationId;
        const myUserId = user?.id;
        if (!conversationId || !myUserId) return;

        setProfile({ displayName: "Miyor contact", profilePictureUrl: null });

        void getConversation(conversationId)
            .then((response) => {
                const other = response.conversation.members.find(
                    (member) => member.userId !== myUserId,
                )?.user;
                if (!cancelled && other) {
                    setProfile({
                        displayName: other.displayName || "Miyor contact",
                        profilePictureUrl: other.profilePictureUrl,
                    });
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [activeCall?.conversationId, user?.id]);

    useEffect(() => {
        if (!isConnected || !activeCall) {
            setElapsed(0);
            return;
        }

        const startedAt = activeCall.connectedAt
            ? new Date(activeCall.connectedAt).getTime()
            : Date.now();
        const update = () =>
            setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        update();
        const timer = window.setInterval(update, 1000);
        return () => window.clearInterval(timer);
    }, [activeCall, isConnected]);

    useEffect(() => {
        if (!isTerminal) return;
        const timer = window.setTimeout(() => reset(), 1600);
        return () => window.clearTimeout(timer);
    }, [isTerminal, reset]);

    const handleEffectPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;

        if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
            setEffectError("Choose a JPEG, PNG, or WebP face photo.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setEffectError("Choose a photo smaller than 10 MB.");
            return;
        }

        if (typeof createImageBitmap === "function") {
            let bitmap: ImageBitmap | null = null;
            try {
                bitmap = await createImageBitmap(file);
                if (bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 16_777_216) {
                    setEffectError("Choose a photo up to 4096 × 4096 pixels for smooth call performance.");
                    return;
                }
            } catch {
                setEffectError("MIYOR couldn’t read this photo. Choose another JPEG, PNG, or WebP image.");
                return;
            } finally {
                bitmap?.close();
            }
        }

        setEffectImageUrl(URL.createObjectURL(file));
        setEffectImageName(file.name);
        setEffectImageFile(file);
        setEffectNotice(null);
        setEffectError(null);
        setEffectsOpen(true);
    };

    const applyCallEffect = async () => {
        if (!effectImageUrl) {
            setEffectError("Choose a face photo first.");
            return;
        }
        if (!effectImageFile || !activeCall?.id || !effectVideoRef.current) {
            setEffectError("The photo or active call is no longer available. Try selecting the photo again.");
            return;
        }
        if (!media.isConnected) {
            setEffectError("Wait until the video call is connected, then try again.");
            return;
        }

        setEffectBusy(true);
        setEffectError(null);
        setEffectNotice(null);
        try {
            const referenceImage = await compressReferenceImage(effectImageFile);
            const processor = await LiveFaceSwapProcessor.start(
                effectVideoRef.current,
                activeCall.id,
                referenceImage,
            );
            processor.videoTrack.enabled = media.isCameraEnabled;
            await media.replaceVideoTrack(processor.videoTrack);
            const previous = swapProcessorRef.current;
            swapProcessorRef.current = processor;
            setSwapProcessor(processor);
            previous?.stop();
            processor.setOnClosed(() => {
                if (swapProcessorRef.current !== processor) return;
                swapProcessorRef.current = null;
                processor.stop();
                setSwapProcessor(null);
                setEffectActive(false);
                setEffectNotice(null);
                const cameraTrack = media.localStream?.getVideoTracks()[0];
                if (cameraTrack) void media.replaceVideoTrack(cameraTrack).catch(() => undefined);
                setEffectError("The private face-swap connection ended. Your call has returned to the camera.");
            });
            setEffectActive(true);
            setEffectNotice(`Live face swap is connected on ${processor.runtime?.device ?? "the private model service"}.`);
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Unable to apply this face effect.";
            setEffectError(message);
        } finally {
            setEffectBusy(false);
        }
    };

    const removeCallEffect = async () => {
        setEffectError(null);
        try {
            swapProcessorRef.current?.stop();
            swapProcessorRef.current = null;
            setSwapProcessor(null);
            const cameraTrack = media.localStream?.getVideoTracks()[0];
            if (!cameraTrack) throw new Error("The camera track is no longer available.");
            cameraTrack.enabled = media.isCameraEnabled;
            await media.replaceVideoTrack(cameraTrack);
            setEffectActive(false);
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Unable to return to the camera.";
            setEffectError(message);
        }
    };

    if (!activeCall || !myParticipant) return null;

    const displayError = error ?? media.error;
    const formatDuration = (total: number) =>
        `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    const localVideoStream = effectActive && swapProcessor
        ? swapProcessor.stream
        : media.localStream;
    const remoteVideoAvailable = Boolean(
        media.remoteVideoEnabled &&
            media.remoteStream?.getVideoTracks().some((track) => track.readyState === "live"),
    );

    if (isTerminal) {
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 px-6 text-white">
                <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">MIYOR</p>
                    <h2 className="mt-4 text-3xl font-semibold">
                        {activeCall.state === "failed" ? "Call couldn’t connect" : "Call ended"}
                    </h2>
                    <p className="mt-2 text-sm text-white/60">{profile.displayName}</p>
                </div>
            </div>
        );
    }

    return (
        <motion.section
            initial={{ opacity: 0, scale: .99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: .22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label={`${isVideoCall ? "Video" : "Voice"} call`}
            className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-white"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(9,113,237,0.24),transparent_38%),#07111f]">
                {isVideoCall && remoteVideoAvailable ? (
                    <VideoSurface stream={media.remoteStream} className="h-full w-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {profile.profilePictureUrl ? (
                            <img
                                src={profile.profilePictureUrl}
                                alt=""
                                className="h-32 w-32 rounded-full object-cover ring-4 ring-white/10"
                            />
                        ) : (
                            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-4xl font-semibold ring-4 ring-white/5">
                                {profile.displayName.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                        <p className="mt-6 text-xl font-semibold">{profile.displayName}</p>
                        <p className="mt-2 text-sm text-white/55">
                            {isIncoming
                                ? "Incoming call"
                                : isOutgoing
                                  ? "Calling…"
                                  : media.isConnecting
                                    ? "Connecting…"
                                    : isConnected
                                      ? "Connected"
                                      : "Preparing call…"}
                        </p>
                    </div>
                )}

                {isVideoCall && media.localStream && (
                    <div className="absolute right-4 top-20 h-36 w-28 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl ring-1 ring-black/20 sm:right-8 sm:top-24 sm:h-48 sm:w-36">
                        <VideoSurface
                            stream={localVideoStream}
                            muted
                            className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white/80">You</span>
                    </div>
                )}

                <video ref={effectVideoRef} autoPlay muted playsInline className="hidden" />

                <RemoteAudio stream={media.remoteStream} enabled={speakerEnabled} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
            </div>

            <div className="relative flex min-h-screen flex-col justify-between p-5 sm:p-8">
                <header className="flex items-center justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0971ED] to-[#2BC6FF] text-[11px] tracking-normal text-white">M</span> MIYOR</p>
                        <p className="mt-2 text-sm text-white/70">{profile.displayName} · {isVideoCall ? "Video call" : "Voice call"}</p>
                    </div>
                    {(isAccepted || isConnected) && media.localStream && (
                        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm tabular-nums text-white/85">
                            {formatDuration(elapsed)}
                        </span>
                    )}
                </header>

                <footer className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/55 p-4 shadow-2xl backdrop-blur-2xl sm:p-5">
                    {isConnected && (
                        <div className="mb-5 flex justify-center gap-3">
                            <MediaToggle
                                label={media.isMuted ? "Unmute microphone" : "Mute microphone"}
                                active={!media.isMuted}
                                onClick={media.toggleMute}
                            >
                                {media.isMuted ? "Mic off" : "Mic"}
                            </MediaToggle>
                            {isVideoCall && (
                                <MediaToggle
                                    label={media.isCameraEnabled ? "Turn camera off" : "Turn camera on"}
                                    active={media.isCameraEnabled}
                                    onClick={media.toggleCamera}
                                >
                                    {media.isCameraEnabled ? "Camera" : "Cam off"}
                                </MediaToggle>
                            )}
                            {isVideoCall && (
                                <button
                                    type="button"
                                    onClick={() => setEffectsOpen((open) => !open)}
                                    className={`rounded-full border px-4 text-sm font-medium transition ${
                                        effectActive
                                            ? "border-[#2BC6FF]/40 bg-[#2BC6FF]/20 text-white"
                                            : "border-white/15 bg-white/10 text-white hover:bg-white/20"
                                    }`}
                                >
                                    {effectActive ? "Face effect on" : "Face effects"}
                                </button>
                            )}
                            <MediaToggle
                                label={speakerEnabled ? "Turn speaker off" : "Turn speaker on"}
                                active={speakerEnabled}
                                onClick={() => setSpeakerEnabled((current) => !current)}
                            >
                                {speakerEnabled ? "Speaker" : "Muted"}
                            </MediaToggle>
                        </div>
                    )}

                    {isConnected && isVideoCall && effectsOpen && (
                        <div className="mb-5 rounded-2xl border border-white/15 bg-slate-950/90 p-4 shadow-2xl backdrop-blur">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">Live face effect</p>
                                    <p className="mt-1 text-xs text-white/55">
                                        {effectActive
                                            ? "The face-swap stream is being sent to the other participant."
                                            : effectImageName
                                              ? "Ready to connect the private live model. Keep your face in view."
                                              : "Choose a clear, front-facing photo to use during this call."}
                                    </p>
                                </div>
                                <p className="mb-3 max-w-lg text-[11px] leading-5 text-white/40">Your portrait and reduced-size live video frames are sent through MIYOR’s authenticated API to its private face-swap service. The stream is processed in memory and isn’t saved.</p>
                                <input
                                    ref={effectFileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleEffectPhoto}
                                    className="hidden"
                                />
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => effectFileRef.current?.click()}
                                        disabled={effectBusy}
                                        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
                                    >
                                        {effectImageName ? "Choose photo" : "Upload photo"}
                                    </button>
                                    {effectImageUrl && (
                                        <button
                                            type="button"
                                            onClick={() => void applyCallEffect()}
                                            disabled={effectBusy || !media.isConnected || !effectImageFile}
                                            className="rounded-lg bg-[#2BC6FF] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {effectBusy ? "Preparing…" : effectActive ? "Update effect" : "Apply to call"}
                                        </button>
                                    )}
                                    {effectActive && (
                                        <button
                                            type="button"
                                            onClick={() => void removeCallEffect()}
                                            disabled={effectBusy}
                                            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
                                        >
                                            Return to camera
                                        </button>
                                    )}
                                </div>
                            </div>
                            {effectNotice && (
                                <p aria-live="polite" className="mt-3 rounded-lg border border-cyan-200/15 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-cyan-50">
                                    {effectNotice}
                                </p>
                            )}
                            {effectError && (
                                <p role="alert" className="mt-3 rounded-lg border border-red-200/15 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                                    {effectError}
                                </p>
                            )}
                        </div>
                    )}

                    <CallControls
                        state={activeCall.state}
                        type={activeCall.type}
                        isIncoming={isIncoming}
                        isOutgoing={isOutgoing}
                        isAccepted={isAccepted}
                        isConnected={isConnected}
                        isActionPending={isActionPending}
                        onAccept={() => void accept()}
                        onDecline={() => void decline()}
                        onCancel={() => void cancel()}
                        onEnd={() => void end()}
                    />

                    {displayError && (
                        <div className="mx-auto mt-4 flex max-w-md items-center justify-between gap-4 rounded-xl border border-red-200/15 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            <p>{displayError}</p>
                            <button type="button" onClick={clearError} className="shrink-0 text-xs text-white/70 underline">
                                Dismiss
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </motion.section>
    );
}
