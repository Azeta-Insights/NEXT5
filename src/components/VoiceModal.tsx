import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { SpeechEngine } from '../lib/speech';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitTranscript: (text: string) => void;
  promptTitle?: string;
  initialText?: string;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmitTranscript,
  promptTitle = "Talk to NEXT5",
  initialText = "",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(initialText);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const speechEngineRef = useRef<SpeechEngine | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTranscript(initialText);
      setErrorMsg(null);
      setPermissionDenied(false);

      speechEngineRef.current = new SpeechEngine(
        (text) => {
          setTranscript(text);
        },
        (err, denied) => {
          setErrorMsg(err);
          setPermissionDenied(denied);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        },
        initialText
      );

      handleStartRecording();
    } else {
      handleStopRecording();
    }

    return () => {
      handleStopRecording();
    };
  }, [isOpen]);

  const handleStartRecording = async () => {
    if (speechEngineRef.current) {
      setErrorMsg(null);
      setPermissionDenied(false);
      speechEngineRef.current.setBaseTranscript(transcript);
      const started = await speechEngineRef.current.start();
      setIsListening(started);
    }
  };

  const handleStopRecording = () => {
    if (speechEngineRef.current) {
      speechEngineRef.current.stop();
      setIsListening(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    if (speechEngineRef.current) {
      speechEngineRef.current.resetTranscript();
    }
  };

  const handleSubmit = () => {
    handleStopRecording();
    if (transcript.trim()) {
      onSubmitTranscript(transcript.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 flex flex-col gap-4 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700'}`} />
            <h3 className="font-extrabold text-slate-100 text-base font-mono">{promptTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer & Mic Button */}
        <div className="flex flex-col items-center justify-center py-5 px-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="relative mb-3">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
            )}
            <button
              onClick={isListening ? handleStopRecording : handleStartRecording}
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer ${
                isListening
                  ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 scale-105 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-750'
              }`}
              title={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
            </button>
          </div>

          {/* Soundwave Bars Indicator */}
          {isListening ? (
            <div className="flex items-center justify-center gap-1 my-2 h-6">
              {[40, 70, 90, 60, 85, 100, 75, 45, 95, 60, 80, 50].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.max(6, (h / 100) * 22)}px`,
                    animationDelay: `${(i * 75) % 400}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 my-2 h-6">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Microphone idle</span>
            </div>
          )}

          <p className="text-xs font-semibold text-slate-200">
            {isListening ? 'Listening... Speak your mind freely' : 'Tap microphone to speak'}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 text-center">
            {isListening
              ? 'Pauses are supported — take your time to think, your words will not be lost.'
              : "Say what you're juggling, your goals, or what's stressing you out. You can edit the transcript below."}
          </span>
        </div>

        {/* Error / Permission Banner */}
        {errorMsg && (
          <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-300">{permissionDenied ? 'Microphone Permission Needed' : 'Notice'}</p>
              <p className="mt-0.5 text-amber-300/80">{errorMsg}</p>
              <p className="mt-1 text-amber-400 font-medium">Tip: You can still type your thoughts in the text box below.</p>
            </div>
          </div>
        )}

        {/* Real-time Editable Transcript */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Live Transcript (Editable):</span>
            {transcript && (
              <button
                onClick={handleClear}
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              if (speechEngineRef.current) {
                speechEngineRef.current.setBaseTranscript(e.target.value);
              }
            }}
            placeholder="Your voice transcription will stream here in real-time. You can adjust and refine it directly..."
            rows={4}
            className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600 resize-none leading-relaxed"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="submit-voice-transcript-btn"
            disabled={!transcript.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 hover:from-emerald-300 hover:to-teal-200 transition disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Process With NEXT5
          </button>
        </div>
      </div>
    </div>
  );
};
