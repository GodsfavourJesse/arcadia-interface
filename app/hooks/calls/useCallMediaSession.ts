"use client";

import { useCallback, useEffect, useRef } from "react";

import { useWebRTC } from "@/app/hooks/calls/useWebRTC";
import { useAvatarMedia } from "@/app/hooks/avatar/useAvatarMedia";
import type {
    CallType,
    CallVideoSource,
} from "@/app/types/calls/calls.types";

type UseCallMediaSessionOptions = {
    callId: string | null;
    callType: CallType | null;
    isCaller: boolean;
    enabled: boolean;
    isAccepted: boolean;
    isConnected: boolean;
    isCameraEnabled: boolean;
    initialVideoSource?: CallVideoSource;
    onConnected?: () => void;
    onFailed?: (error: Error) => void;
};

export function useCallMediaSession({
    callId,
    callType,
    isCaller,
    enabled,
    isAccepted,
    isConnected,
    isCameraEnabled,
    initialVideoSource = "camera",
    onConnected,
    onFailed,
}: UseCallMediaSessionOptions) {
    const isVideoCall = callType === "video";

    /*
     * WebRTC
     *
     * WebRTC is responsible for:
     *
     * - acquiring microphone/camera
     * - creating the RTCPeerConnection
     * - creating the RTCRtpSenders
     * - receiving remote media
     * - signaling
     *
     * It does NOT decide whether the outgoing video should be
     * the camera or the avatar.
     *
     * For video callers, initial negotiation is started explicitly
     * by this coordinator after the avatar track has been installed.
     */
    const {
        localStream,
        remoteStream,
        connectionState,
        error,
        isMuted,
        isCameraEnabled: webRTCIsCameraEnabled,
        remoteAudioEnabled,
        remoteVideoEnabled,
        isConnected: webRTCConnected,
        isConnecting,
        toggleMute,
        toggleCamera,
        replaceVideoTrack,
        isVideoSenderReady,

        /*
         * Prepares the WebRTC peer and starts the initial offer
         * only when explicitly requested.
         */
        startInitialOffer,
        cleanup,
    } = useWebRTC({
        callId,
        callType,
        isCaller,
        enabled,
        initialVideoSource,
        onConnected,
        onFailed,
    });

    /*
     * Avatar media
     *
     * Avatar media depends on the local camera stream because
     * MediaPipe tracks the physical camera.
     *
     * It does NOT depend on WebRTC being connected, so the avatar
     * track can be ready before the caller's first offer is created.
     */
    const {
        avatarStream,
        avatarVideoTrack,
        isAvatarActive,
        error: avatarError,
        handleAvatarCanvasReady,
        enableAvatar,
        disableAvatar,
        toggleAvatar,
    } = useAvatarMedia({
        cameraStream: localStream,
        enabled: isVideoCall && isAccepted && isCameraEnabled,
        videoSenderReady: isVideoSenderReady,
        replaceVideoTrack,
    });

    /*
     * Latest-value refs
     *
     * The initial negotiation runs asynchronously and must not be
     * cancelled or restarted just because a callback identity or
     * isAvatarActive changed mid-flight. It reads the freshest
     * values from these refs instead.
     */
    const replaceVideoTrackRef = useRef(replaceVideoTrack);
    const startInitialOfferRef = useRef(startInitialOffer);
    const enableAvatarRef = useRef(enableAvatar);
    const isAvatarActiveRef = useRef(isAvatarActive);
    const onFailedRef = useRef(onFailed);

    useEffect(() => {
        replaceVideoTrackRef.current = replaceVideoTrack;
        startInitialOfferRef.current = startInitialOffer;
        enableAvatarRef.current = enableAvatar;
        isAvatarActiveRef.current = isAvatarActive;
        onFailedRef.current = onFailed;
    });

    /*
     * Initial negotiation guard
     *
     * React effects can run more than once during the lifecycle of
     * a call. This ref guarantees that the initial caller offer is
     * started exactly once for the active call.
     *
     * sessionIdRef identifies the current call. Any in-flight
     * negotiation from a previous call (or from before unmount)
     * becomes stale and stops.
     */
    const initialOfferStartedRef = useRef(false);
    const sessionIdRef = useRef(0);

    useEffect(() => {
        initialOfferStartedRef.current = false;
        sessionIdRef.current += 1;

        return () => {
            sessionIdRef.current += 1;
        };
    }, [callId, callType]);

    /*
     * Initial video negotiation
     *
     * The critical sequence is:
     *
     * camera stream
     *   -> avatar canvas
     *   -> avatarVideoTrack
     *   -> WebRTC video sender ready
     *   -> replace sender track with avatar
     *   -> create initial OFFER
     *
     * Therefore the physical camera is never the first video track
     * offered to the remote participant.
     */
    useEffect(() => {
        if (
            initialVideoSource !== "avatar" ||
            !isVideoCall ||
            !isCaller ||
            !enabled ||
            !isAccepted ||
            !isCameraEnabled ||
            !avatarVideoTrack ||
            !isVideoSenderReady ||
            initialOfferStartedRef.current
        ) {
            return;
        }

        /*
         * Prevent another effect execution from starting a second
         * negotiation.
         */
        initialOfferStartedRef.current = true;

        const sessionId = sessionIdRef.current;

        const isStale = (): boolean => sessionIdRef.current !== sessionId;

        let offerStarted = false;

        async function startVideoSession(track: MediaStreamTrack) {
            try {
                /*
                 * Install the avatar track BEFORE creating the SDP
                 * offer.
                 *
                 * replaceVideoTrack() uses the existing RTCRtpSender,
                 * so no second video sender is created.
                 */
                await replaceVideoTrackRef.current(track);

                if (isStale()) {
                    return;
                }

                /*
                 * Now that the sender contains the avatar track,
                 * allow WebRTC to create the first caller offer.
                 */
                await startInitialOfferRef.current();

                offerStarted = true;

                if (isStale()) {
                    return;
                }

                /*
                 * The avatar is now the active outgoing video source.
                 *
                 * Keep avatar media state synchronized with the
                 * actual WebRTC sender.
                 */
                if (!isAvatarActiveRef.current) {
                    await enableAvatarRef.current();
                }
            } catch (caughtError) {
                if (isStale()) {
                    return;
                }

                /*
                 * Allow a retry only if the offer was never started.
                 * Re-arming after the offer exists would create a
                 * second negotiation.
                 */
                if (!offerStarted) {
                    initialOfferStartedRef.current = false;
                }

                const normalizedError =
                    caughtError instanceof Error
                        ? caughtError
                        : new Error("Unable to prepare the video call.");

                onFailedRef.current?.(normalizedError);
            }
        }

        void startVideoSession(avatarVideoTrack);
    }, [
        avatarVideoTrack,
        enabled,
        isAccepted,
        isCaller,
        isCameraEnabled,
        isVideoCall,
        isVideoSenderReady,
        initialVideoSource,
    ]);

    /*
     * Initial voice negotiation
     *
     * Voice calls have no avatar/video preparation requirement.
     * useWebRTC handles the initial voice offer itself, so nothing
     * is done here.
     */

    /*
     * Camera toggle
     *
     * If avatar mode is active, restore the physical camera track
     * before changing the physical camera state. This keeps the
     * avatar layer and WebRTC sender synchronized.
     */
    const handleCameraToggle = useCallback(async () => {
        if (isAvatarActive) {
            try {
                await disableAvatar();
            } catch {
                /*
                 * useAvatarMedia owns the detailed avatar error state.
                 */
                return;
            }
        }

        toggleCamera();
    }, [disableAvatar, isAvatarActive, toggleCamera]);

    /*
     * Avatar toggle
     *
     * Used after the call has been established. Switching
     * avatar/camera during an existing call uses
     * RTCRtpSender.replaceTrack(), so no SDP renegotiation is
     * required.
     */
    const handleAvatarToggle = useCallback(async () => {
        if (
            !isVideoCall ||
            !isCameraEnabled ||
            !avatarVideoTrack ||
            !isVideoSenderReady
        ) {
            return;
        }

        try {
            await toggleAvatar();
        } catch {
            /*
             * Detailed avatar failure is exposed by avatarError.
             */
        }
    }, [avatarVideoTrack, isCameraEnabled, isVideoCall, isVideoSenderReady, toggleAvatar]);

    /*
     * Public media session
     */
    return {
        /*
         * WebRTC streams
         */
        localStream,
        remoteStream,

        /*
         * WebRTC state
         */
        connectionState,
        error,
        isMuted,

        /*
         * The WebRTC camera state is authoritative. The incoming
         * isCameraEnabled option only decides whether avatar media
         * is allowed to operate.
         */
        isCameraEnabled: webRTCIsCameraEnabled,
        remoteAudioEnabled,
        remoteVideoEnabled,
        isConnected: webRTCConnected,
        isConnecting,

        /*
         * WebRTC controls
         */
        toggleMute,
        toggleCamera: handleCameraToggle,
        replaceVideoTrack,
        isVideoSenderReady,
        cleanup,

        /*
         * Avatar media
         */
        avatarStream,
        avatarVideoTrack,
        isAvatarActive,
        avatarError,
        handleAvatarCanvasReady,
        enableAvatar,
        disableAvatar,
        toggleAvatar: handleAvatarToggle,

        /*
         * Useful for consumers that need to know whether this
         * session is a video call.
         */
        isVideoCall,

        /*
         * Session-level inputs, retained for callers that need
         * them. The supplied connection state is exposed as
         * isCallConnected so it no longer collides with the
         * WebRTC isConnected above.
         */
        isAccepted,
        isCallConnected: isConnected,
    };
}