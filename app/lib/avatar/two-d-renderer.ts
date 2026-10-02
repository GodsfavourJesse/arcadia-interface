import {
    Fit,
    Layout,
    Rive,
    type StateMachineInput,
} from "@rive-app/canvas";

import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

import type { AvatarRenderer } from "./avatar-renderer";

import {
    createRiveTrackingInputs,
    updateRiveTrackingInputs,
    type RiveTrackingInputs,
    type RiveTrackingParameterMapping,
} from "./rive-tracking-adapter";

const DEFAULT_STATE_MACHINE = "Avatar";

const MAX_PIXEL_RATIO = 2;

export type TwoDRendererOptions = {
    stateMachineName?: string;
    parameterMapping?: RiveTrackingParameterMapping;
};

export class TwoDRenderer implements AvatarRenderer {
    private readonly canvas: HTMLCanvasElement;

    private readonly stateMachineName: string;
    private readonly parameterMapping:
        RiveTrackingParameterMapping;

    private rive: Rive | null = null;

    private trackingInputs: RiveTrackingInputs | null =
        null;

    private disposed = false;
    private loaded = false;

    constructor(
        canvas: HTMLCanvasElement,
        options: TwoDRendererOptions = {},
    ) {
        this.canvas = canvas;

        this.stateMachineName =
            options.stateMachineName ??
            DEFAULT_STATE_MACHINE;

        this.parameterMapping =
            options.parameterMapping ?? {};

        this.configureCanvas();
    }

    async load(
        avatar: AvatarDefinition,
    ): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.unloadRive();

        const rive = await this.createRiveInstance(
            avatar.assetUrl,
        );

        if (this.disposed) {
            rive.cleanup();
            return;
        }

        this.rive = rive;

        const stateMachineInputs =
            this.getStateMachineInputs(
                rive,
            );

        this.trackingInputs =
            createRiveTrackingInputs(
                stateMachineInputs,
                this.parameterMapping,
            );

        this.loaded = true;

        this.resize(
            Math.max(this.canvas.clientWidth, 1),
            Math.max(this.canvas.clientHeight, 1),
        );
    }

    update(
        tracking: AvatarTrackingState,
    ): void {
        if (
            this.disposed ||
            !this.loaded ||
            !this.trackingInputs
        ) {
            return;
        }

        updateRiveTrackingInputs(
            this.trackingInputs,
            tracking,
        );
    }

    resize(
        width: number,
        height: number,
    ): void {
        if (this.disposed) {
            return;
        }

        const safeWidth = Math.max(
            Math.floor(width),
            1,
        );

        const safeHeight = Math.max(
            Math.floor(height),
            1,
        );

        this.canvas.style.width =
            `${safeWidth}px`;

        this.canvas.style.height =
            `${safeHeight}px`;

        this.canvas.width =
            Math.max(
                Math.floor(
                    safeWidth *
                        Math.min(
                            window.devicePixelRatio,
                            MAX_PIXEL_RATIO,
                        ),
                ),
                1,
            );

        this.canvas.height =
            Math.max(
                Math.floor(
                    safeHeight *
                        Math.min(
                            window.devicePixelRatio,
                            MAX_PIXEL_RATIO,
                        ),
                ),
                1,
            );

        this.rive?.resizeDrawingSurfaceToCanvas();
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        this.unloadRive();

        this.trackingInputs = null;
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private configureCanvas(): void {
        this.canvas.style.display = "block";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";

        this.canvas.width = 1;
        this.canvas.height = 1;
    }

    private createRiveInstance(
        assetUrl: string,
    ): Promise<Rive> {
        return new Promise(
            (resolve, reject) => {
                let settled = false;

                const rive = new Rive({
                    src: assetUrl,
                    canvas: this.canvas,

                    autoplay: true,

                    stateMachines: [
                        this.stateMachineName,
                    ],

                    layout: new Layout({
                        fit: Fit.Contain,
                    }),

                    onLoad: () => {
                        if (settled) {
                            return;
                        }

                        settled = true;

                        rive.resizeDrawingSurfaceToCanvas();

                        resolve(rive);
                    },

                    onLoadError: (
                        error: unknown,
                    ) => {
                        if (settled) {
                            return;
                        }

                        settled = true;

                        rive.cleanup();

                        reject(
                            new Error(
                                `Failed to load 2D avatar "${assetUrl}".`,
                                {
                                    cause: error,
                                },
                            ),
                        );
                    },
                });
            },
        );
    }

    private getStateMachineInputs(
        rive: Rive,
    ): StateMachineInput[] {
        return (
            rive.stateMachineInputs(
                this.stateMachineName,
            ) ?? []
        );
    }

    private unloadRive(): void {
        const currentRive = this.rive;

        this.rive = null;
        this.loaded = false;
        this.trackingInputs = null;

        if (!currentRive) {
            return;
        }

        currentRive.cleanup();
    }
}