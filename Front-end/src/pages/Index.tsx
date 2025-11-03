import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { QuickActions } from '@/components/QuickActions';
import { SettingsModal } from '@/components/SettingsModal';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { Bot, Loader2, Power, PowerOff, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgent } from '@/hooks/useAgent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentMessage } from '@/services/websocket';
import { getApiService } from '@/services/api';

const Index = () => {
  const { messages, isLoading, addMessage, setLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [savedTestFiles, setSavedTestFiles] = useState<string[]>([]);
  const [runningTest, setRunningTest] = useState(false);
  const apiService = useRef(getApiService());
  const {
    isConnected,
    isAgentRunning,
    isInitializing,
    agentStatus,
    startAgent,
    stopAgent,
    sendMessage,
    onMessage,
  } = useAgent();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to agent messages
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = onMessage((message: AgentMessage) => {
      console.log('Received agent message:', message);

      // Handle different message types
      switch (message.type) {
        case 'ready':
          toast({
            title: '🤖 Agente listo',
            description: `Session ID: ${message.sessionId}`,
          });
          break;

        case 'user_message':
          // User message echoed back - already added to UI
          break;

        case 'response':
          // Final response from Claude
          console.log('[Response Debug] Full message:', message);
          console.log('[Response Debug] Content length:', message.content?.length);
          console.log('[Response Debug] Has code:', message.hasCode);
          console.log('[Response Debug] Saved files:', message.savedFiles);

          if (message.content) {
            let responseText = message.content;

            if (message.hasCode && message.savedFiles && message.savedFiles.length > 0) {
              responseText += `\n\n✅ **Tests guardados:**\n${message.savedFiles.map(f => `- ${f}`).join('\n')}`;
            }

            console.log('[Response Debug] Adding message to chat:', responseText.substring(0, 100));
            addMessage({ role: 'assistant', content: responseText });
            setLoading(false);
          } else {
            console.warn('[Response Debug] No content in response message!');
            setLoading(false);
          }
          break;

        case 'log':
          // Log messages (optional: show in UI or just console)
          console.log('[Agent Log]:', message.message);
          break;

        case 'tool_use':
          // Log tool usage to console only (don't show in chat)
          console.log('[Tool Use]:', message.tool, message.args);
          break;

        case 'tool_result':
          // Log tool result to console only (don't show in chat)
          console.log('[Tool Result]:', message.tool, message.result);
          break;

        case 'file_saved':
          // Add to saved test files list
          if (message.filepath && !savedTestFiles.includes(message.filepath)) {
            setSavedTestFiles(prev => [...prev, message.filepath!]);
          }
          toast({
            title: '💾 Archivo guardado',
            description: message.filepath,
          });
          break;

        case 'test_result':
          // Show test results in chat
          const resultMessage = message.exitCode === 0
            ? `✅ **Pruebas ejecutadas exitosamente**\n\n**Archivo:** ${message.filepath}\n\n**Output:**\n\`\`\`\n${message.output}\n\`\`\``
            : `❌ **Pruebas fallaron**\n\n**Archivo:** ${message.filepath}\n\n**Error:**\n\`\`\`\n${message.error || message.output}\n\`\`\``;

          addMessage({ role: 'assistant', content: resultMessage });
          setRunningTest(false);
          break;

        case 'error':
        case 'agent_error':
          toast({
            title: 'Error',
            description: message.error || message.content,
            variant: 'destructive',
          });
          setLoading(false);
          break;

        case 'agent_stopped':
          toast({
            title: 'Agente detenido',
            description: message.content,
          });
          break;

        default:
          console.log('[Unknown message type]:', message.type, message);
      }
    });

    return unsubscribe;
  }, [isConnected, addMessage, setLoading, onMessage, toast, savedTestFiles]);

  const handleSendMessage = async (content: string) => {
    if (!isAgentRunning) {
      toast({
        title: 'Agente no iniciado',
        description: 'Por favor inicia el agente primero.',
        variant: 'destructive',
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: 'No conectado',
        description: 'Esperando conexión WebSocket...',
        variant: 'destructive',
      });
      return;
    }

    addMessage({ role: 'user', content });
    setLoading(true);

    try {
      await sendMessage(content);
      // Response will come via WebSocket
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleQuickAction = (text: string) => {
    document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  };

  const handleExampleClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleToggleAgent = async () => {
    if (isAgentRunning) {
      await stopAgent();
    } else {
      await startAgent();
    }
  };

  const handleRunTests = async () => {
    if (savedTestFiles.length === 0) {
      toast({
        title: 'No hay pruebas',
        description: 'No se han generado pruebas todavía.',
        variant: 'destructive',
      });
      return;
    }

    setRunningTest(true);
    toast({
      title: '▶️ Ejecutando pruebas',
      description: `Ejecutando ${savedTestFiles.length} archivo(s)...`,
    });

    try {
      // Run the most recent test file
      const latestTest = savedTestFiles[savedTestFiles.length - 1];
      await apiService.current.runTest(latestTest);
    } catch (error) {
      console.error('Failed to run tests:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron ejecutar las pruebas.',
        variant: 'destructive',
      });
      setRunningTest(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Claude Testing Agent</h1>

            {/* Status badges */}
            <div className="flex items-center gap-2">
              <Badge variant={isAgentRunning ? 'default' : 'secondary'}>
                {isAgentRunning ? '🟢 Running' : '⚫ Stopped'}
              </Badge>
              {isConnected && (
                <Badge variant="outline">
                  🔗 WebSocket
                </Badge>
              )}
              {agentStatus?.pid && (
                <Badge variant="outline">
                  PID: {agentStatus.pid}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedTestFiles.length > 0 && (
              <Button
                onClick={handleRunTests}
                disabled={runningTest || !isAgentRunning}
                variant="outline"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                {runningTest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Ejecutar Pruebas ({savedTestFiles.length})
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleToggleAgent}
              disabled={isInitializing}
              variant={isAgentRunning ? 'destructive' : 'default'}
              size="sm"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inicializando...
                </>
              ) : isAgentRunning ? (
                <>
                  <PowerOff className="w-4 h-4 mr-2" />
                  Detener Agente
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Iniciar Agente
                </>
              )}
            </Button>
            <SettingsModal />
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen onExampleClick={handleExampleClick} />
        ) : (
          <div className="max-w-4xl mx-auto py-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-4 p-6">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Claude está pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border">
        <QuickActions onActionClick={handleQuickAction} />
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading || !isAgentRunning || !isConnected}
        />
      </div>
    </div>
  );
};

export default Index;
