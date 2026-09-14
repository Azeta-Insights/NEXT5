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
    : 70;

  // Drift Analysis: check which goals are starved of attention
  const goalHealthData = goals.map((g) => {
    const relatedMoves = completedMoves.filter(
      (m) => m.goalId === g.id || (m.goalTitle && m.goalTitle.toLowerCase() === g.title.toLowerCase())
    );
    
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
    <div className="space-y-6 pb-20 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Hero Banner */}
      <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Future Me & Trajectory Bridge
            </span>
          </div>
          
          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('trajectory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'trajectory'
                  ? 'bg-emerald-400 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compounding
            </button>
            <button
              onClick={() => setActiveSubTab('drift')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'drift'
                  ? 'bg-emerald-400 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Drift Engine</span>
              {atRiskGoals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] flex items-center justify-center font-black">
                  {atRiskGoals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-mono">
            Today's 5 moves are compounding tomorrow's reality.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl mt-1">
            Prioritization isn't about clearing a meaningless list. It's about compounding the non-negotiables that permanently alter your personal and professional trajectory.
          </p>
        </div>

        {/* Compound Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Active Goals
            </span>
            <span className="text-xl font-black text-slate-100 font-mono">{goals.length}</span>
          </div>
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Executed Moves
            </span>
            <span className="text-xl font-black text-slate-100 font-mono">{completedMoves.length}</span>
          </div>
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Strategic Allocation
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono">{strategicPercentage}%</span>
          </div>
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
              Drift Status
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1.5">
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
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                30-Day Trajectory Projection
              </span>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                At 5 moves/day = 150 compound actions
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                  Day 10 Milestone
                </span>
                <div className="text-sm font-bold text-slate-100">
                  Critical Deadlines & Immediate Drag Eliminated
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-stakes proposals and pressing reports are delivered on time. Reactive backlog drops by 40%.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                  Day 30 Milestone
                </span>
                <div className="text-sm font-bold text-slate-100">
                  Strategic Compounding & Habits Locked
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Certification exam passed, customer growth engine verified, and daily recovery boundaries respected.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-slate-100 space-y-2">
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider font-mono">
                  Day 90 Trajectory
                </span>
                <div className="text-sm font-bold text-emerald-200">
                  Permanent Step-Change in Output
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  450 high-leverage moves executed without burnout, decision fatigue, or forgotten priorities.
                </p>
              </div>
            </div>
          </div>

          {/* Goal Trajectories */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 px-1 flex items-center justify-between font-mono">
              <span>Current Goal Trajectories</span>
              <span className="text-xs font-normal text-slate-500">{goals.length} active goals tracked</span>
            </h3>
            
            {goals.map((g) => {
              const relatedCompleted = completedMoves.filter(
                (m) => m.goalId === g.id || (m.goalTitle && m.goalTitle.toLowerCase() === g.title.toLowerCase())
              );
              
              return (
                <div
                  key={g.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {g.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          Importance: {g.importance}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-100">{g.title}</h4>
                    </div>
                    {g.deadline && (
                      <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Target: {g.deadline}
                      </span>
                    )}
                  </div>

                  {/* Progress metrics */}
                  {(g.targetValue || g.currentValue) && (
                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Current</span>
                        <span className="font-bold text-slate-200">{g.currentValue || 'Baseline'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Target Outcome</span>
                        <span className="font-bold text-emerald-400">{g.targetValue}</span>
                      </div>
                    </div>
                  )}

                  {/* Related Completed Moves */}
                  {relatedCompleted.length > 0 ? (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Recent moves advancing this:
                      </span>
                      <div className="space-y-1">
                        {relatedCompleted.map((m) => (
                          <div
                            key={m.id}
                            className="text-xs text-slate-300 flex items-center gap-1.5 font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{m.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 italic">
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
          <div className="p-5 sm:p-6 bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-100 font-mono">
                Drift & Neglect Detection Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When reactive firefighting consumes your day, important strategic goals quietly starve. NEXT5 automatically computes neglect scores and surfaces restart moves before goals stall completely.
            </p>
            
            {/* Strategic Balance Bar */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Strategic Needle-Movers ({strategicPercentage}%</span>
                <span>Reactive Triage / Boundaries ({100 - strategicPercentage}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-500" 
                  style={{ width: `${strategicPercentage}%` }} 
                />
                <div 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  style={{ width: `${100 - strategicPercentage}%` }} 
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Recommended target: Keep strategic needle-movers at or above 60% to avoid endless crisis triage.
              </p>
            </div>
          </div>

          {/* Neglected Goals Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 px-1 font-mono">Goal Neglect Audit</h3>
            
            <div className="space-y-2.5">
              {goalHealthData.map((item) => (
                <div
                  key={item.goal.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.health === 'compounding' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : item.health === 'on_track'
                          ? 'bg-slate-800 text-slate-300'
                          : item.health === 'at_risk'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30 font-bold'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'
                      }`}>
                        {item.health.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.movesCompleted} moves completed
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">{item.goal.title}</h4>
                    {item.goal.deadline && (
                      <span className="text-[11px] text-slate-400 block">
                        Target deadline: {item.goal.deadline}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.health === 'at_risk' || item.health === 'starved' ? (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> At Risk
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-4 h-4 stroke-[3]" /> Healthy
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
