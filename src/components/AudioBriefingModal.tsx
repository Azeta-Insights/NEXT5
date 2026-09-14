import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Headphones, 
  ShieldAlert, 
  Anchor, 
  Check, 
  Copy, 
  CheckCircle2
} from 'lucide-react';
import { Recommendation, DailyContext, Goal, ExecutiveAudioBriefing } from '../types';

interface AudioBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  recommendations: Recommendation[];
  dailyContext: DailyContext;
  userName?: string;
}

export const AudioBriefingModal: React.FC<AudioBriefingModalProps> = ({
  isOpen,
  onClose,
  goals,
  recommendations,
  dailyContext,
  userName = 'Leader',
}) => {
  const [briefing, setBriefing] = useState<ExecutiveAudioBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [copied, setCopied] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (isOpen && !briefing && !isLoading) {
      loadBriefing();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleClose = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    onClose();
  };

  const loadBriefing = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedGoals: goals.filter((g) => g.status === 'active' && g.confirmed),
          currentRecommendations: recommendations,
          dailyContext,
          userName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
      }
    } catch (err) {
      console.error('Failed to load audio briefing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sentences = briefing?.script ? briefing.script.split(/(?<=[.?!])\s+/).filter(Boolean) : [];

  const startPlayback = () => {
    if (!('speechSynthesis' in window) || !briefing) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(briefing.script);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Google') || v.name.includes('Samantha'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onboundary = (event) => {
      if (event.name === 'sentence' || event.charIndex !== undefined) {
        let charCount = 0;
        for (let i = 0; i < sentences.length; i++) {
          charCount += sentences[i].length + 1;
          if (event.charIndex < charCount) {
            setActiveSentenceIndex(i);
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(-1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(-1);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pausePlayback = () => {
    if ('speechSynthesis' in window && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const resumePlayback = () => {
    if ('speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      startPlayback();
    }
  };

  const replay = () => {
    startPlayback();
  };

  const handleCopyScript = () => {
    if (!briefing) return;
    navigator.clipboard.writeText(briefing.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-3xl max-w-2xl w-full border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Headphones className="w-3 h-3 text-emerald-400" />
                Audio Briefing
              </span>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                Spoken Morning Standup
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100 font-mono flex items-center gap-2">
              Executive Audio Briefing
            </h2>
            <p className="text-xs text-slate-400 leading-snug">
              60-second calibrated spoken briefing anchoring your critical needle-mover and daily boundaries.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Player Control Bar */}
        <div className="bg-slate-950 px-5 py-4 text-slate-100 flex items-center justify-between gap-4 border-b border-slate-800 flex-wrap">
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <button
                onClick={pausePlayback}
                className="w-11 h-11 rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                title="Pause Briefing"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : isPaused ? (
              <button
                onClick={resumePlayback}
                className="w-11 h-11 rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                title="Resume Briefing"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={startPlayback}
                disabled={isLoading || !briefing}
                className="w-11 h-11 rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:opacity-50 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                title="Listen to Briefing"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </button>
            )}

            <button
              onClick={replay}
              disabled={isLoading || !briefing}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Audio Wave Visualizer */}
            <div className="flex items-center gap-1 h-6 px-2">
              {[40, 75, 100, 60, 85, 30, 90, 50].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-800'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(20, (h * (Math.sin(Date.now() / 200 + i) + 1.2)) / 2)}%` : '20%',
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              {[1.0, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    if (isPlaying) {
                      startPlayback();
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    playbackSpeed === speed
                      ? 'bg-emerald-400 text-slate-950 font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              onClick={loadBriefing}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
              title="Regenerate briefing"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Sparkles className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs font-semibold">Synthesizing executive briefing script...</p>
            </div>
          ) : briefing ? (
            <div className="space-y-5">
              {/* Anchor & Boundary Callout Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono">The Anchor (Move #1)</span>
                  </div>
                  <p className="text-xs text-slate-200 font-semibold leading-snug">
                    {briefing.keyAnchor}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono">Defensive Boundary</span>
                  </div>
                  <p className="text-xs text-slate-200 font-semibold leading-snug">
                    {briefing.keyBoundary}
                  </p>
                </div>
              </div>

              {/* Spoken Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Spoken Script Transcript (~{briefing.estimatedDurationSeconds}s)
                  </span>
                  <button
                    onClick={handleCopyScript}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-200 text-sm leading-relaxed space-y-3 font-medium">
                  {sentences.map((sentence, idx) => {
                    const isCurrent = activeSentenceIndex === idx;
                    return (
                      <span
                        key={idx}
                        className={`transition-colors duration-200 inline ${
                          isCurrent
                            ? 'bg-emerald-400 text-slate-950 font-bold px-1 rounded'
                            : 'text-slate-300'
                        }`}
                      >
                        {sentence}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 3 Key Takeaways */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                  3 Executive Directives
                </span>
                <div className="space-y-1.5 text-xs text-slate-300 font-medium">
                  {briefing.bulletSummary.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Listen during morning prep or commute to lock alignment before reactive demands begin.
          </span>
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-extrabold hover:bg-emerald-300 transition cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.3)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
