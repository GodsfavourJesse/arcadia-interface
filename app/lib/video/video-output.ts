import { CanvasVideoOutput } from "./canvas-video-output";
import type {
    VideoOutput,
    VideoOutputSettings,
} from "../../types/video/video-output.types";

export function createVideoOutput(
    settings: VideoOutputSettings = {},
): VideoOutput {
    return new CanvasVideoOutput(settings);
}

export type {
    VideoOutput,
    VideoOutputDiagnostics,
    VideoOutputSettings,
    VideoOutputState,
} from "../../types/video/video-output.types";