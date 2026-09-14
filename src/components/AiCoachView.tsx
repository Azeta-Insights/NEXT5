import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, Mic } from 'lucide-react';
import { Goal, Recommendation, DailyContext, MemoryItem, UserProfile } from '../types';
import { VoiceModal } from './VoiceModal';

interface AiCoachViewProps {
  user?: UserProfile;
  goals: Goal[];
  recommendations: Recommendation[];
  dailyContext: DailyContext;
  memory: MemoryItem[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Why did you prioritize #1 over the others?",
  "I have too much to do—what should I drop?",
  "Which of these matters more right now?",
  "Help me rethink today with low energy",
  "How should I sequence these 5 moves?",
  "Tell me what NOT to do today",
];

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  user,
  goals,
  recommendations,
  dailyContext,
  memory,
}) => {
  const greetingName = user?.name && user.name !== 'User' && user.name !== 'Private Guest' ? ` ${user.name}` : '';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_coach',
      sender: 'assistant',
      text: `Hello${greetingName}! I am your NEXT5 Priority Coach. Ask me about trade-offs, sequencing, what to drop, or why today's moves were chosen.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleSendMessage = async (textToSend = inputText) => {
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg.text,
          confirmedGoals: goals,
          currentRecommendations: recommendations,
          dailyContext,
          memory,
          userName: user?.name,
          userRole: user?.roleTitle,
          userFocus: user?.primaryFocus,
        }),
      });

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        sender: 'assistant',
        text: data.answer || "Focus on your top priority move. Doing that alone moves your day forward.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI coach query error:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg_${Date.now()}_fallback`,
        sender: 'assistant',
        text: "When you feel overwhelmed, eliminate non-essential administrative overhead (like clearing inbox emails or browsing Slack). Protect your focus exclusively for your top 2 non-negotiables.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Header */}
      <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight font-mono">
            Priority Reasoning Coach
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Not a generic chatbot. NEXT5 helps you evaluate trade-offs, say no to busywork, and understand your priorities right now.
        </p>

        {/* Live Active Moves Reference */}
        {recommendations.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400 overflow-x-auto pb-0.5">
            <span className="font-bold text-slate-200 shrink-0 text-[11px]">Today's Moves:</span>
            {recommendations.slice(0, 3).map((r) => (
              <span 
                key={r.id} 
                onClick={() => handleSendMessage(`Explain why "${r.action}" is ranked #${r.priorityRank}`)}
                className="cursor-pointer text-[11px] px-2.5 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-300 truncate max-w-[160px] border border-slate-700 transition"
                title="Click to ask coach about this move"
              >
                #{r.priorityRank} {r.action}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Prompt Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendMessage(prompt)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 whitespace-nowrap transition border border-slate-800 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="space-y-3 min-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-emerald-400 text-slate-950 font-medium'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <span
                className={`text-[10px] block mt-1.5 ${
                  msg.sender === 'user' ? 'text-emerald-950/70 text-right' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              Reasoning about your priorities...
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-16 bg-slate-950/90 backdrop-blur-md pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm focus-within:border-emerald-500"
        >
          <button
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Ask by voice"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about priorities, trade-offs, or what to drop..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-hidden px-1"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2 rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.3)]"
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
        </form>
      </div>

      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        initialText={inputText}
        promptTitle="Ask your AI Decision Coach"
        onSubmitTranscript={(txt) => {
          setInputText(txt);
          handleSendMessage(txt);
        }}
      />
    </div>
  );
};
