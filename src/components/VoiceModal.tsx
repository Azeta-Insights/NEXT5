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
        (text, isFinal) => {
          setTranscript((prev) => {
            if (isFinal) return text;
            return text;
          });
        },
        (err, denied) => {
          setErrorMsg(err);
          setPermissionDenied(denied);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );

      // Automatically attempt to start recording on open
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

  const handleSubmit = () => {
    handleStopRecording();
    if (transcript.trim()) {
      onSubmitTranscript(transcript.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-stone-300'}`} />
            <h3 className="font-bold text-stone-900 text-base">{promptTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer & Mic Button */}
        <div className="flex flex-col items-center justify-center py-5 px-4 bg-stone-100/70 rounded-xl border border-stone-200/80">
          <div className="relative mb-3">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
            )}
            <button
              onClick={isListening ? handleStopRecording : handleStartRecording}
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700 scale-105'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
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
                  className="w-1 bg-red-600 rounded-full animate-pulse"
                  style={{
                    height: `${Math.max(6, (h / 100) * 22)}px`,
                    animationDelay: `${(i * 75) % 400}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-stone-400 my-2 h-6">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Microphone idle</span>
            </div>
          )}

          <p className="text-xs font-semibold text-stone-700">
            {isListening ? 'Listening... Speak your mind freely' : 'Tap microphone to speak'}
          </p>
          <span className="text-[11px] text-stone-400 mt-0.5 text-center">
            Say what you're juggling, your goals, or what's stressing you out. You can edit the transcript below.
          </span>
        </div>

        {/* Error / Permission Banner */}
        {errorMsg && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{permissionDenied ? 'Microphone Permission Needed' : 'Notice'}</p>
              <p className="mt-0.5 text-amber-800">{errorMsg}</p>
              <p className="mt-1 text-amber-900 font-medium">Tip: You can still type your thoughts in the text box below.</p>
            </div>
          </div>
        )}

        {/* Real-time Editable Transcript */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Live Transcript (Editable):</span>
            {transcript && (
              <button
                onClick={() => setTranscript('')}
                className="text-stone-400 hover:text-stone-700 flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your voice transcription will stream here in real-time. You can adjust and refine it directly..."
            rows={4}
            className="w-full p-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 placeholder:text-stone-400 resize-none leading-relaxed"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200 transition"
          >
            Cancel
          </button>
          <button
            id="submit-voice-transcript-btn"
            disabled={!transcript.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-stone-900 text-stone-50 hover:bg-stone-800 transition disabled:opacity-40 disabled:pointer-events-none shadow-sm"
          >
            <Check className="w-4 h-4" />
            Process With NEXT5
          </button>
        </div>
      </div>
    </div>
  );
};
