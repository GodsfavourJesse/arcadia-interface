// "use client";

// import {
//     useCallback,
// } from "react";

// import {
//     useActiveCall,
// } from "@/app/hooks/calls/useActiveCall";

// import {
//     useWebRTC,
// } from "@/app/hooks/calls/useWebRTC";

// import {
//     useCallStore,
// } from "@/app/store/calls/call.store";

// import {
//     CallMedia,
// } from "./call-media";

// import {
//     RemoteAudio,
// } from "./remote-audio";

// import {
//     CallMediaControls,
// } from "./call-media-controls";

// export function ActiveCallView() {
//     const {
//         activeCall,
//         myParticipant,
//         otherParticipant,
//         isAccepted,
//     } = useActiveCall();

//     const markConnected =
//         useCallStore(
//             (state) =>
//                 state.markConnected,
//         );

//     const endCall =
//         useCallStore(
//             (state) =>
//                 state.end,
//         );

//     const handleConnected =
//         useCallback(() => {
//             if (!activeCall) {
//                 return;
//             }

//             void markConnected();
//         }, [
//             activeCall,
//             markConnected,
//         ]);

//     const {
//         localStream,
//         remoteStream,
//         connectionState,
//         isMuted,
//         isCameraEnabled,
//         toggleMute,
//         toggleCamera,
//     } = useWebRTC({
//         callId:
//             activeCall?.id ?? null,

//         callType:
//             activeCall?.type ?? null,

//         isCaller:
//             myParticipant?.role ===
//             "caller",

//         enabled:
//             Boolean(activeCall) &&
//             isAccepted,

//         onConnected:
//             handleConnected,
//     });

//     if (!activeCall) {
//         return null;
//     }

//     const isVideo =
//         activeCall.type === "video";

//     const status =
//         connectionState ===
//         "connected"
//             ? "Connected"
//             : connectionState ===
//                 "requesting-media"
//               ? "Requesting microphone…"
//               : connectionState ===
//                   "connecting"
//                 ? "Connecting…"
//                 : "Waiting…";

//     return (
//         <div className="fixed inset-0 z-50 bg-black">
//             <CallMedia
//                 localStream={localStream}
//                 remoteStream={remoteStream}
//                 video={isVideo}
//             />

//             <RemoteAudio
//                 stream={remoteStream}
//             />

//             <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-6">
//                 <div className="mx-auto max-w-4xl">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-lg font-semibold text-white">
//                                 {otherParticipant?.userId ??
//                                     "Miyor user"}
//                             </p>

//                             <p className="text-sm text-white/60">
//                                 {status}
//                             </p>
//                         </div>

//                         <div className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/70">
//                             {activeCall.type ===
//                             "video"
//                                 ? "Video call"
//                                 : "Voice call"}
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <div className="absolute inset-x-0 bottom-0 z-20 p-6">
//                 <CallMediaControls
//                     muted={isMuted}
//                     cameraEnabled={
//                         isCameraEnabled
//                     }
//                     video={isVideo}
//                     onToggleMute={
//                         toggleMute
//                     }
//                     onToggleCamera={
//                         toggleCamera
//                     }
//                     onEnd={() =>
//                         void endCall(
//                             activeCall.id,
//                         )
//                     }
//                 />
//             </div>
//         </div>
//     );
// }