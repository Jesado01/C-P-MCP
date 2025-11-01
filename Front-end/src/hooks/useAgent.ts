import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const hasShownConnectionToast = useRef(false);

  // Check API health and agent status ONLY on mount (no polling)
  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const status = await apiService.current.getStatus();
        if (mounted) {
          setAgentStatus(status);
          setIsAgentRunning(status.is_running);
        }
      } catch (error) {
        console.error('Failed to check API status:', error);
        // Only show error once
        if (mounted && !hasShownConnectionToast.current) {
          toast({
            title: 'Error de conexión',
            description: 'No se pudo conectar con la API.',
            variant: 'destructive',
          });
          hasShownConnectionToast.current = true;
        }
      }
    };

    checkStatus();

    // Only poll if agent is NOT running (to detect when it starts externally)
    // Polling every 30 seconds instead of 5
    const interval = setInterval(() => {
      if (!isAgentRunning && mounted) {
        checkStatus();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAgentRunning, toast]);

  // Connect WebSocket when agent is running
  useEffect(() => {
    if (isAgentRunning && !isConnected) {
      wsService.current
        .connect()
        .then(() => {
          setIsConnected(true);
          // Only show toast once
          if (!hasShownConnectionToast.current) {
            toast({
              title: 'Conectado',
              description: 'WebSocket conectado.',
            });
            hasShownConnectionToast.current = true;
          }

          // Register all pending callbacks
          messageCallbacksRef.current.forEach(callback => {
            wsService.current.onMessage(callback);
          });
        })
        .catch((error) => {
          console.error('WebSocket connection failed:', error);
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

        // Wait for agent to initialize
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
        await apiService.current.sendMessage(content);
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

  // Memoize return value to prevent re-renders
  return useMemo(() => ({
    isConnected,
    isAgentRunning,
    isInitializing,
    agentStatus,
    startAgent,
    stopAgent,
    sendMessage,
    onMessage,
  }), [isConnected, isAgentRunning, isInitializing, agentStatus, startAgent, stopAgent, sendMessage, onMessage]);
};
