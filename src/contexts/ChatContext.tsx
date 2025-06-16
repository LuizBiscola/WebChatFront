import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { Chat, Message, OnlineUser, TypingUser, MessageData, User } from '../types';
import { useUser } from './UserContext';
import { chatService } from '../services/chatService';
import { signalRService } from '../services/signalRService';
import { normalizeChat } from '../utils/chatUtils';
import { messageEmitter } from '../utils/messageEmitter';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: number]: Message[] };
  onlineUsers: OnlineUser[];
  typingUsers: { [chatId: number]: TypingUser[] };
  unreadCounts: { [chatId: number]: number };
  isConnected: boolean;
  isLoading: boolean;
  messageUpdateTrigger: number; // Add this to force re-renders
}

type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_ACTIVE_CHAT'; payload: Chat | null }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'REMOVE_CHAT'; payload: number }
  | { type: 'SET_MESSAGES'; payload: { chatId: number; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message | MessageData }
  | { type: 'UPDATE_MESSAGE'; payload: { chatId: number; messageId: number; updates: Partial<Message> } }
  | { type: 'SET_ONLINE_USERS'; payload: OnlineUser[] }
  | { type: 'USER_ONLINE'; payload: OnlineUser }
  | { type: 'USER_OFFLINE'; payload: { userId: number } }
  | { type: 'SET_TYPING'; payload: { chatId: number; users: TypingUser[] } }
  | { type: 'INCREMENT_UNREAD'; payload: { chatId: number } }
  | { type: 'CLEAR_UNREAD'; payload: { chatId: number } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: ChatState = {
  chats: [],
  activeChat: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  unreadCounts: {},
  isConnected: false,
  isLoading: true,
  messageUpdateTrigger: 0,
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
        sender: { 
          id: message.senderId, 
          username: message.senderUsername || `User ${message.senderId}`, 
          createdAt: '' 
        },
        content: message.content,
        timestamp: message.timestamp,
        status: message.status as 'sent' | 'delivered' | 'read',
      };
      
      // Garantir que o sender existe
      if (!newMessage.sender) {
        newMessage.sender = {
          id: newMessage.senderId,
          username: `User ${newMessage.senderId}`,
          createdAt: ''
        };
      }
      
      // Verificar se a mensagem já existe para evitar duplicatas
      // Verificação mais simples - apenas por ID se disponível
      const messageExists = currentMessages.some(msg => {
        // Se ambas as mensagens têm ID numérico válido, comparar por ID
        if (typeof msg.id === 'number' && typeof newMessage.id === 'number' && 
            msg.id > 0 && newMessage.id > 0) {
          return msg.id === newMessage.id;
        }
        
        // Caso contrário, verificar por conteúdo, sender e timestamp próximo
        const sameContent = msg.senderId === newMessage.senderId && 
                           msg.content === newMessage.content;
        const timeClose = Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 500;
        
        return sameContent && timeClose;
      });
      
      if (messageExists) {
        console.log('⚠️ Duplicate message detected, skipping:', {
          id: newMessage.id,
          content: newMessage.content.substring(0, 20) + '...',
          sender: newMessage.senderId
        });
        return state;
      }
      
      console.log('✅ Adding new message to chat', chatId, ':', newMessage.content);
      console.log('📊 Messages before:', currentMessages.length, 'after:', currentMessages.length + 1);
      
      const newMessagesArray = [...currentMessages, newMessage];
      
      // Emit event for direct component updates
      messageEmitter.emit('messageAdded', { chatId, message: newMessage });
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: newMessagesArray,
        },
        messageUpdateTrigger: state.messageUpdateTrigger + 1, // Force re-render
      };
    
    case 'UPDATE_MESSAGE':
      const { chatId: updateChatId, messageId, updates } = action.payload;
      const chatMessages = state.messages[updateChatId] || [];
      const updatedMessages = chatMessages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [updateChatId]: updatedMessages,
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
    
    case 'INCREMENT_UNREAD':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.chatId]: (state.unreadCounts[action.payload.chatId] || 0) + 1,
        },
      };
    
    case 'CLEAR_UNREAD':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.chatId]: 0,
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
  setOnNewMessage: (callback: ((chatId: number, senderName: string, content: string) => void) | null) => void;
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
  const newMessageCallbackRef = useRef<((chatId: number, senderName: string, content: string) => void) | null>(null);
  const activeChatRef = useRef<Chat | null>(null);
  
  // Manter activeChatRef sincronizado
  useEffect(() => {
    activeChatRef.current = state.activeChat;
  }, [state.activeChat]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Initialize SignalR connection
        await signalRService.start();
        
        // Set up event listeners
        signalRService.onReceiveMessage = (messageData: MessageData) => {
          console.log('� SIGNALR: Message received via SignalR!', messageData);
          console.log('📍 Current active chat ID:', activeChatRef.current?.id);
          console.log('📨 Message chat ID:', messageData.chatId);
          
          // Verificar se é uma mensagem para o chat ativo
          const isActiveChat = activeChatRef.current && messageData.chatId === activeChatRef.current.id;
          const isOwnMessage = messageData.senderId === user.id;
          
          console.log('🎯 Is active chat:', isActiveChat);
          console.log('👤 Is own message:', isOwnMessage);
          
          if (isActiveChat) {
            console.log('✅ Message for ACTIVE chat - should update immediately!');
          } else {
            console.log('📱 Message for INACTIVE chat:', messageData.chatId);
          }
          
          // Adicionar a mensagem SEMPRE - garantir que o estado seja atualizado
          console.log('➕ Adding message to state...');
          
          // Forçar uma nova referência do objeto messages
          dispatch({ type: 'ADD_MESSAGE', payload: messageData });
          
          // Forçar re-render do componente ativo
          if (isActiveChat) {
            console.log('🔄 Forcing active chat component update...');
            // Trigger adicional para garantir que o componente seja re-renderizado
            setTimeout(() => {
              dispatch({ type: 'SET_LOADING', payload: false });
            }, 10);
          }
          
          // Se não é o chat ativo e não é mensagem própria, incrementar contador
          if (!isActiveChat && !isOwnMessage) {
            console.log('📌 Incrementing unread count for chat:', messageData.chatId);
            dispatch({ type: 'INCREMENT_UNREAD', payload: { chatId: messageData.chatId } });
            
            // Chamar callback de notificação se existir
            if (newMessageCallbackRef.current) {
              console.log('🔔 Calling notification callback');
              newMessageCallbackRef.current(
                messageData.chatId, 
                messageData.senderUsername || `User ${messageData.senderId}`,
                messageData.content
              );
            }
          }
        };

        signalRService.onUserOnline = (userId: number, username: string) => {
          console.log('🟢 SignalR: User came online:', userId, username);
          dispatch({ type: 'USER_ONLINE', payload: { userId, username } });
        };

        signalRService.onUserOffline = (userId: number, _username: string) => {
          console.log('🔴 SignalR: User went offline:', userId);
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
          console.log('🔗 SignalR Connection State Changed:', isConnected);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: isConnected });
        };

        // Join user
        console.log('🔗 Joining SignalR user:', user.id, user.username);
        await signalRService.joinUser(user.id, user.username);
        
        // Load initial data
        console.log('📋 Loading initial chats...');
        await loadChats();
        
        console.log('✅ SignalR and chat initialization complete!');
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
      console.log('Raw messages from API:', messages);
      
      // Enriquecer mensagens com dados de usuários
      const enrichedMessages = await enrichMessagesWithUserData(messages);
      console.log('Enriched messages:', enrichedMessages);
      
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: enrichedMessages } });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (chatId: number, content: string) => {
    // Criar ID temporário único
    const tempId = Date.now();
    
    try {
      console.log(`Sending message to chat ${chatId}:`, content);
      
      // Criar mensagem temporária para exibir imediatamente
      const tempMessage: Message = {
        id: tempId,
        chatId,
        senderId: user.id,
        sender: user,
        content,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      // Adicionar mensagem localmente imediatamente
      dispatch({ type: 'ADD_MESSAGE', payload: tempMessage });
      
      // Send via HTTP API for persistence
      const savedMessage = await chatService.sendMessage(chatId, user.id, content);
      console.log('Message sent successfully:', savedMessage);
      
      // Se o ID da mensagem salva for diferente, atualizar a mensagem temporária
      if (savedMessage.id !== tempId) {
        dispatch({ 
          type: 'UPDATE_MESSAGE', 
          payload: { 
            chatId, 
            messageId: tempId, 
            updates: { 
              id: savedMessage.id,
              timestamp: savedMessage.timestamp,
              status: savedMessage.status 
            } 
          } 
        });
      }
      
      // Real-time notification is handled by the backend via SignalR
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Atualizar status da mensagem para erro
      dispatch({ 
        type: 'UPDATE_MESSAGE', 
        payload: { 
          chatId, 
          messageId: tempId, 
          updates: { 
            status: 'failed' as any // Vamos adicionar este status
          } 
        } 
      });
      
      // Check if it's a network error
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          console.error('Chat endpoint not found - check backend API routes');
        } else if (error.message.includes('fetch')) {
          console.error('Network error - backend may not be running');
        }
      }
      
      // Re-throw to let the UI handle the error
      throw error;
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
    console.log('🎯 Setting active chat:', chat?.id);
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat });
    
    if (chat) {
      console.log('📌 Clearing unread count for chat:', chat.id);
      // Clear unread count for the selected chat
      dispatch({ type: 'CLEAR_UNREAD', payload: { chatId: chat.id } });
      
      console.log('📬 Loading messages for chat:', chat.id);
      // Load messages for the active chat
      loadMessages(chat.id);
      
      console.log('🔗 Joining SignalR chat group:', chat.id);
      // Join the chat room
      signalRService.joinChat(chat.id).then(() => {
        console.log('✅ Successfully joined SignalR chat group:', chat.id);
      }).catch((error) => {
        console.error('❌ Failed to join SignalR chat group:', chat.id, error);
      });
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

  // Função para enriquecer mensagens com dados de usuários (otimizada)
  const enrichMessagesWithUserData = async (messages: any[]): Promise<Message[]> => {
    // Cache para evitar múltiplas requisições para o mesmo usuário
    const userCache = new Map<number, User>();
    
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        try {
          // Se já tem sender completo, usar ele
          if (msg.sender && msg.sender.username) {
            return msg;
          }
          
          // Verificar cache primeiro
          let senderInfo = userCache.get(msg.senderId);
          
          if (!senderInfo) {
            // Tentar buscar dados do usuário apenas se não estiver no cache
            try {
              senderInfo = await chatService.getUserById(msg.senderId);
              userCache.set(msg.senderId, senderInfo);
            } catch (error) {
              console.warn(`Could not fetch user data for ID ${msg.senderId}:`, error);
              senderInfo = {
                id: msg.senderId,
                username: `User ${msg.senderId}`,
                createdAt: ''
              };
              userCache.set(msg.senderId, senderInfo);
            }
          }
          
          return {
            ...msg,
            sender: senderInfo
          };
        } catch (error) {
          console.error('Error enriching message:', error);
          return {
            ...msg,
            sender: {
              id: msg.senderId,
              username: `User ${msg.senderId}`,
              createdAt: ''
            }
          };
        }
      })
    );
    
    return enrichedMessages;
  };

  const setOnNewMessage = (callback: ((chatId: number, senderName: string, content: string) => void) | null) => {
    newMessageCallbackRef.current = callback;
  };

  // Função de debug para testar se o sistema funciona manualmente
  const testManualMessage = () => {
    if (activeChatRef.current) {
      const testMessage = {
        id: Date.now(),
        chatId: activeChatRef.current.id,
        senderId: 999,
        senderUsername: 'Test User',
        content: `Test message at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      console.log('🧪 Manual test: Adding message:', testMessage);
      dispatch({ type: 'ADD_MESSAGE', payload: testMessage });
    } else {
      console.log('❌ No active chat for manual test');
    }
  };

  // Expor para debug no console
  (window as any).testManualMessage = testManualMessage;
  (window as any).debugChatState = () => {
    console.log('🔍 Debug Chat State:');
    console.log('- Active Chat:', activeChatRef.current);
    console.log('- All Messages:', state.messages);
    console.log('- SignalR Connected:', state.isConnected);
    console.log('- SignalR Service:', signalRService);
    console.log('- SignalR Connection State:', signalRService.isConnected);
  };
  
  // Nova função para testar conexão SignalR
  (window as any).testSignalRConnection = async () => {
    console.log('🧪 Testing SignalR Connection...');
    console.log('- IsConnected:', state.isConnected);
    console.log('- SignalR Service connected:', signalRService.isConnected);
    
    if (activeChatRef.current) {
      try {
        console.log('- Trying to join chat:', activeChatRef.current.id);
        await signalRService.joinChat(activeChatRef.current.id);
        console.log('✅ Successfully joined chat via SignalR');
      } catch (error) {
        console.error('❌ Failed to join chat via SignalR:', error);
      }
    }
  };
  
  // Função para simular recebimento de mensagem via SignalR
  (window as any).simulateSignalRMessage = () => {
    if (activeChatRef.current) {
      const testSignalRMessage = {
        id: Date.now(),
        chatId: activeChatRef.current.id,
        senderId: 999,
        senderUsername: 'SignalR Test User',
        content: `Test SignalR message at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      console.log('🧪 Simulating SignalR message receipt:', testSignalRMessage);
      
      // Simular recebimento via SignalR
      if (signalRService.onReceiveMessage) {
        signalRService.onReceiveMessage(testSignalRMessage);
      } else {
        console.error('❌ onReceiveMessage handler not set');
      }
    } else {
      console.log('❌ No active chat for SignalR simulation');
    }
  };

  // Função de teste para verificar se a atualização funciona
  const testAddMessage = () => {
    if (state.activeChat) {
      const testMessage = {
        id: Date.now(),
        chatId: state.activeChat.id,
        senderId: 999,
        senderUsername: 'Test User',
        content: 'Test message from manual trigger',
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      console.log('🧪 Test: Adding message manually:', testMessage);
      dispatch({ type: 'ADD_MESSAGE', payload: testMessage });
    }
  };

  // Função de debug para testar SignalR
  const testSignalR = () => {
    console.log('🧪 Testing SignalR connection...');
    console.log('🔗 SignalR connected:', state.isConnected);
    
    if (state.activeChat) {
      console.log('📡 Simulating message receipt...');
      const testSignalRMessage = {
        id: Date.now(),
        chatId: state.activeChat.id,
        senderId: 999,
        senderUsername: 'SignalR Test User',
        content: 'Test message from SignalR simulation',
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      // Simular recebimento via SignalR
      signalRService.onReceiveMessage?.(testSignalRMessage);
    }
  };

  // Expor para debug
  (window as any).testSignalR = testSignalR;

  // Expor para debug (remover depois)
  (window as any).testAddMessage = testAddMessage;

  const contextValue: ChatContextType = {
    ...state,
    loadChats,
    loadMessages,
    sendMessage,
    createChat,
    deleteChat,
    setActiveChat,
    sendTyping,
    setOnNewMessage,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};