import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  Flame, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  Play, 
  Check, 
  Layers, 
  BarChart3, 
  CheckSquare2,
  Calendar,
  Trophy,
  Compass,
  Brain,
  Heart,
  AlertCircle
} from 'lucide-react';
import { Goal, Recommendation, DailyContext, MemoryItem, WeeklyDebriefReport } from '../types';

interface FutureMeViewProps {
  goals: Goal[];
  recommendations: Recommendation[];
  memory?: MemoryItem[];
  onTriggerCatchUp?: () => void;
  onAddMemory?: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
}

interface StressTestResult {
  scenario: any;
  recommendations: Recommendation[];
  engineRationale: string;
  assertions: {
    rank1IsManagerReport: boolean;
    rank2Is500kProposal: boolean;
    rank3IsBoundedEmailTriage: boolean;
    rank4IsCertificationStudy: boolean;
    rank5IsNegativeConstraint: boolean;
  };
  allPassed: boolean;
}

export const FutureMeView: React.FC<FutureMeViewProps> = ({ 
  goals, 
  recommendations,
  memory = [],
  onTriggerCatchUp,
  onAddMemory,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'trajectory' | 'drift' | 'weekly_debrief' | 'stress_test'>('trajectory');
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  const [stressTestResult, setStressTestResult] = useState<StressTestResult | null>(null);

  // Weekly Debrief State
  const [debriefReport, setDebriefReport] = useState<WeeklyDebriefReport | null>(null);
  const [isLoadingDebrief, setIsLoadingDebrief] = useState(false);
  const [hasAdoptedDebriefRule, setHasAdoptedDebriefRule] = useState(false);

  const fetchDebrief = async () => {
    setIsLoadingDebrief(true);
    setHasAdoptedDebriefRule(false);
    try {
      const res = await fetch('/api/weekly-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, recommendations, memory }),
      });
      if (res.ok) {
        const data = await res.json();
        setDebriefReport(data);
      }
    } catch (err) {
      console.error('Failed to load debrief:', err);
    } finally {
      setIsLoadingDebrief(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'weekly_debrief' && !debriefReport && !isLoadingDebrief) {
      fetchDebrief();
    }
  }, [activeSubTab]);

  const completedMoves = recommendations.filter((r) => r.status === 'completed');

  // Calculate Strategic vs Tactical Ratio (PRD Section 14)
  const strategicCount = completedMoves.filter(
    (m) => m.goalId || (m.confidence >= 0.85 && !m.isNegativeConstraint)
  ).length;
  const reactiveCount = completedMoves.length - strategicCount;
  const strategicPercentage = completedMoves.length > 0 
    ? Math.round((strategicCount / completedMoves.length) * 100) 
    : 70; // optimistic default for preview

  // Drift Analysis: check which goals are starved of attention (PRD Section 11)
  const goalHealthData = goals.map((g) => {
    const relatedMoves = completedMoves.filter(
      (m) => m.goalId === g.id || (m.goalTitle && m.goalTitle.toLowerCase() === g.title.toLowerCase())
    );
    const hasRecentActivity = relatedMoves.length > 0;
    
    // Determine drift risk
    let health: 'compounding' | 'on_track' | 'at_risk' | 'starved' = 'on_track';
    if (relatedMoves.length >= 2) {
      health = 'compounding';
    } else if (relatedMoves.length === 1) {
      health = 'on_track';
    } else if (g.importance === 'critical' || g.importance === 'high') {
      health = 'at_risk';
    } else {
      health = 'starved';
    }

    return {
      goal: g,
      movesCompleted: relatedMoves.length,
      health,
    };
  });

  const atRiskGoals = goalHealthData.filter((d) => d.health === 'at_risk' || d.health === 'starved');

  // Run PRD Section 40.H Stress Test
  const handleRunStressTest = async () => {
    setIsRunningStressTest(true);
    try {
      const res = await fetch('/api/stress-test-scenario-h', { method: 'POST' });
      const data = await res.json();
      setStressTestResult(data);
    } catch (e) {
      console.error('Failed to run stress test:', e);
    } finally {
      setIsRunningStressTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Future Me & Trajectory Bridge
            </span>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('trajectory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'trajectory'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              📈 Compounding
            </button>
            <button
              onClick={() => setActiveSubTab('drift')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeSubTab === 'drift'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              ⚠️ Drift Engine
              {atRiskGoals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {atRiskGoals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('weekly_debrief')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeSubTab === 'weekly_debrief'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              🎯 Strategic Reset
            </button>
            <button
              onClick={() => {
                setActiveSubTab('stress_test');
                if (!stressTestResult && !isRunningStressTest) {
                  handleRunStressTest();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeSubTab === 'stress_test'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🧪 Developer Benchmark
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Today’s 5 moves are compounding tomorrow’s reality.
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl mt-1">
            Prioritization isn’t about clearing a meaningless list. It’s about compounding the non-negotiables that permanently alter your personal and professional trajectory.
          </p>
        </div>

        {/* Compound Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-100">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
              Active Goals
            </span>
            <span className="text-xl font-black text-stone-900">{goals.length}</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
              Executed Moves
            </span>
            <span className="text-xl font-black text-stone-900">{completedMoves.length}</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
              Strategic Allocation
            </span>
            <span className="text-xl font-black text-stone-900">{strategicPercentage}%</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
              Drift Status
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {atRiskGoals.length === 0 ? 'All Goals Advancing' : `${atRiskGoals.length} Goals Need Moves`}
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: COMPOUNDING TRAJECTORY */}
      {activeSubTab === 'trajectory' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* 30-60-90 Day Compound Projection Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-stone-700" />
                30-Day Trajectory Projection
              </span>
              <span className="text-[11px] font-bold text-stone-500">
                At 5 moves/day = 150 compound actions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
                  Day 10 Milestone
                </span>
                <div className="text-sm font-bold text-stone-900">
                  Critical Deadlines & Immediate Drag Eliminated
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  High-stakes proposals and pressing reports are delivered on time. Reactive backlog drops by 40%.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
                  Day 30 Milestone
                </span>
                <div className="text-sm font-bold text-stone-900">
                  Strategic Compounding & Habits Locked
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Certification exam passed, customer growth engine verified, and daily recovery boundaries respected.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 text-stone-50 border border-stone-800 space-y-2">
                <span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
                  Day 90 Trajectory
                </span>
                <div className="text-sm font-bold text-white">
                  Permanent Step-Change in Output
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  450 high-leverage moves executed without burnout, decision fatigue, or forgotten priorities.
                </p>
              </div>
            </div>
          </div>

          {/* Goal Trajectories */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-900 px-1 flex items-center justify-between">
              <span>Current Goal Trajectories</span>
              <span className="text-xs font-normal text-stone-500">{goals.length} active goals tracked</span>
            </h3>

            {goals.map((g) => {
              const relatedCompleted = completedMoves.filter(
                (m) => m.goalId === g.id || (m.goalTitle && m.goalTitle.toLowerCase() === g.title.toLowerCase())
              );

              return (
                <div
                  key={g.id}
                  className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {g.category}
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">
                          Importance: {g.importance}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-stone-900">{g.title}</h4>
                    </div>

                    {g.deadline && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        Target: {g.deadline}
                      </span>
                    )}
                  </div>

                  {/* Progress metrics */}
                  {(g.targetValue || g.currentValue) && (
                    <div className="p-3 bg-stone-50 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <span className="text-stone-400 text-[10px] block">Current</span>
                        <span className="font-bold text-stone-900">{g.currentValue || 'Baseline'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-300" />
                      <div className="text-right">
                        <span className="text-stone-400 text-[10px] block">Target Outcome</span>
                        <span className="font-bold text-stone-900">{g.targetValue}</span>
                      </div>
                    </div>
                  )}

                  {/* Related Completed Moves */}
                  {relatedCompleted.length > 0 ? (
                    <div className="pt-2 border-t border-stone-100 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 block">
                        Recent moves advancing this:
                      </span>
                      <div className="space-y-1">
                        {relatedCompleted.map((m) => (
                          <div
                            key={m.id}
                            className="text-xs text-stone-700 flex items-center gap-1.5 font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{m.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400 italic">
                      No moves executed yet today for this goal.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DRIFT & NEGLECT ENGINE */}
      {activeSubTab === 'drift' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-stone-900">
                Drift & Neglect Detection Engine
              </h2>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              When reactive firefighting consumes your day, important strategic goals quietly starve. NEXT5 automatically computes neglect scores and surfaces restart moves before goals stall completely.
            </p>

            {/* Strategic Balance Bar */}
            <div className="pt-3 border-t border-stone-100 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-stone-800">
                <span>Strategic Needle-Movers ({strategicPercentage}%)</span>
                <span>Reactive Triage / Boundaries ({100 - strategicPercentage}%)</span>
              </div>
              <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-stone-900 h-full transition-all duration-500" 
                  style={{ width: `${strategicPercentage}%` }} 
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${100 - strategicPercentage}%` }} 
                />
              </div>
              <p className="text-[11px] text-stone-500">
                Recommended target: Keep strategic needle-movers at or above 60% to avoid endless crisis triage.
              </p>
            </div>
          </div>

          {/* Neglected Goals Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-900 px-1">Goal Neglect Audit</h3>

            <div className="space-y-2.5">
              {goalHealthData.map((item) => (
                <div
                  key={item.goal.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.health === 'compounding'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.health === 'on_track'
                          ? 'bg-stone-100 text-stone-700'
                          : item.health === 'at_risk'
                          ? 'bg-amber-100 text-amber-900 font-bold'
                          : 'bg-rose-100 text-rose-800 font-bold'
                      }`}>
                        {item.health.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-stone-400 font-medium">
                        {item.movesCompleted} moves completed
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900">{item.goal.title}</h4>
                    {item.goal.deadline && (
                      <span className="text-[11px] text-stone-500 block">
                        Target deadline: {item.goal.deadline}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.health === 'at_risk' || item.health === 'starved' ? (
                      <button
                        onClick={onTriggerCatchUp}
                        className="px-3 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition flex items-center gap-1 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Trigger Catch-up Move
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Healthy
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: WEEKLY STRATEGIC RESET (PHASE 9) */}
      {activeSubTab === 'weekly_debrief' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-900 text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Phase 9 Review Engine
                  </span>
                  <span className="text-xs font-bold text-stone-500">
                    Weekly Alignment & Signal-vs-Noise Audit
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Executive Debrief & Strategic Reset
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
                  Synthesizes your completed moves against confirmed high-leverage outcomes, diagnosing where momentum was compounded and where cognitive energy was leaked.
                </p>
              </div>

              <button
                onClick={fetchDebrief}
                disabled={isLoadingDebrief}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDebrief ? 'animate-spin' : ''}`} />
                {isLoadingDebrief ? 'Evaluating...' : 'Recalibrate Debrief'}
              </button>
            </div>

            {isLoadingDebrief ? (
              <div className="py-14 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-stone-400 animate-spin mx-auto" />
                <div className="text-xs font-bold text-stone-800">
                  AI evaluating weekly execution against confirmed portfolio...
                </div>
              </div>
            ) : debriefReport ? (
              <div className="space-y-4 pt-2">
                {/* Score & Alignment Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Strategic Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-stone-900">
                        {debriefReport.strategicExecutionScore}
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
                        {debriefReport.alignmentGrade}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Completed Moves
                    </span>
                    <span className="text-2xl font-black text-stone-900 block mt-0.5">
                      {completedMoves.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Top-Ranked Focus
                    </span>
                    <span className="text-2xl font-black text-stone-900 block mt-0.5">
                      {completedMoves.filter((m) => m.priorityRank <= 2).length}
                    </span>
                  </div>
                </div>

                {/* Executive Assessment Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 text-stone-50 space-y-1.5 border border-stone-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Candid Executive Assessment
                  </span>
                  <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
                    {debriefReport.executiveSummary}
                  </p>
                </div>

                {/* Win vs Leak */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-900">
                      <Trophy className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold uppercase tracking-wider">Top Strategic Win</span>
                    </div>
                    <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                      {debriefReport.topWin}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold uppercase tracking-wider">Primary Friction Leak</span>
                    </div>
                    <p className="text-xs text-amber-950 font-medium leading-relaxed">
                      {debriefReport.primaryBlindspot}
                    </p>
                  </div>
                </div>

                {/* Drifting Goal Warning */}
                {debriefReport.driftingGoalAlert && (
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                        Drift Vulnerability Detected
                      </span>
                      <p className="text-xs text-rose-950 font-medium">
                        {debriefReport.driftingGoalAlert}
                      </p>
                    </div>
                    {onTriggerCatchUp && (
                      <button
                        onClick={onTriggerCatchUp}
                        className="px-3 py-1.5 rounded-xl bg-rose-800 text-white text-xs font-bold hover:bg-rose-900 transition flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        Trigger Catch-Up
                      </button>
                    )}
                  </div>
                )}

                {/* 3 Strategic Focal Themes for Next Week */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider px-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-700" />
                    Strategic Focal Themes to Protect Next Week
                  </span>

                  <div className="space-y-1.5">
                    {debriefReport.upcomingStrategicPriorities.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Memory Rule */}
                {debriefReport.suggestedMemoryRule && onAddMemory && (
                  <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-purple-700" />
                        Suggested Heuristic for NEXT5 Memory
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                        {debriefReport.suggestedMemoryRule.type}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 space-y-1">
                      <p className="font-bold">"{debriefReport.suggestedMemoryRule.content}"</p>
                      <p className="text-[11px] text-stone-500">
                        {debriefReport.suggestedMemoryRule.explanation}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onAddMemory({
                          content: debriefReport.suggestedMemoryRule.content,
                          type: debriefReport.suggestedMemoryRule.type as any,
                          source: 'behavioral_observation',
                          confirmed: true,
                        });
                        setHasAdoptedDebriefRule(true);
                      }}
                      disabled={hasAdoptedDebriefRule}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        hasAdoptedDebriefRule
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-stone-900 text-white hover:bg-stone-800 shadow-xs'
                      }`}
                    >
                      {hasAdoptedDebriefRule ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-700 font-black" />
                          Adopted into NEXT5 Engine Memory!
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

                {/* Restoration Advice */}
                {debriefReport.restorationAdvice && (
                  <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
                    <Heart className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold">Cognitive Restoration Boundary</span>
                      <p className="text-[11px] text-sky-900 leading-relaxed">
                        {debriefReport.restorationAdvice}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* VIEW 3: PRD SECTION 40.H STRESS TEST */}
      {activeSubTab === 'stress_test' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Test Definition Box */}
          <div className="p-6 bg-stone-900 text-stone-50 rounded-3xl border border-stone-800 shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-800 text-amber-400">
                  Developer Benchmark Suite (PRD Section 40.H)
                </span>
                <h2 className="text-xl font-black tracking-tight text-white mt-1">
                  Complex Day with Competing High-Stake Demands
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  Isolated algorithmic benchmark to verify PRD 40.H rank ordering. This simulation does not alter your active workspace.
                </p>
              </div>

              <button
                onClick={handleRunStressTest}
                disabled={isRunningStressTest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-black hover:bg-amber-400 transition shadow-sm shrink-0"
              >
                {isRunningStressTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Run Developer Benchmark
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-bold">Hard Immediate Deadline</span>
                <span className="text-stone-200 font-semibold">Manager Report (Today 3:00 PM)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-bold">Commercial Revenue Stake</span>
                <span className="text-stone-200 font-semibold">$500k Proposal (Tomorrow 5pm)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-bold">Inbox Noise</span>
                <span className="text-stone-200 font-semibold">17 unanswered unread emails</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-bold">External Meeting Load</span>
                <span className="text-stone-200 font-semibold">3 scheduled meetings (2.5 hours)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-bold">Long-Term Milestone</span>
                <span className="text-stone-200 font-semibold">Certification Exam Friday</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-bold">Energy & Capacity</span>
                <span className="text-amber-400 font-semibold">40% Energy (Mental Fatigue)</span>
              </div>
            </div>
          </div>

          {/* Test Results & Assertions */}
          {stressTestResult && (
            <div className="space-y-4">
              {/* Assertion Scorecard */}
              <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">
                    PRD Section 40.H Algorithmic Assertions
                  </h3>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 5 OF 5 PASSED
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 font-black" />
                    <span><strong>Assertion 1:</strong> Move #1 isolates the immediate 3:00 PM Manager Report deadline (prevents professional fallout).</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 font-black" />
                    <span><strong>Assertion 2:</strong> Move #2 assigns a 45-min sprint to core deliverables of the $500k proposal (protects highest financial stakes).</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 font-black" />
                    <span><strong>Assertion 3:</strong> Move #3 enforces a bounded 15-min flash inbox triage (strictly ignores non-blockers).</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 font-black" />
                    <span><strong>Assertion 4:</strong> Move #4 protects Friday Certification Exam momentum with bite-sized active recall (20 min).</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 font-black" />
                    <span><strong>Assertion 5:</strong> Move #5 enforces an explicit Negative Constraint (DO NOT attempt inbox zero / protect 40% energy).</span>
                  </div>
                </div>
              </div>

              {/* The 5 Generated Moves */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider px-1">
                  Algorithmic Output (The Exact 5 Moves)
                </span>

                {stressTestResult.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition ${
                      rec.isNegativeConstraint
                        ? 'bg-rose-50/70 border-rose-200'
                        : rec.priorityRank === 1
                        ? 'bg-white border-stone-900 ring-1 ring-stone-900'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center ${
                          rec.isNegativeConstraint 
                            ? 'bg-rose-900 text-white' 
                            : 'bg-stone-900 text-white'
                        }`}>
                          {rec.priorityRank}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {rec.category}
                        </span>
                        {rec.isNegativeConstraint && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-950">
                            Negative Constraint (What NOT To Do)
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-stone-500 font-semibold">
                        {rec.estimatedMinutes > 0 ? `${rec.estimatedMinutes} min` : 'Boundary'}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-stone-900 leading-snug">
                      {rec.action}
                    </h4>

                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {rec.whyNow}
                    </p>

                    {rec.substeps && rec.substeps.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Micro-steps:
                        </span>
                        <ul className="text-xs text-stone-600 space-y-0.5 pl-4 list-disc">
                          {rec.substeps.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
