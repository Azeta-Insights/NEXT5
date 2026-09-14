import React, { useState } from 'react';
import { 
  CheckCircle2, ChevronDown, ChevronUp, 
  Sparkles, RefreshCw, ArrowRight, ShieldAlert,
  Lightbulb, ListChecks, Mic
} from 'lucide-react';
import { Recommendation, DailyContext, Goal, EngineMode, UserProfile } from '../types';

interface Next5ViewProps {
  user?: UserProfile;
  recommendations: Recommendation[];
  dailyContext: DailyContext;
  goals: Goal[];
  currentMode: EngineMode;
  isLoading: boolean;
  onUpdateStatus: (recId: string, status: Recommendation['status']) => void;
  onRefreshPriorities: (mode?: EngineMode) => void;
  onOpenContextModal: () => void;
  onOpenEndOfDay: () => void;
  onOpenVoiceGoals?: () => void;
}

const ENGINE_MODES: { id: EngineMode; label: string; description: string }[] = [
  { id: 'normal', label: 'Standard', description: 'Balanced deep work & essential tactical execution' },
  { id: '15min', label: '15 minutes', description: 'Tight time windows; bite-sized momentum moves' },
  { id: 'low_energy', label: 'Low energy', description: 'Gentle on cognitive load; preserves energy & moves milestones' },
  { id: 'bad_day', label: 'Bad day', description: 'Crisis mode; cuts noise to absolute baseline survivability' },
  { id: 'catch_up', label: 'Catch-up', description: 'Rapid velocity recovery on backlogged commitments' },
  { id: 'high_energy', label: 'High energy', description: 'Maximum ambitious deep-work flow' },
];

const formatAvailableTime = (time: string | undefined): string => {
  switch (time) {
    case '10m': return '10 min';
    case '30m': return '30 min';
    case '1h': return '1 hour';
    case '2h_plus': return '2+ hours';
    case 'full_day': return 'Full day';
    default: return time ? time.replace('_', ' ') : '2+ hours';
  }
};

const formatModeName = (mode: string | undefined): string => {
  switch (mode) {
    case 'normal': return 'Standard';
    case '15min': return '15 minutes';
    case 'low_energy': return 'Low energy';
    case 'bad_day': return 'Bad day';
    case 'catch_up': return 'Catch-up';
    case 'high_energy': return 'High energy';
    default: return mode ? mode.replace('_', ' ') : 'Standard';
  }
};

const formatCategory = (category: string | undefined): string => {
  switch (category) {
    case 'milestone_progression': return 'Milestone Move';
    case 'immediate_fire': return 'Urgent Blocker';
    case 'micro_step': return 'Momentum Move';
    case 'boundary': return 'Boundary';
    case 'administrative_triage': return 'Triage';
    case 'relationship_capital': return 'Relationship';
    case 'recovery_rest': return 'Energy Reset';
    case 'negative_constraint': return 'Constraint';
    default: return category ? category.replace('_', ' ') : 'Execution';
  }
};

export const Next5View: React.FC<Next5ViewProps> = ({
  user,
  recommendations,
  dailyContext,
  currentMode,
  isLoading,
  onUpdateStatus,
  onRefreshPriorities,
  onOpenContextModal,
  onOpenEndOfDay,
  onOpenVoiceGoals,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdjustMenu, setShowAdjustMenu] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const hasCustomName = user?.name && user.name !== 'User' && user.name !== 'Private Guest';

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* 1. Obsidian Hero Section */}
      <div className="pt-2 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-50 tracking-tight font-mono">
              YOUR NEXT<span className="text-emerald-400">5</span>
            </h1>
            {hasCustomName && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {user.name}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
            {hasCustomName
              ? `Personalized for ${user.name}${user.roleTitle ? ` (${user.roleTitle})` : ''} • What matters most today based on your goals.`
              : 'What matters most today, based on your goals and current conditions.'}
          </p>
        </div>

        {onOpenVoiceGoals && (
          <button
            id="speak-goals-next5-btn"
            onClick={onOpenVoiceGoals}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold transition shadow-xs self-start sm:self-auto shrink-0 cursor-pointer"
            title="Review voice prompt and outline all goals"
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Speak Goals</span>
          </button>
        )}
      </div>

      {/* Notice if fewer than 5 moves are generated */}
      {!isLoading && recommendations.length > 0 && recommendations.length < 5 && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 text-slate-400">
            <span className="font-semibold text-slate-200">
              Selected {recommendations.length} moves for your {formatAvailableTime(dailyContext.availableTime)} window ({dailyContext.energy}% energy).
            </span>
            <p className="text-[11px] text-slate-500">
              Want NEXT5 to outline more goals from voice?
            </p>
          </div>
          {onOpenVoiceGoals && (
            <button
              onClick={onOpenVoiceGoals}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Mic className="w-3 h-3 text-rose-400" />
              <span>Outline Goals</span>
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center bg-slate-900/70 rounded-2xl border border-slate-800 shadow-md space-y-3">
          <div className="flex justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Evaluating what matters most...
          </p>
        </div>
      )}

      {/* 2. The Prioritized Moves (Dominating the Screen) */}
      {!isLoading && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const isExpanded = expandedId === rec.id;
            const isRank1 = rec.priorityRank === 1;
            const isDone = rec.status === 'completed';
            const isPostponed = rec.status === 'not_today';

            // Check if this is a negative constraint / strategic boundary
            const isNegative =
              rec.isNegativeConstraint === true ||
              rec.category === 'boundary' ||
              rec.action.toLowerCase().startsWith("don't") ||
              rec.action.toLowerCase().startsWith('avoid');

            // Visually distinct Negative Constraint Card
            if (isNegative) {
              const timeSaved = rec.estimatedMinutes > 0 ? `${rec.estimatedMinutes} min saved` : '15 min saved';

              return (
                <div
                  key={rec.id}
                  id={`rec-card-${rec.id}`}
                  className={`rounded-2xl border transition duration-150 p-4 sm:p-5 space-y-3 ${
                    isDone
                      ? 'bg-slate-950/60 border-slate-900 opacity-60'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-sm'
                  }`}
                >
                  {/* Top line: Badge & Time Saved */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        DON’T PRIORITIZE
                      </span>
                      <span className="text-xs font-semibold text-amber-300/80">
                        {timeSaved}
                      </span>
                    </div>
                  </div>

                  {/* Action Title */}
                  <div className="space-y-1">
                    <h2
                      className={`text-base sm:text-lg font-bold tracking-tight text-slate-100 ${
                        isDone ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {rec.action}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {rec.rationale}
                    </p>
                  </div>

                  {/* Why this? Toggle */}
                  <div>
                    <button
                      id={`rec-why-btn-${rec.id}`}
                      onClick={() => toggleExpand(rec.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-400/80 hover:text-amber-300 transition py-0.5 group cursor-pointer"
                    >
                      <span>Why this?</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Expandable Why This */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 text-xs text-slate-300 space-y-2 animate-in fade-in duration-100">
                        {rec.whyNow && (
                          <div>
                            <span className="font-semibold text-amber-200 block">Why now:</span>
                            <p className="text-slate-300 mt-0.5">{rec.whyNow}</p>
                          </div>
                        )}
                        {rec.goalTitle && (
                          <div>
                            <span className="font-semibold text-amber-200 block">Protects focus for:</span>
                            <p className="text-slate-300">{rec.goalTitle}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Boundary Actions */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-amber-500/20 flex-wrap gap-2">
                    {isDone ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Kept off today's list
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          id={`rec-got-it-btn-${rec.id}`}
                          onClick={() => onUpdateStatus(rec.id, 'completed')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition cursor-pointer shadow-xs"
                        >
                          Got it
                        </button>
                        <button
                          id={`rec-override-btn-${rec.id}`}
                          onClick={() => onUpdateStatus(rec.id, 'not_today')}
                          className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        >
                          Do it anyway
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Standard Recommendation Card
            return (
              <div
                key={rec.id}
                id={`rec-card-${rec.id}`}
                className={`rounded-2xl border transition duration-150 p-4 sm:p-5 space-y-3 ${
                  isDone
                    ? 'bg-slate-950/60 border-slate-900 opacity-60'
                    : isRank1
                    ? 'bg-slate-900/90 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                    : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 shadow-md'
                }`}
              >
                {/* 1. Rank Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center ${
                      isRank1
                        ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    #{rec.priorityRank}
                  </span>
                  {isRank1 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                      Top Priority
                    </span>
                  )}
                </div>

                {/* 2. The Action Title */}
                <div className="space-y-1">
                  <h2
                    className={`text-base sm:text-lg font-bold tracking-tight text-slate-100 leading-snug ${
                      isDone ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {rec.action}
                  </h2>

                  {/* 3. Category & Duration */}
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-400/90">{formatCategory(rec.category)}</span>
                    {rec.estimatedMinutes > 0 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span>{rec.estimatedMinutes} min</span>
                      </>
                    )}
                    {rec.goalTitle && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 truncate max-w-[240px]">
                          Goal: {rec.goalTitle}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. Short Rationale */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {rec.rationale}
                </p>

                {/* 5. Why this? Toggle */}
                <div>
                  <button
                    id={`rec-why-btn-${rec.id}`}
                    onClick={() => toggleExpand(rec.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-300 transition py-0.5 group cursor-pointer"
                  >
                    <span>Why this?</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Expandable Reasoning Details */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-100">
                      {isRank1 && rec.whyRank1Explanation && (
                        <div className="p-3 bg-slate-950/70 rounded-xl border border-emerald-500/20 text-xs text-slate-200 space-y-1">
                          <span className="font-bold text-emerald-400 block">Why #1?</span>
                          <p className="leading-relaxed text-slate-300">
                            {rec.whyRank1Explanation}
                          </p>
                        </div>
                      )}

                      {rec.whyNow && (
                        <div>
                          <span className="font-semibold text-slate-200 block">Why now:</span>
                          <p className="text-slate-400 mt-0.5 leading-relaxed">{rec.whyNow}</p>
                        </div>
                      )}

                      {rec.substeps && rec.substeps.length > 0 && (
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <span className="font-semibold text-slate-200 text-[11px] block flex items-center gap-1">
                            <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                            Execution Steps:
                          </span>
                          <ol className="list-decimal list-inside space-y-0.5 text-slate-400 text-[11px] pl-0.5">
                            {rec.substeps.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {rec.frictionPoint && (
                        <div className="flex items-start gap-1.5 text-slate-400 text-[11px] italic">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Friction bypass: {rec.frictionPoint}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Action Controls Row: Complete vs Subtle Not today */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isDone ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed
                      </span>
                    ) : (
                      <button
                        id={`rec-complete-btn-${rec.id}`}
                        onClick={() => onUpdateStatus(rec.id, 'completed')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 text-xs font-extrabold transition shadow-[0_0_15px_rgba(52,211,153,0.25)] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                        Complete
                      </button>
                    )}
                  </div>

                  {!isDone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <button
                        id={`rec-not-today-btn-${rec.id}`}
                        onClick={() =>
                          onUpdateStatus(rec.id, isPostponed ? 'pending' : 'not_today')
                        }
                        className="text-slate-400 hover:text-slate-200 transition px-1.5 py-1 cursor-pointer"
                      >
                        {isPostponed ? 'Postponed' : 'Not today'}
                      </button>
                      <span className="text-slate-700">·</span>
                      <button
                        id={`rec-not-relevant-btn-${rec.id}`}
                        onClick={() => onUpdateStatus(rec.id, 'not_relevant')}
                        className="text-slate-400 hover:text-slate-200 transition px-1.5 py-1 cursor-pointer"
                      >
                        Not relevant
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && recommendations.length === 0 && (
        <div className="p-8 text-center bg-slate-900/70 rounded-2xl border border-slate-800 shadow-md space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-100 text-sm">No active moves</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tell NEXT5 what you're working on or update today's circumstances to generate your next five moves.
            </p>
          </div>
          <button
            onClick={onOpenContextModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition shadow-md cursor-pointer"
          >
            Prioritize for Today
          </button>
        </div>
      )}

      {/* 3. Lightweight Controls for Changing Circumstances */}
      <div className="pt-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
          {/* Adjust for today dropdown */}
          <div className="relative">
            <button
              id="adjust-today-btn"
              onClick={() => setShowAdjustMenu(!showAdjustMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 text-xs font-semibold text-slate-200 transition shadow-xs cursor-pointer"
            >
              <span>Adjust for today</span>
              <span className="text-slate-600 font-normal">·</span>
              <span className="text-slate-400 font-normal truncate max-w-[200px]">
                {formatModeName(currentMode)} · {formatAvailableTime(dailyContext.availableTime)} · {dailyContext.energy}% energy
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-0.5" />
            </button>

            {/* Mode selection popover */}
            {showAdjustMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowAdjustMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-2 z-40 animate-in fade-in zoom-in-95 duration-100 text-slate-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Adjust Mode
                  </div>
                  {ENGINE_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onRefreshPriorities(m.id);
                        setShowAdjustMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col transition hover:bg-slate-800 cursor-pointer ${
                        currentMode === m.id ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{m.label}</span>
                        {currentMode === m.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {m.description}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Context Update & Recalculate */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="whats-changed-btn"
              onClick={onOpenContextModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition shadow-xs cursor-pointer"
              title="Update today's circumstances (Key: C)"
            >
              <span>What’s changed?</span>
            </button>

            <button
              id="recalculate-btn"
              disabled={isLoading}
              onClick={() => onRefreshPriorities(currentMode)}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition shadow-xs cursor-pointer"
              title="Recalculate priorities (Key: R)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4. TODAY'S CONTEXT */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              TODAY'S CONTEXT
            </span>
            <p className="text-slate-300 italic leading-relaxed text-xs">
              {dailyContext.freeformContext && dailyContext.freeformContext.trim() !== ''
                ? `“${dailyContext.freeformContext}”`
                : 'Nothing unusual today.'}
            </p>
          </div>
          <button
            onClick={onOpenContextModal}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 shrink-0 pt-0.5 cursor-pointer"
          >
            {dailyContext.freeformContext && dailyContext.freeformContext.trim() !== '' ? 'Edit' : 'Add context'}
          </button>
        </div>
      </div>

      {/* 5. End of Day Review Prompt */}
      {!isLoading && (
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-100">Finished for the day?</h4>
            <p className="text-[11px] text-slate-400">
              Review completed moves and calibrate tomorrow.
            </p>
          </div>
          <button
            id="open-end-of-day-btn"
            onClick={onOpenEndOfDay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-slate-700 text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
