import { Chat, ChatParticipant } from '../types';

// Utility function to normalize chat data from API
export const normalizeChat = (rawChat: any): Chat => {
  // Normalize participants to ensure consistent structure
  const normalizedParticipants: ChatParticipant[] = rawChat.participants?.map((participant: any) => ({
    chatId: participant.chatId || rawChat.id,
    userId: participant.userId,
    joinedAt: participant.joinedAt || new Date().toISOString(),
    // Handle both possible API structures
    user: participant.user || {
      id: participant.userId,
      username: participant.username || 'Unknown User',
      createdAt: participant.joinedAt || new Date().toISOString()
    },
    username: participant.username || participant.user?.username || 'Unknown User'
  })) || [];

  return {
    id: rawChat.id,
    name: rawChat.name,
    type: rawChat.type || 'direct',
    createdAt: rawChat.createdAt,
    participants: normalizedParticipants,
    messages: rawChat.messages || []
  };
};

// Utility function to get chat display name
export const getChatDisplayName = (chat: Chat, currentUserId: number): string => {
  if (chat.type === 'group') {
    return chat.name;
  }
  
  // For direct chats, show the other participant's name
  const otherParticipant = chat.participants.find(p => p.userId !== currentUserId);
  
  if (otherParticipant) {
    return otherParticipant.user?.username || otherParticipant.username || 'Unknown User';
  }
  
  return 'Unknown User';
};

// Utility function to find existing direct chat between two users
export const findExistingDirectChat = (chats: Chat[], currentUserId: number, otherUserId: number): Chat | null => {
  return chats.find(chat => {
    // Only check direct chats
    if (chat.type !== 'direct') return false;
    
    // Check if this chat has exactly 2 participants: current user and the other user
    if (chat.participants.length !== 2) return false;
    
    const participantIds = chat.participants.map(p => p.userId);
    return participantIds.includes(currentUserId) && participantIds.includes(otherUserId);
  }) || null;
};
