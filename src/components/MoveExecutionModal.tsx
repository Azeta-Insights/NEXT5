import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { Recommendation } from '../types';

interface MoveExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: Recommendation | null;
  onComplete: (id: string) => void;
}

export const MoveExecutionModal: React.FC<MoveExecutionModalProps> = ({
  isOpen,
  onClose,
  recommendation,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (recommendation) {
      const minutes = recommendation.estimatedMinutes > 0 ? recommendation.estimatedMinutes : 15;
      setTimeLeft(minutes * 60);
      setIsRunning(false);
      setCompletedSteps([]);
    }
  }, [recommendation]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                const ctx = new AudioContextClass();
                const now = ctx.currentTime;
                
                // Tone 1
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(587.33, now); // D5
                gain1.gain.setValueAtTime(0.15, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 1.2);

                // Tone 2 (Harmonic major third)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(880, now + 0.15); // A5
                gain2.gain.setValueAtTime(0.12, now + 0.15);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.15);
                osc2.stop(now + 1.5);
              }
            } catch (e) {
              // Ignore audio context autoplay restrictions gracefully
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  if (!isOpen || !recommendation) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const substeps = recommendation.substeps && recommendation.substeps.length > 0
    ? recommendation.substeps
    : [
        `Clarify the immediate 1-sentence finish line for this move.`,
        `Turn off distracting notifications, close unrelated tabs, and begin uninterrupted.`,
        `Produce or ship the physical artifact to wrap this priority.`,
      ];

  const handleFinish = () => {
    onComplete(recommendation.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 flex flex-col gap-5 max-h-[92vh] overflow-y-auto text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                Move #{recommendation.priorityRank} Focus Sprint
              </span>
              <span className="text-xs font-bold text-slate-400">
                {recommendation.category.toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight leading-snug">
              {recommendation.action}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-900 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sprint Timer Widget */}
        <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 text-center shadow-xs space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Target Focus Window ({recommendation.estimatedMinutes || 15} min)
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-extrabold text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {formattedTime}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Timer
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Start Sprint
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                setTimeLeft((recommendation.estimatedMinutes || 15) * 60);
              }}
              className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step-by-Step Unblocking Sequence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Bite-Sized Unblocking Sequence:
            </span>
            <span className="text-[11px] text-slate-500">
              {completedSteps.length} of {substeps.length} done
            </span>
          </div>

          <div className="space-y-1.5">
            {substeps.map((step, idx) => {
              const isChecked = completedSteps.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    isChecked
                      ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                        isChecked
                          ? 'bg-emerald-400 border-emerald-400 text-slate-950'
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </div>
                  </div>
                  <span className={`text-xs leading-relaxed font-medium ${isChecked ? 'line-through text-slate-500' : ''}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Psychological Friction & Bypass */}
        <div className="p-3.5 bg-amber-950/30 rounded-2xl border border-amber-800/40 space-y-1 text-xs">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Friction Bypass & Cognitive Shortcut:
          </div>
          <p className="text-amber-200/80 text-[11px] leading-relaxed">
            {recommendation.frictionPoint ||
              "Notice if you feel resistance to starting. Just open the document and type one single sentence to cross the cognitive threshold."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
          >
            Leave Sprint
          </button>

          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 hover:from-emerald-300 hover:to-teal-200 transition shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            Mark Move Complete
          </button>
        </div>
      </div>
    </div>
  );
};
