import * as signalR from '@microsoft/signalr';
import { MessageData } from '../types';
import environment from '../config/environment';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  public isConnected = false;

  async start(): Promise<void> {
    if (this.connection) {
      return;
    }

    console.log('SignalR: Initializing connection...');
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalRUrl, {
        withCredentials: true,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    this.setupConnectionEvents();

    try {
      console.log('SignalR: Starting connection...');
      await this.connection.start();
      this.isConnected = true;
      this.onConnectionStateChanged?.(true);
      console.log('SignalR Connected successfully');
    } catch (error) {
      console.error('SignalR Connection Error:', error);
      
      // Try HTTP fallback
      try {
        console.log('SignalR: Trying HTTP fallback...');
        await this.startWithFallback();
      } catch (fallbackError) {
        console.error('SignalR Fallback Connection Error:', fallbackError);
        throw fallbackError;
      }
    }
  }

  private async startWithFallback(): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalRUrlHttp, {
        withCredentials: true,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.LongPolling
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    this.setupConnectionEvents();
    
    await this.connection.start();
    this.isConnected = true;
    this.onConnectionStateChanged?.(true);
    console.log('SignalR Connected via HTTP fallback');
  }

  private setupConnectionEvents(): void {
    if (!this.connection) return;

    this.connection.onreconnecting(() => {
      console.log('SignalR: Attempting to reconnect...');
      this.isConnected = false;
      this.onConnectionStateChanged?.(false);
    });

    this.connection.onreconnected(() => {
      console.log('SignalR: Reconnected successfully');
      this.isConnected = true;
      this.onConnectionStateChanged?.(true);
    });

    this.connection.onclose((error) => {
      console.log('SignalR: Connection closed', error);
      this.isConnected = false;
      this.onConnectionStateChanged?.(false);
    });

    // Setup message handlers
    this.connection.on('ReceiveMessage', (messageData: MessageData) => {
      console.log('🚨 SignalR Service: ReceiveMessage event triggered!', messageData);
      console.log('📡 SignalR: Raw message data:', JSON.stringify(messageData, null, 2));
      this.onReceiveMessage?.(messageData);
    });

    this.connection.on('UserOnline', (userId: number, username: string) => {
      console.log('SignalR: User online', userId, username);
      this.onUserOnline?.(userId, username);
    });

    this.connection.on('UserOffline', (userId: number, username: string) => {
      console.log('SignalR: User offline', userId, username);
      this.onUserOffline?.(userId, username);
    });

    this.connection.on('UserTyping', (userId: number, username: string, isTyping: boolean) => {
      console.log('SignalR: User typing', userId, username, isTyping);
      this.onUserTyping?.(userId, username, isTyping);
    });
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.isConnected = false;
    }
  }

  async joinUser(userId: number, username: string): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.invoke('JoinUser', userId, username);
    }
  }

  async joinChat(chatId: number): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.invoke('JoinChat', chatId);
    }
  }

  async leaveChat(chatId: number): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.invoke('LeaveChat', chatId);
    }
  }

  async sendMessageToChat(chatId: number, message: string): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.invoke('SendMessageToChat', chatId, message);
    }
  }

  async sendTyping(chatId: number, isTyping: boolean): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.invoke('SendTyping', chatId, isTyping);
    }
  }

  async markMessagesAsRead(chatId: number, lastReadMessageId: number): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.invoke('MarkMessagesAsRead', chatId, lastReadMessageId);
    }
  }

  // Event handlers
  onReceiveMessage?: (messageData: MessageData) => void;
  onUserOnline?: (userId: number, username: string) => void;
  onUserOffline?: (userId: number, username: string) => void;
  onUserTyping?: (userId: number, username: string, isTyping: boolean, chatId?: number) => void;
  onConnectionStateChanged?: (isConnected: boolean) => void;

  constructor() {
    // Event listeners will be set up when connection is established
  }
}

export const signalRService = new SignalRService();