import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Chat, Message, OnlineUser, TypingUser, MessageData } from '../types';
import { useUser } from './UserContext';
import { chatService } from '../services/chatService';
import { signalRService } from '../services/signalRService';
import { normalizeChat } from '../utils/chatUtils';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: number]: Message[] };
  onlineUsers: OnlineUser[];
  typingUsers: { [chatId: number]: TypingUser[] };
  isConnected: boolean;
  isLoading: boolean;
}

type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_ACTIVE_CHAT'; payload: Chat | null }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'REMOVE_CHAT'; payload: number }
  | { type: 'SET_MESSAGES'; payload: { chatId: number; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message | MessageData }
  | { type: 'SET_ONLINE_USERS'; payload: OnlineUser[] }
  | { type: 'USER_ONLINE'; payload: OnlineUser }
  | { type: 'USER_OFFLINE'; payload: { userId: number } }
  | { type: 'SET_TYPING'; payload: { chatId: number; users: TypingUser[] } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: ChatState = {
  chats: [],
  activeChat: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  isConnected: false,
  isLoading: true,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChat: action.payload };
    
    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };
    
    case 'REMOVE_CHAT':
      return { 
        ...state, 
        chats: state.chats.filter(chat => chat.id !== action.payload),
        activeChat: state.activeChat?.id === action.payload ? null : state.activeChat
      };
    
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages,
        },
      };
    
    case 'ADD_MESSAGE':
      const message = action.payload;
      const chatId = message.chatId;
      const currentMessages = state.messages[chatId] || [];
      
      // Convert MessageData to Message if needed
      const newMessage: Message = 'sender' in message ? message : {
        id: typeof message.id === 'string' ? Date.now() : message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        sender: { id: message.senderId, username: message.senderUsername, createdAt: '' },
        content: message.content,
        timestamp: message.timestamp,
        status: message.status as 'sent' | 'delivered' | 'read',
      };
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: [...currentMessages, newMessage],
        },
      };
    
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    
    case 'USER_ONLINE':
      const existingOnlineUser = state.onlineUsers.find(u => u.userId === action.payload.userId);
      if (existingOnlineUser) return state;
      return { ...state, onlineUsers: [...state.onlineUsers, action.payload] };
    
    case 'USER_OFFLINE':
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(u => u.userId !== action.payload.userId),
      };
    
    case 'SET_TYPING':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: action.payload.users,
        },
      };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    default:
      return state;
  }
}

interface ChatContextType extends ChatState {
  loadChats: () => Promise<void>;
  loadMessages: (chatId: number) => Promise<void>;
  sendMessage: (chatId: number, content: string) => Promise<void>;
  createChat: (name: string, participantIds: number[]) => Promise<Chat>;
  deleteChat: (chatId: number) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendTyping: (chatId: number, isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useUser();
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Initialize SignalR connection
        await signalRService.start();
        
        // Set up event listeners
        signalRService.onReceiveMessage = (messageData: MessageData) => {
          dispatch({ type: 'ADD_MESSAGE', payload: messageData });
        };

        signalRService.onUserOnline = (userId: number, username: string) => {
          dispatch({ type: 'USER_ONLINE', payload: { userId, username } });
        };

        signalRService.onUserOffline = (userId: number, _username: string) => {
          dispatch({ type: 'USER_OFFLINE', payload: { userId } });
        };

        signalRService.onUserTyping = (userId: number, username: string, isTyping: boolean, chatId?: number) => {
          if (chatId) {
            const currentTyping = state.typingUsers[chatId] || [];
            let newTyping: TypingUser[];
            
            if (isTyping) {
              const existingUser = currentTyping.find(u => u.userId === userId);
              if (!existingUser) {
                newTyping = [...currentTyping, { userId, username, isTyping }];
              } else {
                newTyping = currentTyping;
              }
            } else {
              newTyping = currentTyping.filter(u => u.userId !== userId);
            }
            
            dispatch({ type: 'SET_TYPING', payload: { chatId, users: newTyping } });
          }
        };

        signalRService.onConnectionStateChanged = (isConnected: boolean) => {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: isConnected });
        };

        // Join user
        await signalRService.joinUser(user.id, user.username);
        
        // Load initial data
        await loadChats();
        
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error initializing chat:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeChat();

    return () => {
      signalRService.stop();
    };
  }, [user]);

  const loadChats = async () => {
    try {
      const rawChats = await chatService.getUserChats(user.id);
      const normalizedChats = rawChats.map(normalizeChat);
      dispatch({ type: 'SET_CHATS', payload: normalizedChats });
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const messages = await chatService.getChatMessages(chatId);
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages } });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (chatId: number, content: string) => {
    try {
      // Send via HTTP API for persistence
      await chatService.sendMessage(chatId, user.id, content);
      
      // Real-time notification is handled by the backend via SignalR
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createChat = async (name: string, participantIds: number[]) => {
    try {
      let rawChat: any;

      // For direct chats (2 participants), use the dedicated endpoint
      if (participantIds.length === 2) {
        const otherUserId = participantIds.find(id => id !== user.id);
        if (otherUserId) {
          console.log('Creating/getting direct chat between users:', user.id, 'and', otherUserId);
          rawChat = await chatService.createOrGetDirectChat(user.id, otherUserId);
        } else {
          throw new Error('Invalid participant IDs for direct chat');
        }
      } else {
        // For group chats, use the regular endpoint
        console.log('Creating group chat with participants:', participantIds);
        rawChat = await chatService.createChat(name, participantIds);
      }

      console.log('Raw chat from API:', rawChat);
      
      const normalizedChat = normalizeChat(rawChat);
      console.log('Normalized chat:', normalizedChat);
      
      // Check if this chat is already in our local state
      const existingChatIndex = state.chats.findIndex(chat => chat.id === normalizedChat.id);
      
      if (existingChatIndex === -1) {
        // It's a new chat, add it to the list
        console.log('Adding new chat to list');
        dispatch({ type: 'ADD_CHAT', payload: normalizedChat });
      } else {
        // It's an existing chat, just log it
        console.log('Chat already exists in list, opening existing chat');
      }
      
      // Join the chat room
      await signalRService.joinChat(normalizedChat.id);
      
      // Set as active chat
      dispatch({ type: 'SET_ACTIVE_CHAT', payload: normalizedChat });
      
      // Load messages for the chat
      loadMessages(normalizedChat.id);
      
      return normalizedChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const setActiveChat = (chat: Chat | null) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat });
    
    if (chat) {
      // Load messages for the active chat
      loadMessages(chat.id);
      
      // Join the chat room
      signalRService.joinChat(chat.id);
    }
  };

  const sendTyping = (chatId: number, isTyping: boolean) => {
    signalRService.sendTyping(chatId, isTyping);
  };

  const deleteChat = async (chatId: number) => {
    try {
      await chatService.deleteChat(chatId);
      dispatch({ type: 'REMOVE_CHAT', payload: chatId });
      console.log('Chat deleted successfully:', chatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  };

  const contextValue: ChatContextType = {
    ...state,
    loadChats,
    loadMessages,
    sendMessage,
    createChat,
    deleteChat,
    setActiveChat,
    sendTyping,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};