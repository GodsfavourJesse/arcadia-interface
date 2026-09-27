export type ConversationType =
    | "direct"
    | "group";

export type ConversationParticipant = {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    profilePictureUrl:
        string | null;
};

export type ConversationSummary = {
    id: string;
    type: ConversationType;
    createdAt: string;
    updatedAt: string;

    participant:
        | ConversationParticipant
        | null;

    lastMessage: {
        id: string;
        body: string;
        senderId: string;
        createdAt: string;
    } | null;

    unreadCount: number;
};

export type ConversationMember = {
    id: string;
    conversationId: string;
    userId: string;
    role: "member" | "admin";
    joinedAt: string;

    user: ConversationParticipant;
};

export type ConversationDetails = {
    id: string;
    type: ConversationType;
    createdAt: string;
    updatedAt: string;
    members: ConversationMember[];
};

export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    readAt: string | null;
    deletedAt: string | null;

    sender: {
        id: string;
        displayName: string;
        username: string;
        profilePictureUrl:
            string | null;
    };
};

export type ConversationsResponse = {
    status: "ok";
    conversations: ConversationSummary[];
};

export type ConversationResponse = {
    status: "ok";
    conversation: ConversationDetails;
};

export type MessagesResponse = {
    status: "ok";
    messages: Message[];
};

export type CreateConversationResponse = {
    status: "ok";
    conversation: {
        id: string;
        type: ConversationType;
        createdAt: string;
        updatedAt: string;
    };
};

export type SendMessageResponse = {
    status: "ok";
    message: Message;
};

export type MarkConversationReadResponse = {
    status: "ok";
    readAt: string | null;
    messageIds: string[];
};

export type ConversationSocketEvent =
    | {
          type: "CONNECTED";
          userId: string;
      }
    | {
          type: "SUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "MESSAGE_NEW";
          message: Message;
      }
    | {
          type: "MESSAGE_READ";
          conversationId: string;
          readerId: string;
          messageIds: string[];
          readAt: string;
      }
    | {
          type: "ERROR";
          code: string;
          message: string;
      };