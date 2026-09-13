import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  Check, 
  Calendar
} from 'lucide-react';
import { Goal, Recommendation, MemoryItem } from '../types';

interface FutureMeViewProps {
  goals: Goal[];
  recommendations: Recommendation[];
  memory?: MemoryItem[];
  onAddMemory?: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
}

export const FutureMeView: React.FC<FutureMeViewProps> = ({ 
  goals, 
  recommendations
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'trajectory' | 'drift'>('trajectory');

  const completedMoves = recommendations.filter((r) => r.status === 'completed');
  
  // Calculate Strategic vs Tactical Ratio
  const strategicCount = completedMoves.filter(
    (m) => m.goalId || (m.confidence >= 0.85 && !m.isNegativeConstraint)
  ).length;
  const strategicPercentage = completedMoves.length > 0 
    ? Math.round((strategicCount / completedMoves.length) * 100) 
    : 70; // optimistic default for preview

  // Drift Analysis: check which goals are starved of attention
  const goalHealthData = goals.map((g) => {
    const relatedMoves = completedMoves.filter(
      (m) => m.goalId === g.id || (m.goalTitle && m.goalTitle.toLowerCase() === g.title.toLowerCase())
    );
    
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
                Compounding
            </button>
            <button
              onClick={() => setActiveSubTab('drift')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeSubTab === 'drift'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
                Drift Engine
              {atRiskGoals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {atRiskGoals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Today s 5 moves are compounding tomorrow s reality.
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl mt-1">
            Prioritization isn t about clearing a meaningless list. It s about compounding the non-negotiables that permanently alter your personal and professional trajectory.
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
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> At Risk
                      </span>
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
    </div>
  );
};
