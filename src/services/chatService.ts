import { apiService } from './api';
import { Chat, Message, User } from '../types';

class ChatService {
  async getUserChats(userId: number): Promise<Chat[]> {
    return apiService.get<Chat[]>(`/chat/user/${userId}`);
  }

  async getChatById(chatId: number): Promise<Chat> {
    return apiService.get<Chat>(`/chat/${chatId}`);
  }

  async createChat(name: string, participantIds: number[]): Promise<Chat> {
    return apiService.post<Chat>('/chat', {
      name,
      participantUserIds: participantIds,
    });
  }

  async createOrGetDirectChat(userId1: number, userId2: number): Promise<Chat> {
    return apiService.post<Chat>('/chat/direct', {
      userId1,
      userId2,
    });
  }

  async deleteChat(chatId: number): Promise<void> {
    return apiService.delete(`/chat/${chatId}`);
  }

  async getChatMessages(chatId: number, take = 50, skip = 0): Promise<Message[]> {
    return apiService.get<Message[]>(`/chat/${chatId}/messages?take=${take}&skip=${skip}`);
  }

  async sendMessage(chatId: number, senderId: number, content: string): Promise<Message> {
    return apiService.post<Message>(`/chat/${chatId}/messages`, {
      senderId,
      content,
    });
  }

  async updateMessageStatus(chatId: number, messageId: number, status: string): Promise<void> {
    return apiService.put(`/chat/${chatId}/messages/${messageId}/status`, {
      status,
    });
  }

  // User services
  async getAllUsers(): Promise<User[]> {
    return apiService.get<User[]>('/users');
  }

  async getUserById(userId: number): Promise<User> {
    return apiService.get<User>(`/users/${userId}`);
  }

  async getUserByUsername(username: string): Promise<User> {
    return apiService.get<User>(`/users/username/${username}`);
  }

  async createUser(username: string): Promise<User> {
    return apiService.post<User>('/users', { username });
  }
}

export const chatService = new ChatService();