import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, ChevronDown, ChevronUp, 
  Sparkles, RefreshCw, ArrowRight, ShieldAlert,
  Play, Lightbulb, ListChecks, Sliders, Headphones, Brain
} from 'lucide-react';
import { Recommendation, DailyContext, Goal, EngineMode } from '../types';
import { MoveExecutionModal } from './MoveExecutionModal';

interface Next5ViewProps {
  recommendations: Recommendation[];
  dailyContext: DailyContext;
  goals: Goal[];
  currentMode: EngineMode;
  isLoading: boolean;
  onUpdateStatus: (recId: string, status: Recommendation['status']) => void;
  onRefreshPriorities: (mode?: EngineMode) => void;
  onOpenContextModal: () => void;
  onOpenEndOfDay: () => void;
  onOpenSimulator?: () => void;
  onOpenAudioBriefing?: () => void;
  onOpenVoiceFriction?: () => void;
  activeSprintRec?: Recommendation | null;
  onCloseSprintModal?: () => void;
  onOpenSprintModal?: (rec: Recommendation | null) => void;
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
    case 'deep_work': return 'Deep Work';
    case 'quick_win': return 'Quick Win';
    case 'recovery': return 'Recovery';
    case 'boundary': return 'Boundary';
    case 'business': return 'Business';
    case 'career': return 'Career';
    case 'personal': return 'Personal';
    case 'health': return 'Health';
    case 'work': return 'Work';
    case 'administrative': return 'Admin';
    case 'communication': return 'Communication';
    default: return category ? category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ') : 'Focus';
  }
};

export const Next5View: React.FC<Next5ViewProps> = ({
  recommendations,
  dailyContext,
  goals,
  currentMode,
  isLoading,
  onUpdateStatus,
  onRefreshPriorities,
  onOpenContextModal,
  onOpenEndOfDay,
  onOpenSimulator,
  onOpenAudioBriefing,
  onOpenVoiceFriction,
  activeSprintRec,
  onCloseSprintModal,
  onOpenSprintModal,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [internalSprintRec, setInternalSprintRec] = useState<Recommendation | null>(null);
  const [showAdjustMenu, setShowAdjustMenu] = useState(false);

  const selectedSprintRec = activeSprintRec !== undefined ? activeSprintRec : internalSprintRec;
  const setSelectedSprintRec = (rec: Recommendation | null) => {
    if (onOpenSprintModal) {
      onOpenSprintModal(rec);
    } else {
      setInternalSprintRec(rec);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      {/* 1. Calm Hero Section */}
      <div className="pt-2 pb-1 space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          YOUR NEXT5
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-normal leading-relaxed">
          What matters most today, based on your goals and what’s happening now.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex justify-center">
            <Sparkles className="w-5 h-5 text-stone-900 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-stone-800">
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
                      ? 'bg-stone-50/70 border-stone-200 opacity-60'
                      : 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                  }`}
                >
                  {/* Top line: Badge & Time Saved */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-700" />
                        DON’T PRIORITIZE
                      </span>
                      <span className="text-xs font-semibold text-amber-900/80">
                        {timeSaved}
                      </span>
                    </div>
                  </div>

                  {/* Action Title */}
                  <div className="space-y-1">
                    <h2
                      className={`text-base sm:text-lg font-bold tracking-tight text-stone-900 ${
                        isDone ? 'line-through text-stone-400' : ''
                      }`}
                    >
                      {rec.action}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {rec.rationale}
                    </p>
                  </div>

                  {/* Why this? Toggle */}
                  <div>
                    <button
                      id={`rec-why-btn-${rec.id}`}
                      onClick={() => toggleExpand(rec.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900 transition py-0.5 group"
                    >
                      <span>Why this?</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900" />
                      )}
                    </button>

                    {/* Expandable Why This */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 text-xs text-stone-600 space-y-2 animate-in fade-in duration-100">
                        {rec.whyNow && (
                          <div>
                            <span className="font-semibold text-stone-800 block">Why now:</span>
                            <p className="text-stone-600 mt-0.5">{rec.whyNow}</p>
                          </div>
                        )}
                        {rec.goalTitle && (
                          <div>
                            <span className="font-semibold text-stone-800 block">Protects focus for:</span>
                            <p className="text-stone-700">{rec.goalTitle}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Boundary Actions */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-amber-200/60 flex-wrap gap-2">
                    {isDone ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Kept off today's list
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          id={`rec-got-it-btn-${rec.id}`}
                          onClick={() => onUpdateStatus(rec.id, 'completed')}
                          className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shadow-2xs"
                        >
                          Got it
                        </button>
                        <button
                          id={`rec-override-btn-${rec.id}`}
                          onClick={() => onUpdateStatus(rec.id, 'not_today')}
                          className="text-xs text-stone-400 hover:text-stone-700 transition"
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
                    ? 'bg-stone-50/70 border-stone-200 opacity-60'
                    : isRank1
                    ? 'bg-white border-stone-900/30 ring-1 ring-stone-900/10 shadow-xs'
                    : 'bg-white border-stone-200 shadow-2xs hover:border-stone-300'
                }`}
              >
                {/* 1. Rank Badge Only (No "Top Move" label) */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center ${
                      isRank1
                        ? 'bg-stone-900 text-stone-50'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    #{rec.priorityRank}
                  </span>
                </div>

                {/* 2. The Action Title */}
                <div className="space-y-1">
                  <h2
                    className={`text-base sm:text-lg font-bold tracking-tight text-stone-900 leading-snug ${
                      isDone ? 'line-through text-stone-400' : ''
                    }`}
                  >
                    {rec.action}
                  </h2>

                  {/* 3. Category & Duration */}
                  <div className="text-xs text-stone-500 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{formatCategory(rec.category)}</span>
                    {rec.estimatedMinutes > 0 && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span>{rec.estimatedMinutes} min</span>
                      </>
                    )}
                    {rec.goalTitle && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="text-stone-600 truncate max-w-[240px]">
                          Linked to: {rec.goalTitle}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. Short Rationale */}
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {rec.rationale}
                </p>

                {/* 5. Why this? Toggle (Collapsed by default, keeps reasoning secondary) */}
                <div>
                  <button
                    id={`rec-why-btn-${rec.id}`}
                    onClick={() => toggleExpand(rec.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900 transition py-0.5 group"
                  >
                    <span>Why this?</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900" />
                    )}
                  </button>

                  {/* Expandable Reasoning Details (Why #1, Why now, Linked Goal, Substeps, Friction) */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-stone-100 text-xs text-stone-600 space-y-2.5 animate-in fade-in duration-100">
                      {/* Why #1? Only appears when expanded */}
                      {isRank1 && rec.whyRank1Explanation && (
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-700 space-y-1">
                          <span className="font-bold text-stone-900 block">Why #1?</span>
                          <p className="leading-relaxed text-stone-600">
                            {rec.whyRank1Explanation}
                          </p>
                        </div>
                      )}

                      {rec.whyNow && (
                        <div>
                          <span className="font-semibold text-stone-800 block">Why now:</span>
                          <p className="text-stone-600 mt-0.5 leading-relaxed">{rec.whyNow}</p>
                        </div>
                      )}

                      {rec.substeps && rec.substeps.length > 0 && (
                        <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70 space-y-1">
                          <span className="font-semibold text-stone-800 text-[11px] block flex items-center gap-1">
                            <ListChecks className="w-3.5 h-3.5 text-stone-600" />
                            Execution Steps:
                          </span>
                          <ol className="list-decimal list-inside space-y-0.5 text-stone-600 text-[11px] pl-0.5">
                            {rec.substeps.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {rec.frictionPoint && (
                        <div className="flex items-start gap-1.5 text-stone-600 text-[11px] italic">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Friction bypass: {rec.frictionPoint}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Action Controls Row: Primary [Start] [Complete] vs Subtle [Not today · Not relevant] */}
                <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isDone ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Completed
                      </span>
                    ) : (
                      <>
                        <button
                          id={`rec-start-btn-${rec.id}`}
                          onClick={() => setSelectedSprintRec(rec)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shadow-2xs"
                        >
                          <Play className="w-3 h-3 fill-stone-50" />
                          Start
                        </button>

                        <button
                          id={`rec-complete-btn-${rec.id}`}
                          onClick={() => onUpdateStatus(rec.id, 'completed')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-stone-400" />
                          Complete
                        </button>
                      </>
                    )}
                  </div>

                  {!isDone && (
                    <div className="flex items-center gap-1 text-xs text-stone-400">
                      <button
                        id={`rec-not-today-btn-${rec.id}`}
                        onClick={() =>
                          onUpdateStatus(rec.id, isPostponed ? 'pending' : 'not_today')
                        }
                        className="text-stone-400 hover:text-stone-600 transition px-1 py-0.5"
                      >
                        {isPostponed ? 'Postponed' : 'Not today'}
                      </button>
                      <span className="text-stone-300">·</span>
                      <button
                        id={`rec-not-relevant-btn-${rec.id}`}
                        onClick={() => onUpdateStatus(rec.id, 'not_relevant')}
                        className="text-stone-400 hover:text-stone-600 transition px-1 py-0.5"
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
        <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-stone-900 text-sm">No active moves</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Tell NEXT5 what you're working on or update today's circumstances to generate your next five moves.
            </p>
          </div>
          <button
            onClick={onOpenContextModal}
            className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shadow-2xs"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 transition shadow-2xs"
            >
              <span>Adjust for today</span>
              <span className="text-stone-300 font-normal">·</span>
              <span className="text-stone-500 font-normal truncate max-w-[200px]">
                {formatModeName(currentMode)} · {formatAvailableTime(dailyContext.availableTime)} · {dailyContext.energy}% energy
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-0.5" />
            </button>

            {/* Mode selection popover */}
            {showAdjustMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowAdjustMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Adjust Mode
                  </div>
                  {ENGINE_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onRefreshPriorities(m.id);
                        setShowAdjustMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col transition hover:bg-stone-50 ${
                        currentMode === m.id ? 'bg-stone-50 text-stone-900 font-semibold' : 'text-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{m.label}</span>
                        {currentMode === m.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 font-normal">
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 transition shadow-2xs"
              title="Update today's circumstances (Key: C)"
            >
              <span>What’s changed?</span>
            </button>

            {onOpenSimulator && (
              <button
                id="whatif-simulator-btn"
                onClick={onOpenSimulator}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-600 transition shadow-2xs"
                title="What-If Scenario Simulator (Key: T)"
              >
                <Sliders className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">What-If</span>
              </button>
            )}

            <button
              id="recalculate-btn"
              disabled={isLoading}
              onClick={() => onRefreshPriorities(currentMode)}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition shadow-2xs"
              title="Recalculate priorities (Key: R)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4. TODAY'S CONTEXT (Calm, Secondary Section - Requirement 13) */}
        <div className="p-3.5 rounded-xl bg-stone-100/60 border border-stone-200/70 text-xs text-stone-700 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              TODAY'S CONTEXT
            </span>
            <p className="text-stone-700 italic leading-relaxed text-xs">
              {dailyContext.freeformContext && dailyContext.freeformContext.trim() !== ''
                ? `“${dailyContext.freeformContext}”`
                : 'Nothing unusual today.'}
            </p>
          </div>
          <button
            onClick={onOpenContextModal}
            className="text-xs font-semibold text-stone-700 hover:text-stone-950 underline underline-offset-2 shrink-0 pt-0.5"
          >
            {dailyContext.freeformContext && dailyContext.freeformContext.trim() !== '' ? 'Edit' : 'Add context'}
          </button>
        </div>
      </div>

      {/* 5. End of Day Review Prompt */}
      {!isLoading && (
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-stone-900">Finished for the day?</h4>
            <p className="text-[11px] text-stone-500">
              Review completed moves and calibrate tomorrow.
            </p>
          </div>
          <button
            id="open-end-of-day-btn"
            onClick={onOpenEndOfDay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shrink-0 shadow-2xs"
          >
            Review
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Focus Sprint & Unblocking Modal */}
      <MoveExecutionModal
        isOpen={Boolean(selectedSprintRec)}
        onClose={() => setSelectedSprintRec(null)}
        recommendation={selectedSprintRec}
        onComplete={(id) => onUpdateStatus(id, 'completed')}
      />
    </div>
  );
};
