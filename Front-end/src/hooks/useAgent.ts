import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketService, AgentMessage } from '@/services/websocket';
import { getApiService, AgentStatus } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface AgentResponse {
  type: string;
  content: string;
  timestamp: string;
  hasCode?: boolean;
  savedFiles?: string[];
}

export const useAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const wsService = useRef(getWebSocketService());
  const apiService = useRef(getApiService());
  const { toast } = useToast();
  const messageCallbacksRef = useRef<((message: AgentMessage) => void)[]>([]);

  // Check API health and agent status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await apiService.current.checkHealth();
        const status = await apiService.current.getStatus();
        setAgentStatus(status);
        setIsAgentRunning(status.is_running);
      } catch (error) {
        console.error('Failed to check API status:', error);
        toast({
          title: 'Error de conexión',
          description: 'No se pudo conectar con la API. Asegúrate de que el servidor esté corriendo.',
          variant: 'destructive',
        });
      }
    };

    checkStatus();

    // Poll status every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [toast]);

  // Connect WebSocket when agent is running
  useEffect(() => {
    if (isAgentRunning && !isConnected) {
      wsService.current
        .connect()
        .then(() => {
          setIsConnected(true);
          toast({
            title: 'Conectado',
            description: 'Conexión WebSocket establecida con éxito.',
          });

          // Register all pending callbacks
          messageCallbacksRef.current.forEach(callback => {
            wsService.current.onMessage(callback);
          });
        })
        .catch((error) => {
          console.error('WebSocket connection failed:', error);
          toast({
            title: 'Error de WebSocket',
            description: 'No se pudo establecer la conexión WebSocket.',
            variant: 'destructive',
          });
        });
    }

    return () => {
      if (wsService.current.isConnected()) {
        wsService.current.disconnect();
        setIsConnected(false);
      }
    };
  }, [isAgentRunning, isConnected, toast]);

  const startAgent = useCallback(async () => {
    setIsInitializing(true);
    try {
      const result = await apiService.current.startAgent();

      if (result.status === 'started' || result.status === 'already_running') {
        setIsAgentRunning(true);
        toast({
          title: 'Agente iniciado',
          description: result.message,
        });

        // Wait a bit for the agent to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh status
        const status = await apiService.current.getStatus();
        setAgentStatus(status);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to start agent:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el agente.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  }, [toast]);

  const stopAgent = useCallback(async () => {
    try {
      const result = await apiService.current.stopAgent();
      setIsAgentRunning(false);
      setIsConnected(false);

      toast({
        title: 'Agente detenido',
        description: result.message,
      });

      // Refresh status
      const status = await apiService.current.getStatus();
      setAgentStatus(status);
    } catch (error) {
      console.error('Failed to stop agent:', error);
      toast({
        title: 'Error',
        description: 'No se pudo detener el agente.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!isConnected) {
        throw new Error('WebSocket no está conectado');
      }

      try {
        // Send via REST API
        await apiService.current.sendMessage(content);

        // WebSocket will receive the response automatically
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    [isConnected]
  );

  const onMessage = useCallback((callback: (message: AgentMessage) => void) => {
    // Store callback for later registration if not connected yet
    messageCallbacksRef.current.push(callback);

    if (isConnected) {
      return wsService.current.onMessage(callback);
    }

    // Return a cleanup function
    return () => {
      messageCallbacksRef.current = messageCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, [isConnected]);

  return {
    isConnected,
    isAgentRunning,
    isInitializing,
    agentStatus,
    startAgent,
    stopAgent,
    sendMessage,
    onMessage,
  };
};
