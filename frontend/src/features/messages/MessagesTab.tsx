import React, { useState } from 'react';
import { PillButton, Badge, CircleFrame } from '@khojyatra/ui';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'traveler' | 'host';
  text: string;
  timestamp: string;
}

interface Thread {
  id: string;
  hostName: string;
  experienceTitle: string;
  avatar: string;
  verified: boolean;
  trustScore: number;
  unread: boolean;
  lastMessage: string;
  messages: ChatMessage[];
}

const INITIAL_THREADS: Thread[] = [
  {
    id: 'thread-1',
    hostName: 'Dilli Khana & Heritage Guild',
    experienceTitle: 'Old Delhi Midnight Kebab & Paratha Trail',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    verified: true,
    trustScore: 92,
    unread: false,
    lastMessage: 'Namaste! Please let us know if any guests in your group have nut allergies or dietary preferences.',
    messages: [
      {
        id: 'm1',
        sender: 'host',
        text: 'Namaste! Welcome to KhojYatra. We are looking forward to hosting you for the Old Delhi Culinary Walk.',
        timestamp: '10:15 AM'
      },
      {
        id: 'm2',
        sender: 'host',
        text: 'Please let us know if any guests in your group have nut allergies or dietary preferences.',
        timestamp: '10:16 AM'
      }
    ]
  },
  {
    id: 'thread-2',
    hostName: 'Varanasi Vedic Chants Guild',
    experienceTitle: 'Subah-e-Banaras Boat & Sunrise Aarti',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    verified: true,
    trustScore: 96,
    unread: true,
    lastMessage: 'Morning ghat waters are calm and clear. We gather at Assi Ghat step 4 at 05:45 AM.',
    messages: [
      {
        id: 'm3',
        sender: 'host',
        text: 'Morning ghat waters are calm and clear. We gather at Assi Ghat step 4 at 05:45 AM.',
        timestamp: '09:30 AM'
      }
    ]
  },
  {
    id: 'thread-3',
    hostName: 'Jaipur Blue Pottery Collective',
    experienceTitle: 'Master Artisan Cobalt Blue Pottery',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    verified: true,
    trustScore: 95,
    unread: false,
    lastMessage: 'Your studio wheel slot is reserved. Clay and glazing aprons will be provided!',
    messages: [
      {
        id: 'm4',
        sender: 'host',
        text: 'Your studio wheel slot is reserved. Clay and glazing aprons will be provided!',
        timestamp: 'Yesterday'
      }
    ]
  }
];

const SUGGESTIONS = [
  'What is the exact meeting landmark?',
  'Do you provide vegetarian / vegan options?',
  'Is step-free / wheelchair access available?'
];

export const MessagesTab: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>('thread-1');
  const [inputText, setInputText] = useState('');

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'traveler',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              lastMessage: text.trim(),
              messages: [...t.messages, newMsg]
            }
          : t
      )
    );
    setInputText('');

    // Simulated host reply after 1s
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'host',
        text: `Thanks for your message! Absolutely noted regarding: "${text.trim()}". We look forward to meeting you.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                lastMessage: replyMsg.text,
                messages: [...t.messages, replyMsg]
              }
            : t
        )
      );
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-4">
        <div>
          <h2 className="font-display font-extrabold text-xl text-text-primary flex items-center gap-2">
            <MessageSquare size={20} className="text-accent" />
            <span>Host & Community Messages</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Direct communication with verified local hosts, artisan collectives, and guides.
          </p>
        </div>
        <Badge variant="accent" size="sm">
          {threads.length} Conversations
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[620px]">
        {/* Left thread list (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-2 overflow-y-auto">
          {threads.map((t) => {
            const isActive = t.id === activeThreadId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveThreadId(t.id)}
                className={`p-3.5 rounded-card text-left transition-all flex items-start gap-3 border ${
                  isActive
                    ? 'bg-surface border-accent shadow-sm ring-1 ring-accent-soft'
                    : 'bg-surface-alt/60 hover:bg-surface border-transparent'
                }`}
              >
                <CircleFrame size={42} src={t.avatar} alt={t.hostName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-xs text-text-primary truncate">
                      {t.hostName}
                    </span>
                    {t.unread && (
                      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-accent font-medium truncate">
                    {t.experienceTitle}
                  </div>
                  <p className="text-[11px] text-text-secondary truncate mt-1">
                    {t.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right chat window (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-surface border border-[rgba(20,22,26,0.08)] rounded-2xl overflow-hidden shadow-sm">
          {/* Host header */}
          <div className="p-4 bg-surface-alt/50 border-b border-[rgba(20,22,26,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircleFrame size={40} src={activeThread.avatar} alt={activeThread.hostName} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm text-text-primary">
                    {activeThread.hostName}
                  </span>
                  {activeThread.verified && (
                    <CheckCircle2 size={14} className="text-accent" />
                  )}
                </div>
                <div className="text-[11px] text-text-secondary flex items-center gap-2">
                  <span>Trust Score: {activeThread.trustScore}/100</span>
                  <span>•</span>
                  <span className="text-accent font-medium">{activeThread.experienceTitle}</span>
                </div>
              </div>
            </div>

            <Badge variant="highlight" size="sm">Host Active</Badge>
          </div>

          {/* Chat message thread */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-bg/40">
            {activeThread.messages.map((m) => {
              const isTraveler = m.sender === 'traveler';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isTraveler ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isTraveler
                        ? 'bg-accent text-text-inverse rounded-br-none shadow-sm'
                        : 'bg-surface border border-[rgba(20,22,26,0.08)] text-text-primary rounded-bl-none shadow-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-text-secondary mt-1 px-1">
                    {m.timestamp}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick inquiry prompt suggestions */}
          <div className="px-4 py-2 bg-surface border-t border-[rgba(20,22,26,0.06)] flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(s)}
                className="px-2.5 py-1 rounded-pill bg-accent-soft text-accent-dark hover:bg-accent hover:text-white transition-all text-[11px] font-medium"
              >
                + {s}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3 bg-surface border-t border-[rgba(20,22,26,0.06)] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Ask host a question about timing, route, or requirements..."
              className="flex-1 px-4 py-2.5 rounded-card bg-surface-alt border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
            />
            <PillButton
              size="sm"
              icon={<Send size={14} />}
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
            >
              Send
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
};
