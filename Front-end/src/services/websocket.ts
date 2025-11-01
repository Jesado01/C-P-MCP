// WebSocket service to connect to Claude Agent API

export interface AgentMessage {
  type: string;
  content?: string;
  message?: string;
  data?: any;
  timestamp?: string;
  sessionId?: number;
  tool?: string;
  args?: any;
  result?: string;
  filepath?: string;
  error?: string;
  hasCode?: boolean;
  savedFiles?: string[];
}

export type MessageCallback = (message: AgentMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageCallbacks: MessageCallback[] = [];
  private url: string;
  private shouldReconnect = true;
  private isConnecting = false;

  constructor(url: string = 'ws://localhost:8000/ws') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prevent multiple simultaneous connection attempts
      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      try {
        this.isConnecting = true;
        this.shouldReconnect = true;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to Claude Agent API');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: AgentMessage = JSON.parse(event.data);
            console.log('[WebSocket] Received:', message.type, message);

            // Notify all callbacks
            this.messageCallbacks.forEach(callback => callback(message));
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isConnecting = false;

          // Only reconnect if not intentionally disconnected
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    // Don't reconnect if already connecting or not supposed to reconnect
    if (!this.shouldReconnect || this.isConnecting) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        if (this.shouldReconnect && !this.isConnecting) {
          this.connect().catch(console.error);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  sendMessage(content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message = {
      type: 'user_message',
      content
    };

    this.ws.send(JSON.stringify(message));
    console.log('[WebSocket] Sent:', message);
  }

  onMessage(callback: MessageCallback) {
    this.messageCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsInstance: WebSocketService | null = null;

export const getWebSocketService = (url?: string): WebSocketService => {
  if (!wsInstance) {
    wsInstance = new WebSocketService(url);
  }
  return wsInstance;
};
