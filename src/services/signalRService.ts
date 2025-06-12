import * as signalR from '@microsoft/signalr';
import { MessageData } from '../types';
import environment from '../config/environment';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async start(): Promise<void> {
    if (this.connection && this.isConnected) {
      return;
    }

    try {
      await this.createConnection(environment.signalRUrl);
    } catch (error) {
      console.warn('HTTPS SignalR connection failed, trying HTTP fallback...', error);
      try {
        await this.createConnection(environment.signalRUrlHttp);
      } catch (fallbackError) {
        console.error('Both HTTPS and HTTP SignalR connections failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  private async createConnection(url: string): Promise<void> {
    // Close existing connection if any
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }

    console.log(`SignalR: Attempting to connect to ${url}`);

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | 
                  signalR.HttpTransportType.ServerSentEvents | 
                  signalR.HttpTransportType.LongPolling,
        withCredentials: false,
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null; // Stop retrying
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        }
      })
      .build();

    this.setupConnectionEvents();

    await this.connection.start();
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.onConnectionStateChanged?.(true);
    console.log(`SignalR: Connected successfully to ${url}`);
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
      console.log('SignalR: Received message', messageData);
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
    // Set up event listeners when connection is established
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // We'll set up listeners after connection is established
    setTimeout(() => {
      if (this.connection) {
        this.connection.on('ReceiveMessage', (messageData: MessageData) => {
          this.onReceiveMessage?.(messageData);
        });

        this.connection.on('UserOnline', (userId: number, username: string) => {
          this.onUserOnline?.(userId, username);
        });

        this.connection.on('UserOffline', (userId: number, username: string) => {
          this.onUserOffline?.(userId, username);
        });

        this.connection.on('UserTyping', (userId: number, username: string, isTyping: boolean) => {
          this.onUserTyping?.(userId, username, isTyping);
        });
      }
    }, 100);
  }
}

export const signalRService = new SignalRService();