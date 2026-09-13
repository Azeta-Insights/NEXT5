import React, { useState } from 'react';
import { CheckCircle2, Star, Sparkles, X, Mic, Check, ArrowRight, ShieldAlert, Brain, RefreshCw, Trash2 } from 'lucide-react';
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
  goals,
  onSubmitFeedback,
}) => {
  const [rating, setRating] = useState<FeedbackRating>('exactly_right');
  const [comments, setComments] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Unfinished moves disposition map (PRD Section 24: Avoid infinite rolling backlog!)
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

  // Strategic vs Reactive calculation
  const strategicCompleted = completed.filter(
    (m) => m.goalId || (m.confidence && m.confidence >= 0.85 && !m.isNegativeConstraint)
  ).length;
  const reactiveOrBoundaryCompleted = completed.length - strategicCompleted;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <span>🌙 End-of-Day Closeout & Calibration</span>
            </h3>
            <p className="text-xs text-stone-500">Close today cleanly without toxic backlog overflow.</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Completion Scorecard & Strategic Ratio */}
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                Today's Execution Scorecard
              </span>
              <div className="text-xl font-extrabold text-stone-900">
                {completed.length} of {total} moves executed
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center font-bold text-sm">
              {total > 0 ? Math.round((completed.length / total) * 100) : 0}%
            </div>
          </div>

          {/* Strategic vs Tactical Ratio Meter */}
          {completed.length > 0 && (
            <div className="pt-2 border-t border-stone-100 space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-stone-700">
                <span>Strategic Needle-Movers ({strategicPercentage}%)</span>
                <span>Tactical / Boundaries ({100 - strategicPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-stone-900 h-full transition-all duration-500" 
                  style={{ width: `${strategicPercentage}%` }} 
                  title="Strategic Moves"
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${100 - strategicPercentage}%` }} 
                  title="Tactical Unblockers & Boundaries"
                />
              </div>
            </div>
          )}
        </div>

        {/* Unfinished Moves Disposition (PRD Section 24) */}
        {pendingMoves.length > 0 && (
          <div className="space-y-2 p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-stone-900 block flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-stone-600" />
                Unfinished Moves Disposition
              </span>
              <p className="text-[11px] text-stone-500">
                NEXT5 does not blindly roll uncompleted tasks forever. Choose how to handle them:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {pendingMoves.map((m) => (
                <div key={m.id} className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-2">
                  <div className="font-semibold text-stone-800 line-clamp-1">
                    #{m.priorityRank} {m.action}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleDispositionChange(m.id, 'reevaluate')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        dispositions[m.id] === 'reevaluate'
                          ? 'bg-stone-900 text-stone-50 font-bold'
                          : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      Fresh Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDispositionChange(m.id, 'breakdown')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        dispositions[m.id] === 'breakdown'
                          ? 'bg-amber-700 text-white font-bold'
                          : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      Shrink to 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDispositionChange(m.id, 'drop')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        dispositions[m.id] === 'drop'
                          ? 'bg-rose-700 text-white font-bold'
                          : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
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
          <label className="text-xs font-bold text-stone-900 block">
            How was today's NEXT5 recommendation calibration?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRating(opt.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  rating === opt.id
                    ? 'border-stone-900 bg-white ring-1 ring-stone-900 font-bold'
                    : 'border-stone-200 bg-stone-100/60 hover:bg-white text-stone-600'
                }`}
              >
                <div className="text-xs font-bold text-stone-900">{opt.label}</div>
                <div className="text-[10px] text-stone-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Comments / Tomorrow's Context */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-900 block">
              What should NEXT5 remember for tomorrow?
            </label>
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1"
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
            className="w-full p-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none placeholder:text-stone-400 resize-none leading-relaxed"
          />
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Brain className="w-3.5 h-3.5 text-stone-400" />
            <span>Reflections are transparently recorded into your memory model for tomorrow's ranking.</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200 transition"
          >
            Cancel
          </button>
          <button
            id="submit-end-of-day-btn"
            onClick={handleSubmit}
            disabled={isSubmitted}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-stone-900 text-stone-50 hover:bg-stone-800 transition shadow-sm"
          >
            {isSubmitted ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Reflected & Saved!
              </>
            ) : (
              'Save & Rest Well'
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
