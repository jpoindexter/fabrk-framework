'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from '../ui/button';
import { AiChatSidebar } from './chat-sidebar';
import { AiChatMessageList } from './chat-message-list';
import { AiChatInput } from './chat-input';
import type { Message, Conversation, Model, Attachment } from './chat-types';

export interface AiChatProps {
  initialMessages?: Message[];
  models?: Model[];
  defaultModelId?: string;
  conversations?: Conversation[];
  onSendMessage?: (message: string, attachments: Attachment[], modelId: string) => Promise<Message | void>;
  onNewConversation?: () => void;
  onSelectConversation?: (id: string) => void;
  onError?: (error: unknown) => void;
  className?: string;
}

const DEMO_MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', maxTokens: 128000 },
  { id: 'claude-3-5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', maxTokens: 200000 },
  { id: 'gemini-1.5', name: 'Gemini 1.5 Pro', provider: 'Google', maxTokens: 1000000 },
];

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Project Architecture', updatedAt: Date.now() },
  { id: '2', title: 'Database Schema', updatedAt: Date.now() - 100000 },
  { id: '3', title: 'React Hooks', updatedAt: Date.now() - 200000 },
];

export function AiChat({
  initialMessages = [],
  models = DEMO_MODELS,
  defaultModelId = 'gpt-4o',
  conversations = DEMO_CONVERSATIONS,
  onSendMessage,
  onNewConversation,
  onSelectConversation,
  onError,
  className,
}: AiChatProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeConvId, setActiveConvId] = React.useState(conversations[0]?.id ?? '1');
  const [selectedModelId, setSelectedModelId] = React.useState(defaultModelId);

  const handleSend = async (content: string, attachments: Attachment[]) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (onSendMessage) {
        const response = await onSendMessage(content, attachments, selectedModelId);
        if (response && typeof response === 'object' && 'role' in response) {
          setMessages(prev => [...prev, response as Message]);
        }
      } else {
        // Mock simulation
        await new Promise(resolve => setTimeout(resolve, 1500));

        let responseContent = `Simulated response from [${selectedModelId}].`;
        if (attachments.length > 0) {
          responseContent += `\n\nI received ${attachments.length} file(s): ${attachments.map(a => a.name).join(', ')}.`;
        }

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    setIsLoading(false);
  };

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    onSelectConversation?.(id);
  };

  const handleNewConv = () => {
    setMessages([]);
    onNewConversation?.();
  };

  return (
    <div className={cn('flex h-full w-full overflow-hidden border', mode.color.border.default, mode.radius, className)}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <AiChatSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConv}
          onNew={handleNewConv}
          className="hidden md:flex"
        />
      )}

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0 bg-background relative">
        {/* Header */}
        <div className={cn('flex items-center justify-between p-2 absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b', mode.color.border.default)}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="size-8"
            >
              <Menu className="size-4" />
            </Button>
            <span className={cn('text-xs font-bold uppercase tracking-wider', mode.color.text.muted)}>
              {models.find(m => m.id === selectedModelId)?.name}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col pt-12 pb-4">
           <AiChatMessageList
             messages={messages}
             isLoading={isLoading}
           />
        </div>

        {/* Input */}
        <div className="w-full max-w-3xl mx-auto mb-6">
          <AiChatInput
            onSend={handleSend}
            onStop={handleStop}
            isLoading={isLoading}
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
          />
        </div>
      </div>
    </div>
  );
}
