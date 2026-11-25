"use client";

import type { ReactNode } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import {
    CALL_STATE,
    CALL_TYPE,
} from "@/app/types/calls/calls.types";
import { CallButton } from "./call-ui";

type Props = {
    state: string;
    type: string;

    isIncoming: boolean;
    isOutgoing: boolean;
    isAccepted: boolean;
    isConnected: boolean;

    isActionPending: boolean;

    onAccept: () => void;
    onDecline: () => void;
    onCancel: () => void;
    onEnd: () => void;

    /** Extra controls (mute, camera, speaker…) shown beside "End" once connected. */
    children?: ReactNode;
};

export function CallControls({
    state,
    type,
    isIncoming,
    isOutgoing,
    isAccepted,
    isConnected,
    isActionPending,
    onAccept,
    onDecline,
    onCancel,
    onEnd,
    children,
}: Props) {
    if (isIncoming) {
        return (
            <div className="flex items-start justify-center gap-14">
                <CallButton
                    icon={PhoneOff}
                    label="Decline call"
                    caption="Decline"
                    tone="danger"
                    size="lg"
                    disabled={isActionPending}
                    onClick={onDecline}
                />

                <CallButton
                    icon={type === CALL_TYPE.VIDEO ? Video : Phone}
                    label={
                        type === CALL_TYPE.VIDEO
                            ? "Accept video call"
                            : "Accept voice call"
                    }
                    caption="Answer"
                    tone="accept"
                    size="lg"
                    disabled={isActionPending}
                    loading={isActionPending}
                    onClick={onAccept}
                />
            </div>
        );
    }

    if (isOutgoing) {
        return (
            <div className="flex justify-center">
                <CallButton
                    icon={PhoneOff}
                    label="Cancel call"
                    caption="Cancel"
                    tone="danger"
                    size="lg"
                    disabled={isActionPending}
                    onClick={onCancel}
                />
            </div>
        );
    }

    /*
     * Accepted but WebRTC has not connected yet.
     *
     * There is deliberately NO accept button here.
     * WebRTC negotiation starts automatically.
     */
    if (isAccepted && !isConnected) {
        return (
            <div className="flex justify-center">
                <CallButton
                    icon={PhoneOff}
                    label="End call"
                    caption="End"
                    tone="danger"
                    size="lg"
                    disabled={isActionPending}
                    onClick={onEnd}
                />
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="flex flex-wrap items-center justify-center gap-3">
                {children}

                <CallButton
                    icon={PhoneOff}
                    label="End call"
                    tone="danger"
                    size="lg"
                    disabled={isActionPending}
                    onClick={onEnd}
                />
            </div>
        );
    }

    if (state === CALL_STATE.ENDED) {
        return null;
    }

    return null;
}