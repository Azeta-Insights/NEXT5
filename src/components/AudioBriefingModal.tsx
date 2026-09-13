import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Headphones, 
  ShieldAlert, 
  Anchor, 
  Check, 
  Copy, 
  Sliders,
  CheckCircle2,
  FastForward
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

  // Fetch briefing on open if not loaded
  useEffect(() => {
    if (isOpen && !briefing && !isLoading) {
      loadBriefing();
    }
  }, [isOpen]);

  // Clean up speech synthesis on unmount or close
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
    if (!('speechSynthesis' in window) || !briefing?.script) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(briefing.script);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;

    // Pick best natural sounding English voice if available
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(
      (v) => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Alex')))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setActiveSentenceIndex(0);
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

    // Track boundary events
    utterance.onboundary = (event) => {
      if (event.name === 'sentence' || event.name === 'word') {
        const charIndex = event.charIndex;
        let cumulative = 0;
        for (let i = 0; i < sentences.length; i++) {
          cumulative += sentences[i].length + 1;
          if (charIndex < cumulative) {
            setActiveSentenceIndex(i);
            break;
          }
        }
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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
    if (!briefing?.script) return;
    navigator.clipboard.writeText(briefing.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-stone-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Wave Animation */}
        <div className="p-5 sm:p-6 bg-stone-900 text-stone-50 flex items-start justify-between gap-3 border-b border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 flex items-center gap-1">
                <Headphones className="w-3 h-3" />
                PRD Section 5 & 25
              </span>
              <span className="text-[10px] font-medium text-stone-400">
                Spoken Morning Standup
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Executive Audio Briefing
            </h2>
            <p className="text-xs text-stone-400 leading-snug">
              60-second calibrated spoken briefing anchoring your critical needle-mover and daily boundaries.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Player Control Bar */}
        <div className="bg-stone-950 px-5 py-4 text-stone-100 flex items-center justify-between gap-4 border-b border-stone-800 flex-wrap">
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <button
                onClick={pausePlayback}
                className="w-11 h-11 rounded-full bg-amber-400 text-stone-950 hover:bg-amber-300 flex items-center justify-center shadow-lg transition active:scale-95"
                title="Pause Briefing"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : isPaused ? (
              <button
                onClick={resumePlayback}
                className="w-11 h-11 rounded-full bg-amber-400 text-stone-950 hover:bg-amber-300 flex items-center justify-center shadow-lg transition active:scale-95"
                title="Resume Briefing"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={startPlayback}
                disabled={isLoading || !briefing}
                className="w-11 h-11 rounded-full bg-amber-400 text-stone-950 hover:bg-amber-300 disabled:opacity-50 flex items-center justify-center shadow-lg transition active:scale-95"
                title="Listen to Briefing"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </button>
            )}

            <button
              onClick={replay}
              disabled={isLoading || !briefing}
              className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 transition"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Audio Wave Visualizer indicator */}
            <div className="flex items-center gap-1 h-6 px-2">
              {[40, 75, 100, 60, 85, 30, 90, 50].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-stone-700'
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
            <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
              {[1.0, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    if (isPlaying) {
                      startPlayback();
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition ${
                    playbackSpeed === speed
                      ? 'bg-amber-400 text-stone-950'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              onClick={loadBriefing}
              disabled={isLoading}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
              title="Regenerate briefing"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-stone-500">
              <Sparkles className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-semibold">Synthesizing executive briefing script...</p>
            </div>
          ) : briefing ? (
            <div className="space-y-5">
              {/* Anchor & Boundary Callout Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                    <Anchor className="w-3.5 h-3.5 text-amber-700" />
                    <span>The Anchor (Move #1)</span>
                  </div>
                  <p className="text-xs text-amber-950 font-semibold leading-snug">
                    {briefing.keyAnchor}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                    <span>Defensive Boundary</span>
                  </div>
                  <p className="text-xs text-rose-950 font-semibold leading-snug">
                    {briefing.keyBoundary}
                  </p>
                </div>
              </div>

              {/* Spoken Script with Word / Sentence Highlighting */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Spoken Script Transcript (~{briefing.estimatedDurationSeconds}s)
                  </span>
                  <button
                    onClick={handleCopyScript}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 text-sm leading-relaxed space-y-3 font-medium">
                  {sentences.map((sentence, idx) => {
                    const isCurrent = activeSentenceIndex === idx;
                    return (
                      <span
                        key={idx}
                        className={`transition-colors duration-200 inline ${
                          isCurrent
                            ? 'bg-amber-200/80 text-stone-950 font-bold px-1 rounded'
                            : 'text-stone-700'
                        }`}
                      >
                        {sentence}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 3 Key Takeaways */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                  3 Executive Directives
                </span>
                <div className="space-y-1.5 text-xs text-stone-700 font-medium">
                  {briefing.bulletSummary.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 font-medium">
            Listen during morning prep or commute to lock alignment before reactive demands begin.
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
