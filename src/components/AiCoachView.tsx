import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, AlertCircle, Mic, ArrowRight } from 'lucide-react';
import { Goal, Recommendation, DailyContext, MemoryItem } from '../types';
import { VoiceModal } from './VoiceModal';

interface AiCoachViewProps {
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
  goals,
  recommendations,
  dailyContext,
  memory,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_coach',
      sender: 'assistant',
      text: "I am your NEXT5 Priority & Decision Support engine. Ask me about trade-offs, sequencing, what to drop, or why today's moves were chosen.",
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
    <div className="space-y-4 pb-20 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Priority Reasoning Coach
          </h1>
        </div>
        <p className="text-xs text-stone-500">
          Not a generic chatbot. NEXT5 helps you evaluate trade-offs, say no to busywork, and understand your priorities right now.
        </p>

        {/* Live Active Moves Reference */}
        {recommendations.length > 0 && (
          <div className="pt-2 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-600 overflow-x-auto pb-0.5">
            <span className="font-bold text-stone-900 shrink-0 text-[11px]">Today's Moves:</span>
            {recommendations.slice(0, 3).map((r) => (
              <span 
                key={r.id} 
                onClick={() => handleSendMessage(`Explain why "${r.action}" is ranked #${r.priorityRank}`)}
                className="cursor-pointer text-[11px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 truncate max-w-[160px] border border-stone-200"
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
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 whitespace-nowrap transition border border-stone-200"
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
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-white border border-stone-200 text-stone-800'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <span
                className={`text-[10px] block mt-1.5 ${
                  msg.sender === 'user' ? 'text-stone-400 text-right' : 'text-stone-400'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-start">
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-stone-800" />
              Reasoning about your priorities...
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-16 bg-stone-50/90 backdrop-blur-md pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-1.5 bg-white border border-stone-300 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-stone-900"
        >
          <button
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="p-2 text-stone-500 hover:text-red-600 rounded-xl hover:bg-stone-100 transition"
            title="Ask by voice"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about priorities, trade-offs, or what to drop..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none px-1"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 transition disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
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
