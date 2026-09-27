// "use client";

// import {
//     useEffect,
//     useRef,
// } from "react";

// import type {
//     ConversationSocketEvent,
// } from "@/app/types/conversations/conversations.types";

// type UseConversationSocketOptions = {
//     conversationIds: string[];

//     onMessage?: (
//         message: Extract<
//             ConversationSocketEvent,
//             {
//                 type: "MESSAGE_NEW";
//             }
//         >["message"],
//     ) => void;

//     onRead?: (
//         event: Extract<
//             ConversationSocketEvent,
//             {
//                 type: "MESSAGE_READ";
//             }
//         >,
//     ) => void;
// };

// function getWebSocketUrl() {
//     const apiUrl =
//         process.env.NEXT_PUBLIC_API_URL ??
//         "http://localhost:4000";

//     const normalized =
//         apiUrl.replace(/\/$/, "");

//     return normalized
//         .replace(/^https:/, "wss:")
//         .replace(/^http:/, "ws:")
//         .concat("/conversations/ws");
// }

// export function useConversationSocket({
//     conversationIds,
//     onMessage,
//     onRead,
// }: UseConversationSocketOptions) {
//     const onMessageRef =
//         useRef(onMessage);

//     const onReadRef =
//         useRef(onRead);

//     const conversationIdsRef =
//         useRef(conversationIds);

//     useEffect(() => {
//         onMessageRef.current =
//             onMessage;
//     }, [onMessage]);

//     useEffect(() => {
//         onReadRef.current =
//             onRead;
//     }, [onRead]);

//     useEffect(() => {
//         conversationIdsRef.current =
//             conversationIds;
//     }, [conversationIds]);

//     const conversationIdsKey =
//         [...conversationIds]
//             .sort()
//             .join(",");

//     useEffect(() => {
//         if (
//             conversationIds.length === 0
//         ) {
//             return;
//         }

//         let socket:
//             | WebSocket
//             | null = null;

//         let reconnectTimer:
//             | ReturnType<typeof setTimeout>
//             | null = null;

//         let stopped = false;

//         const connect = () => {
//             if (stopped) {
//                 return;
//             }

//             socket =
//                 new WebSocket(
//                     getWebSocketUrl(),
//                 );

//             console.log(
//                 "[Conversation WS] Connecting...",
//             );

//             socket.addEventListener(
//                 "open",
//                 () => {
//                     if (stopped || !socket) {
//                         return;
//                     }

//                     console.log(
//                         "[Conversation WS] Connected",
//                     );

//                     for (const conversationId of
//                         conversationIdsRef.current) {
//                         socket.send(
//                             JSON.stringify({
//                                 type: "SUBSCRIBE_CONVERSATION",
//                                 conversationId,
//                             }),
//                         );

//                         console.log(
//                             "[Conversation WS] Subscribing:",
//                             conversationId,
//                         );
//                     }
//                 },
//             );

//             socket.addEventListener(
//                 "message",
//                 (event) => {
//                     let message:
//                         | ConversationSocketEvent
//                         | null = null;

//                     try {
//                         message =
//                             JSON.parse(
//                                 event.data,
//                             );
//                     } catch {
//                         console.error(
//                             "[Conversation WS] Invalid JSON:",
//                             event.data,
//                         );

//                         return;
//                     }

//                     if (!message) {
//                         return;
//                     }

//                     console.log(
//                         "[Conversation WS] Received:",
//                         message,
//                     );

//                     if (
//                         message.type ===
//                         "MESSAGE_NEW"
//                     ) {
//                         onMessageRef.current?.(
//                             message.message,
//                         );

//                         return;
//                     }

//                     if (
//                         message.type ===
//                         "MESSAGE_READ"
//                     ) {
//                         onReadRef.current?.(
//                             message,
//                         );

//                         return;
//                     }

//                     if (
//                         message.type ===
//                         "ERROR"
//                     ) {
//                         console.error(
//                             "[Conversation WS] Server error:",
//                             message.code,
//                             message.message,
//                         );

//                         return;
//                     }

//                     if (
//                         message.type ===
//                         "SUBSCRIBED"
//                     ) {
//                         console.log(
//                             "[Conversation WS] Subscribed:",
//                             message.conversationId,
//                         );
//                     }
//                 },
//             );

//             socket.addEventListener(
//                 "close",
//                 (event) => {
//                     console.log(
//                         "[Conversation WS] Closed:",
//                         event.code,
//                         event.reason,
//                     );

//                     if (stopped) {
//                         return;
//                     }

//                     reconnectTimer =
//                         setTimeout(() => {
//                             connect();
//                         }, 2000);
//                 },
//             );

//             socket.addEventListener(
//                 "error",
//                 (event) => {
//                     console.error(
//                         "[Conversation WS] WebSocket error:",
//                         event,
//                     );
//                 },
//             );
//         };

//         connect();

//         return () => {
//             stopped = true;

//             if (reconnectTimer) {
//                 clearTimeout(
//                     reconnectTimer,
//                 );
//             }

//             if (
//                 socket &&
//                 socket.readyState ===
//                     WebSocket.OPEN
//             ) {
//                 for (const conversationId of
//                     conversationIdsRef.current) {
//                     socket.send(
//                         JSON.stringify({
//                             type: "UNSUBSCRIBE_CONVERSATION",
//                             conversationId,
//                         }),
//                     );
//                 }
//             }

//             if (
//                 socket &&
//                 (
//                     socket.readyState ===
//                         WebSocket.OPEN ||
//                     socket.readyState ===
//                         WebSocket.CONNECTING
//                 )
//             ) {
//                 socket.close();
//             }

//             socket = null;
//         };
//     }, [conversationIdsKey]);
// }