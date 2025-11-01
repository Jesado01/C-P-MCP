import { Message } from '@/store/chatStore';
import { Bot, User, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { Button } from './ui/button';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 p-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      
      <div className={`flex flex-col max-w-[80%] md:max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-chat-user-from to-chat-user-to text-white'
              : 'bg-chat-claude-bg text-foreground'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none
                            prose-headings:font-semibold
                            prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                            prose-p:my-2 prose-p:leading-relaxed
                            prose-ul:my-2 prose-ol:my-2
                            prose-li:my-1
                            prose-strong:font-bold prose-strong:text-primary
                            prose-code:before:content-none prose-code:after:content-none
                            prose-pre:my-4 prose-pre:p-0">
              <ReactMarkdown
                components={{
                  code(props) {
                    const { children, className, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: '1rem 0',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-6 my-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-6 my-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="my-1">{children}</li>,
                  h1: ({ children }) => <h1 className="text-2xl font-semibold mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 my-2 italic">{children}</blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-foreground" />
          </div>
        </div>
      )}
    </div>
  );
};
