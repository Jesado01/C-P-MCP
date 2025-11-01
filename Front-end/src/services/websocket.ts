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
  private maxReconnectAttempts = 3; // Reduced from 5 to 3
  private reconnectDelay = 3000; // Increased from 2s to 3s
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
        console.log('[WebSocket] Connection already in progress, rejecting');
        reject(new Error('Connection already in progress'));
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected, resolving immediately');
        resolve();
        return;
      }

      try {
        console.log('[WebSocket] Starting connection to', this.url);
        this.isConnecting = true;
        this.shouldReconnect = true;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] ✅ Connected to Claude Agent API');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: AgentMessage = JSON.parse(event.data);
            console.log('[WebSocket] Received:', message.type);

            // Notify all callbacks
            this.messageCallbacks.forEach(callback => callback(message));
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] ❌ Error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log(`[WebSocket] 🔌 Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
          this.isConnecting = false;
          this.ws = null;

          // Only reconnect if not intentionally disconnected
          if (this.shouldReconnect) {
            console.log('[WebSocket] Will attempt reconnect (shouldReconnect=true)');
            this.attemptReconnect();
          } else {
            console.log('[WebSocket] Not reconnecting (shouldReconnect=false)');
          }
        };
      } catch (error) {
        this.isConnecting = false;
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
    console.log('[WebSocket] disconnect() called');
    console.trace('[WebSocket] Disconnect stack trace:');
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;

    if (this.ws) {
      console.log('[WebSocket] Closing WebSocket connection');
      this.ws.close();
      this.ws = null;
    } else {
      console.log('[WebSocket] No active connection to close');
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
