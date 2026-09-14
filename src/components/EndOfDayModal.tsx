import React, { useState } from 'react';
import { Sparkles, X, Mic, Check, ShieldAlert, Brain } from 'lucide-react';
import { Recommendation, Goal, FeedbackRating } from '../types';
import { VoiceModal } from './VoiceModal';

interface EndOfDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: Recommendation[];
  goals: Goal[];
  onSubmitFeedback: (rating: FeedbackRating, comments?: string, moveDispositions?: Record<string, 'reevaluate' | 'breakdown' | 'drop'>) => void;
}

const RATING_OPTIONS: { id: FeedbackRating; label: string; desc: string }[] = [
  { id: 'exactly_right', label: '🎯 Exactly Right', desc: 'Felt realistic and moved the needle' },
  { id: 'somewhat_useful', label: '👍 Somewhat Useful', desc: 'Helped, but could be tighter' },
  { id: 'too_much', label: '⚠️ Too Much', desc: 'Felt overwhelming for today' },
  { id: 'too_easy', label: '💨 Too Easy', desc: 'Could have tackled higher leverage' },
];

export const EndOfDayModal: React.FC<EndOfDayModalProps> = ({
  isOpen,
  onClose,
  recommendations,
  onSubmitFeedback,
}) => {
  const [rating, setRating] = useState<FeedbackRating>('exactly_right');
  const [comments, setComments] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const pendingMoves = recommendations.filter((r) => r.status === 'pending');
  const [dispositions, setDispositions] = useState<Record<string, 'reevaluate' | 'breakdown' | 'drop'>>(() => {
    const initial: Record<string, 'reevaluate' | 'breakdown' | 'drop'> = {};
    pendingMoves.forEach((m) => {
      initial[m.id] = 'reevaluate';
    });
    return initial;
  });

  if (!isOpen) return null;

  const completed = recommendations.filter((r) => r.status === 'completed');
  const total = recommendations.length;

  const strategicCompleted = completed.filter(
    (m) => m.goalId || (m.confidence && m.confidence >= 0.85 && !m.isNegativeConstraint)
  ).length;
  const strategicPercentage = completed.length > 0 ? Math.round((strategicCompleted / completed.length) * 100) : 0;

  const handleDispositionChange = (id: string, choice: 'reevaluate' | 'breakdown' | 'drop') => {
    setDispositions((prev) => ({ ...prev, [id]: choice }));
  };

  const handleSubmit = () => {
    onSubmitFeedback(rating, comments.trim() || undefined, dispositions);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 flex flex-col gap-5 max-h-[92vh] overflow-y-auto text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2 font-mono">
              <span>🌙 End-of-Day Review</span>
            </h3>
            <p className="text-xs text-slate-400">Wrap up today cleanly without an overwhelming backlog.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Completion Scorecard & Strategic Ratio */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Today's Execution Scorecard
              </span>
              <div className="text-xl font-extrabold text-slate-100">
                {completed.length} of {total} moves executed
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {total > 0 ? Math.round((completed.length / total) * 100) : 0}%
            </div>
          </div>

          {/* Strategic vs Tactical Ratio Meter */}
          {completed.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                <span>Strategic Needle-Movers ({strategicPercentage}%)</span>
                <span>Tactical / Boundaries ({100 - strategicPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
                  style={{ width: `${strategicPercentage}%` }} 
                  title="Strategic Moves"
                />
                <div 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  style={{ width: `${100 - strategicPercentage}%` }} 
                  title="Tactical Unblockers & Boundaries"
                />
              </div>
            </div>
          )}
        </div>

        {/* Unfinished Moves Disposition */}
        {pendingMoves.length > 0 && (
          <div className="space-y-2 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Unfinished Moves
              </span>
              <p className="text-[11px] text-slate-400">
                Choose what to do with today's remaining moves:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {pendingMoves.map((m) => (
                <div key={m.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-slate-200 line-clamp-1">
                    #{m.priorityRank} {m.action}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleDispositionChange(m.id, 'reevaluate')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                        dispositions[m.id] === 'reevaluate'
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      Fresh Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDispositionChange(m.id, 'breakdown')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                        dispositions[m.id] === 'breakdown'
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      Shrink to 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDispositionChange(m.id, 'drop')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                        dispositions[m.id] === 'drop'
                          ? 'bg-rose-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      Drop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Rating */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            How well did today's 5 moves fit your schedule?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRating(opt.id)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  rating === opt.id
                    ? 'border-emerald-500 bg-slate-900 ring-1 ring-emerald-500 font-bold'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-400'
                }`}
              >
                <div className={`text-xs font-bold ${rating === opt.id ? 'text-emerald-400' : 'text-slate-200'}`}>{opt.label}</div>
                <div className="text-[10px] text-slate-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Comments / Tomorrow's Context */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 block">
              What should NEXT5 remember for tomorrow?
            </label>
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              Voice note
            </button>
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="e.g. Back-to-back meetings drained my afternoon. Tomorrow start with proposal draft..."
            rows={2}
            className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-xs focus:border-emerald-500 focus:outline-hidden placeholder:text-slate-600 resize-none leading-relaxed"
          />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reflections are transparently recorded into your memory model for tomorrow's ranking.</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="submit-end-of-day-btn"
            onClick={handleSubmit}
            disabled={isSubmitted}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 hover:from-emerald-300 hover:to-teal-200 transition shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
          >
            {isSubmitted ? (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                Saved!
              </>
            ) : (
              'Save & Rest'
            )}
          </button>
        </div>
      </div>

      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        initialText={comments}
        promptTitle="Note for tomorrow"
        onSubmitTranscript={(txt) => setComments(txt)}
      />
    </div>
  );
};
