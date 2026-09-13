import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Sparkles, 
  Brain, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Zap, 
  Moon, 
  Coffee,
  Lightbulb,
  ShieldAlert,
  Play
} from 'lucide-react';
import { Recommendation, DailyContext, EngineMode, FrictionDecompressionResult } from '../types';

interface VoiceFrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: Recommendation[];
  dailyContext: DailyContext;
  onSwitchMode: (mode: EngineMode) => void;
  onOpenSprintModal?: (rec: Recommendation) => void;
}

export const VoiceFrictionModal: React.FC<VoiceFrictionModalProps> = ({
  isOpen,
  onClose,
  recommendations,
  dailyContext,
  onSwitchMode,
  onOpenSprintModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDecompressing, setIsDecompressing] = useState(false);
  const [result, setResult] = useState<FrictionDecompressionResult | null>(null);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
    }
  }, []);

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicSupported(false);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInputText(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsRecording(false);
      }
    }
  };

  const decompressFriction = async () => {
    if (!inputText.trim()) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setIsDecompressing(true);
    try {
      const res = await fetch('/api/decompress-friction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceNoteOrText: inputText,
          currentRecommendations: recommendations,
          dailyContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error('Failed to decompress friction:', err);
    } finally {
      setIsDecompressing(false);
    }
  };

  const handleApplyRecommendedMode = () => {
    if (result?.recommendedMode) {
      onSwitchMode(result.recommendedMode);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-stone-50 flex items-start justify-between gap-3 border-b border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                PRD Section 5 & 25
              </span>
              <span className="text-[10px] font-medium text-stone-400">
                Cognitive Unblocker
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Voice Friction Decompressor
            </h2>
            <p className="text-xs text-stone-400 leading-snug">
              Speak or dump why you feel stuck. NEXT5 extracts the root friction and hands you a 5-minute starter move.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Input & Mic Container */}
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Speak or type what's blocking you... e.g. 'I'm dreading this proposal because I don't know what pricing tier to pitch and I have zero energy right now.'"
                rows={4}
                className="w-full text-xs sm:text-sm p-3.5 pb-10 rounded-2xl border border-stone-300 bg-stone-50 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900 placeholder:text-stone-400 resize-none font-medium leading-relaxed"
              />

              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {micSupported && (
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse shadow-md'
                        : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Speak friction'}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">
                {inputText ? `${inputText.length} characters captured` : 'Click Voice or type freely.'}
              </span>
              <button
                onClick={decompressFriction}
                disabled={isDecompressing || !inputText.trim()}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 disabled:opacity-50 transition flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isDecompressing ? 'animate-spin text-amber-400' : ''}`} />
                {isDecompressing ? 'Diagnosing Friction...' : 'Decompress & Unblock'}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-150">
              {/* Root Friction Callout */}
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Diagnosed Root Friction
                </span>
                <p className="text-xs sm:text-sm font-semibold text-stone-800 leading-snug">
                  {result.rootFriction}
                </p>
              </div>

              {/* 5-Minute Micro-Move Action */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-700" />
                    Immediate 5-Minute Micro-Move
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 uppercase">
                    Friction-Proof
                  </span>
                </div>
                <p className="text-sm font-bold text-amber-950 leading-relaxed">
                  "{result.fiveMinuteMicroMove}"
                </p>
                <p className="text-[11px] text-amber-900 font-medium">
                  {result.strategicReassurance}
                </p>
              </div>

              {/* Recommended Engine Mode Switch (if applicable) */}
              {result.recommendedMode && result.recommendedMode !== 'normal' && (
                <div className="p-3.5 rounded-2xl bg-stone-900 text-stone-50 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Recommended Downshift
                    </span>
                    <p className="text-xs text-stone-300">
                      Switch to <strong className="text-white capitalize">{result.recommendedMode.replace('_', ' ')} Mode</strong> to recalibrate expectations.
                    </p>
                  </div>
                  <button
                    onClick={handleApplyRecommendedMode}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 text-xs font-bold hover:bg-amber-300 transition shrink-0 shadow-xs flex items-center gap-1"
                  >
                    <span>Switch Mode</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 font-medium">
            Paralysis is solved by shrinking the first step, not increasing pressure.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
