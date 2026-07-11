import { api } from "./api";

export interface MiniUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
}

export interface Message {
  id: number;
  conversation: number;
  sender: MiniUser;
  body: string;
  created_at: string;
  is_read_by_me: boolean;
}

export interface Conversation {
  id: number;
  type: "DIRECT" | "GROUP";
  name: string | null;
  participants: MiniUser[];
  latest_message: Message | null;
  unread_count: number;
  other_user: MiniUser | null;
  updated_at: string;
}

export const commsApi = {
  getConversations: async () => {
    const { data } = await api.get<Conversation[]>("/communications/conversations/");
    return data;
  },
  
  startDirect: async (userId: number) => {
    const { data } = await api.post<Conversation>("/communications/conversations/start_direct/", { user_id: userId });
    return data;
  },

  getMessages: async (conversationId: number) => {
    const { data } = await api.get<Message[]>(`/communications/conversations/${conversationId}/messages/`);
    return data;
  },

  sendMessage: async (conversationId: number, body: string) => {
    const { data } = await api.post<Message>(`/communications/conversations/${conversationId}/send_message/`, { body });
    return data;
  }
};
