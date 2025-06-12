export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface Chat {
  id: number;
  name: string;
  type: 'direct' | 'group';
  createdAt: string;
  participants: ChatParticipant[];
  messages: Message[];
}

export interface ChatParticipant {
  chatId: number;
  userId: number;
  user?: User; // Make it optional to handle both API structures
  username?: string; // Add direct username property
  joinedAt: string;
}

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  sender: User;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface OnlineUser {
  userId: number;
  username: string;
}

export interface TypingUser {
  userId: number;
  username: string;
  isTyping: boolean;
}

export interface MessageData {
  id: number | string;
  chatId: number;
  senderId: number;
  senderUsername: string;
  content: string;
  timestamp: string;
  status: string;
}