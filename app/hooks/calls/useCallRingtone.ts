"use client";

import {
    useEffect,
    useRef,
} from "react";

const RING_INTERVAL_MS = 1_800;
const RING_DURATION_MS = 900;

export function useCallRingtone(
    enabled: boolean,
) {
    const audioContextRef =
        useRef<AudioContext | null>(null);

    const intervalRef =
        useRef<ReturnType<typeof setInterval> | null>(
            null,
        );

    const stopRing = () => {
        if (intervalRef.current) {
            clearInterval(
                intervalRef.current,
            );
            intervalRef.current = null;
        }

        const context =
            audioContextRef.current;

        if (context) {
            void context.close().catch(
                () => undefined,
            );
            audioContextRef.current = null;
        }
    };

    const getContext = () => {
        let context =
            audioContextRef.current;

        if (context) {
            return context;
        }

        const AudioContextClass =
            window.AudioContext ??
            (
                window as typeof window & {
                    webkitAudioContext?: typeof AudioContext;
                }
            ).webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        context =
            new AudioContextClass();

        audioContextRef.current =
            context;

        return context;
    };

    const playRing = async () => {
        const context =
            getContext();

        if (!context) {
            return;
        }

        if (context.state === "suspended") {
            try {
                await context.resume();
            } catch {
                return;
            }
        }

        const now =
            context.currentTime;

        const gain =
            context.createGain();

        gain.gain.setValueAtTime(
            0.0001,
            now,
        );

        gain.gain.exponentialRampToValueAtTime(
            0.32,
            now + 0.03,
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now +
                RING_DURATION_MS /
                    1000,
        );

        gain.connect(
            context.destination,
        );

        const oscillator =
            context.createOscillator();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
            880,
            now,
        );
        oscillator.frequency.setValueAtTime(
            660,
            now + 0.30,
        );
        oscillator.frequency.setValueAtTime(
            880,
            now + 0.58,
        );

        oscillator.connect(gain);
        oscillator.start(now);
        oscillator.stop(
            now +
                RING_DURATION_MS /
                    1000,
        );

        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
    };

    useEffect(() => {
        if (!enabled) {
            stopRing();
            return;
        }

        /*
         * If the user has already interacted with the page,
         * the AudioContext can usually resume immediately.
         *
         * If the browser blocks autoplay, the first subsequent
         * pointer/keyboard interaction unlocks the context and
         * starts the ringtone.
         */
        const unlock =
            () => {
                void playRing();
            };

        window.addEventListener(
            "pointerdown",
            unlock,
        );
        window.addEventListener(
            "keydown",
            unlock,
        );

        void playRing();

        intervalRef.current =
            setInterval(() => {
                void playRing();
            }, RING_INTERVAL_MS);

        return () => {
            window.removeEventListener(
                "pointerdown",
                unlock,
            );
            window.removeEventListener(
                "keydown",
                unlock,
            );
            stopRing();
        };
    }, [enabled]);

    return {
        stop: stopRing,
    };
}
