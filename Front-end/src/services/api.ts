// REST API service for Claude Agent API

const API_BASE_URL = 'http://localhost:8000';

export interface ApiResponse {
  status: string;
  message: string;
  pid?: number;
  timestamp?: string;
}

export interface AgentStatus {
  is_running: boolean;
  connected_clients: number;
  pid: number | null;
}

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async startAgent(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/agent/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to start agent: ${response.statusText}`);
    }

    return response.json();
  }

  async stopAgent(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/agent/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop agent: ${response.statusText}`);
    }

    return response.json();
  }

  async restartAgent(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/agent/restart`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to restart agent: ${response.statusText}`);
    }

    return response.json();
  }

  async getStatus(): Promise<AgentStatus> {
    const response = await fetch(`${this.baseUrl}/api/status`);

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return response.json();
  }

  async sendMessage(message: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/agent/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  }

  async checkHealth(): Promise<{ name: string; version: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/`);

    if (!response.ok) {
      throw new Error(`API health check failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let apiInstance: ApiService | null = null;

export const getApiService = (baseUrl?: string): ApiService => {
  if (!apiInstance) {
    apiInstance = new ApiService(baseUrl);
  }
  return apiInstance;
};
