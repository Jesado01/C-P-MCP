import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { QuickActions } from '@/components/QuickActions';
import { SettingsModal } from '@/components/SettingsModal';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { messages, isLoading, apiKey, addMessage, setLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      toast({
        title: 'API Key requerida',
        description: 'Por favor configura tu API key de Anthropic en ajustes.',
        variant: 'destructive',
      });
      return;
    }

    addMessage({ role: 'user', content });
    setLoading(true);

    try {
      // Simulated API call - in production, this would call the Anthropic API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const response = `He recibido tu mensaje: "${content}"\n\nEsta es una respuesta simulada. En producción, aquí llamaría a la API de Claude para generar tests de Playwright.\n\n\`\`\`typescript\nimport { test, expect } from '@playwright/test';\n\ntest('ejemplo generado', async ({ page }) => {\n  await page.goto('https://ejemplo.com');\n  await expect(page).toHaveTitle(/Ejemplo/);\n});\n\`\`\`\n\n✅ Tests guardados en: tests/ejemplo.spec.ts`;

      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo conectar con Claude.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (text: string) => {
    // This would be passed to the input component to pre-fill it
    // For simplicity, we'll just send it directly
    document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  };

  const handleExampleClick = (prompt: string) => {
    handleSendMessage(prompt);
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
          </div>
          <SettingsModal />
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
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default Index;
