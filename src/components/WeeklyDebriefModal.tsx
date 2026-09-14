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
  Flame,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-slate-100 flex items-start justify-between gap-3 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Strategic Review
              </span>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                Weekly Reset Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100 font-mono">
              Weekly Debrief & Alignment Reset
            </h2>
            <p className="text-xs text-slate-400 leading-snug">
              Candid alignment audit: what drove real compounding vs what leaked cognitive momentum.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchDebrief}
              disabled={isLoading}
              title="Regenerate Debrief"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-200">
                Evaluating weekly alignment and signal vs noise...
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Comparing completed moves against confirmed high-stakes goals to generate your strategic reset.
              </p>
            </div>
          ) : report ? (
            <>
              {/* Scorecard Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                    Strategic Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {report.strategicExecutionScore}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold font-mono">/ 100</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                    Alignment Grade
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {report.alignmentGrade}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30 uppercase font-mono">
                      Solid
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                    Moves Executed
                  </span>
                  <span className="text-2xl font-black text-slate-100 block mt-0.5 font-mono">
                    {completedCount}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                    Needle-Movers
                  </span>
                  <span className="text-2xl font-black text-emerald-400 block mt-0.5 font-mono">
                    {strategicCount}
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-2 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
                  <Compass className="w-3.5 h-3.5" />
                  Executive Assessment
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {report.executiveSummary}
                </p>
              </div>

              {/* High-Leverage Win vs Primary Blindspot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Top Win */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Top Strategic Win</span>
                  </div>
                  <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                    {report.topWin}
                  </p>
                </div>

                {/* Blindspot */}
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Primary Friction Leak</span>
                  </div>
                  <p className="text-xs text-amber-100/90 font-medium leading-relaxed">
                    {report.primaryBlindspot}
                  </p>
                </div>
              </div>

              {/* Drifting Goal Notice */}
              {report.driftingGoalAlert && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5 max-w-md">
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider font-mono">
                      Drift Warning
                    </span>
                    <p className="text-xs text-rose-200 font-medium">
                      {report.driftingGoalAlert}
                    </p>
                  </div>
                  {onTriggerCatchUp && (
                    <button
                      onClick={() => {
                        onTriggerCatchUp();
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-800 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Trigger Catch-Up
                    </button>
                  )}
                </div>
              )}

              {/* Upcoming Strategic Priorities */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1 flex items-center gap-1.5 font-mono">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Upcoming Week's Strategic Focal Themes
                </span>

                <div className="space-y-2">
                  {report.upcomingStrategicPriorities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-md bg-emerald-400 text-slate-950 text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Working Preference */}
              {report.suggestedMemoryRule && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      Suggested Working Preference
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                      {report.suggestedMemoryRule.type}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 space-y-1">
                    <p className="font-bold text-emerald-300">"{report.suggestedMemoryRule.content}"</p>
                    <p className="text-[11px] text-slate-400">
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
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      hasAdoptedRule
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30 cursor-default'
                        : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                    }`}
                  >
                    {hasAdoptedRule ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        Preference Saved to NEXT5 Engine Memory!
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" />
                        Save Preference into NEXT5 Memory
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Restoration Guidance */}
              {report.restorationAdvice && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <Heart className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-100 font-mono">Cognitive Restoration Boundary</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {report.restorationAdvice}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Unable to generate report. Please click retry.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Weekly debrief calibrated to your goals & past feedback.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
          >
            Close Debrief
          </button>
        </div>
      </div>
    </div>
  );
};
