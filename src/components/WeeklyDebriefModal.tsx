import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  RefreshCw, 
  Trophy, 
  AlertCircle, 
  Compass, 
  Brain, 
  Check, 
  ArrowRight, 
  Sliders, 
  Flame,
  Calendar,
  Layers,
  Heart
} from 'lucide-react';
import { Goal, Recommendation, MemoryItem, WeeklyDebriefReport } from '../types';

interface WeeklyDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  recommendations: Recommendation[];
  memory: MemoryItem[];
  onAdoptMemoryRule: (rule: { content: string; type: any }) => void;
  onTriggerCatchUp?: () => void;
}

export const WeeklyDebriefModal: React.FC<WeeklyDebriefModalProps> = ({
  isOpen,
  onClose,
  goals,
  recommendations,
  memory,
  onAdoptMemoryRule,
  onTriggerCatchUp,
}) => {
  const [report, setReport] = useState<WeeklyDebriefReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAdoptedRule, setHasAdoptedRule] = useState(false);

  const fetchDebrief = async () => {
    setIsLoading(true);
    setHasAdoptedRule(false);
    try {
      const res = await fetch('/api/weekly-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals,
          recommendations,
          memory,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to generate weekly debrief:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report) {
      fetchDebrief();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedCount = recommendations.filter((r) => r.status === 'completed').length;
  const strategicCount = recommendations.filter(
    (r) => r.status === 'completed' && (r.goalId || r.priorityRank <= 3) && !r.isNegativeConstraint
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-stone-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-stone-50 flex items-start justify-between gap-3 border-b border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Phase 9 Strategic Review
              </span>
              <span className="text-[10px] font-medium text-stone-400">
                Weekly Reset Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Weekly Executive Debrief & Reset
            </h2>
            <p className="text-xs text-stone-400 leading-snug">
              Candid alignment audit: what drove real compounding vs what leaked cognitive momentum.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchDebrief}
              disabled={isLoading}
              title="Regenerate Debrief"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-stone-400 animate-spin mx-auto" />
              <div className="text-sm font-bold text-stone-800">
                Evaluating weekly alignment and signal vs noise...
              </div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Comparing completed moves against confirmed high-stakes goals to generate your strategic reset.
              </p>
            </div>
          ) : report ? (
            <>
              {/* Scorecard Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Strategic Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-stone-900">
                      {report.strategicExecutionScore}
                    </span>
                    <span className="text-xs text-stone-400 font-semibold">/ 100</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Alignment Grade
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-emerald-800">
                      {report.alignmentGrade}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                      Solid
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Moves Executed
                  </span>
                  <span className="text-2xl font-black text-stone-900 block mt-0.5">
                    {completedCount}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Needle-Movers
                  </span>
                  <span className="text-2xl font-black text-stone-900 block mt-0.5">
                    {strategicCount}
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 text-stone-50 space-y-2 border border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Executive Assessment
                </span>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
                  {report.executiveSummary}
                </p>
              </div>

              {/* High-Leverage Win vs Primary Blindspot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Top Win */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <Trophy className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider">Top Strategic Win</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {report.topWin}
                  </p>
                </div>

                {/* Blindspot */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold uppercase tracking-wider">Primary Friction Leak</span>
                  </div>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    {report.primaryBlindspot}
                  </p>
                </div>
              </div>

              {/* Drifting Goal Notice */}
              {report.driftingGoalAlert && (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5 max-w-md">
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                      Drift Warning
                    </span>
                    <p className="text-xs text-rose-950 font-medium">
                      {report.driftingGoalAlert}
                    </p>
                  </div>
                  {onTriggerCatchUp && (
                    <button
                      onClick={() => {
                        onTriggerCatchUp();
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-800 text-white text-xs font-bold hover:bg-rose-900 transition flex items-center gap-1 shrink-0"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Trigger Catch-Up
                    </button>
                  )}
                </div>
              )}

              {/* Next Week's 3 Non-Negotiable Priorities */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-700" />
                  Upcoming Week's Strategic Focal Themes
                </span>

                <div className="space-y-2">
                  {report.upcomingStrategicPriorities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational Heuristic (Adopt Rule into Memory) */}
              {report.suggestedMemoryRule && (
                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-purple-700" />
                      Suggested Engine Memory Rule
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                      {report.suggestedMemoryRule.type}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-900 space-y-1">
                    <p className="font-bold">"{report.suggestedMemoryRule.content}"</p>
                    <p className="text-[11px] text-stone-500">
                      {report.suggestedMemoryRule.explanation}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onAdoptMemoryRule({
                        content: report.suggestedMemoryRule.content,
                        type: report.suggestedMemoryRule.type,
                      });
                      setHasAdoptedRule(true);
                    }}
                    disabled={hasAdoptedRule}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      hasAdoptedRule
                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                        : 'bg-stone-900 text-white hover:bg-stone-800 shadow-xs'
                    }`}
                  >
                    {hasAdoptedRule ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-700 font-black" />
                        Rule Persisted into NEXT5 Engine Memory!
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" />
                        Adopt Rule into NEXT5 Memory
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Restoration Guidance */}
              {report.restorationAdvice && (
                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
                  <Heart className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Cognitive Restoration Boundary</span>
                    <p className="text-[11px] text-sky-900 leading-relaxed">
                      {report.restorationAdvice}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-stone-500">
              Unable to generate report. Please click retry.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-medium">
            Weekly debrief calibrated to your goals & past feedback.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition"
          >
            Close Debrief
          </button>
        </div>
      </div>
    </div>
  );
};
