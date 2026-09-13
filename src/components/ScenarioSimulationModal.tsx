import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Clock, 
  BatteryMedium, 
  Layers, 
  HelpCircle,
  Zap,
  ArrowDownRight,
  TrendingDown,
  Inbox
} from 'lucide-react';
import { 
  Goal, 
  Recommendation, 
  DailyContext, 
  ScenarioPresetType, 
  SimulatedScenario, 
  ScenarioSimulationResult,
  AvailableTimeOption,
  EnergyOption
} from '../types';

interface ScenarioSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  recommendations: Recommendation[];
  dailyContext: DailyContext;
  onAdoptPlan: (newRecommendations: Recommendation[], newContext?: Partial<DailyContext>) => void;
}

const PRESET_SCENARIOS: {
  type: ScenarioPresetType;
  title: string;
  badge: string;
  description: string;
  timeOption?: AvailableTimeOption;
  energyOption?: EnergyOption;
  icon: any;
}[] = [
  {
    type: 'emergency_time',
    title: '30-Min Time Crunch',
    badge: 'Time Crisis',
    description: 'Sudden schedule collapse: only 30 minutes left before a hard stop.',
    timeOption: '30m',
    icon: Clock,
  },
  {
    type: 'energy_crash',
    title: 'Energy Crash (10-20%)',
    badge: 'Cognitive Battery Low',
    description: 'Deep brain fog and exhaustion; cannot sustain heavy analytical synthesis.',
    energyOption: '10',
    icon: BatteryMedium,
  },
  {
    type: 'surprise_focus',
    title: '3-Hour Focus Window',
    badge: 'Deep Work Unlocked',
    description: 'All afternoon meetings cancelled; 3 uninterrupted hours available.',
    timeOption: '2h_plus',
    energyOption: '100',
    icon: Zap,
  },
  {
    type: 'inbox_crisis',
    title: 'Incoming Fire Drill',
    badge: 'Urgent Triage',
    description: 'Urgent stakeholder escalations flooding communications channels.',
    icon: Inbox,
  },
];

export const ScenarioSimulationModal: React.FC<ScenarioSimulationModalProps> = ({
  isOpen,
  onClose,
  goals,
  recommendations,
  dailyContext,
  onAdoptPlan,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ScenarioPresetType>('emergency_time');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResult | null>(null);

  if (!isOpen) return null;

  const currentPreset = PRESET_SCENARIOS.find((p) => p.type === selectedPreset);

  const runSimulation = async (typeToUse = selectedPreset) => {
    setIsSimulating(true);
    try {
      const activePreset = PRESET_SCENARIOS.find((p) => p.type === typeToUse);
      const scenarioPayload: SimulatedScenario = {
        type: typeToUse,
        title: typeToUse === 'custom' ? 'Custom Circumstance Shift' : (activePreset?.title || 'Scenario Shift'),
        description: typeToUse === 'custom' ? customPrompt : (activePreset?.description || ''),
        timeOption: activePreset?.timeOption,
        energyOption: activePreset?.energyOption,
        customPrompt: typeToUse === 'custom' ? customPrompt : undefined,
      };

      const res = await fetch('/api/simulate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedGoals: goals.filter((g) => g.status === 'active' && g.confirmed),
          currentRecommendations: recommendations,
          dailyContext,
          scenario: scenarioPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data);
      }
    } catch (err) {
      console.error('Failed to simulate scenario:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAdoptPlan = () => {
    if (!simulationResult) return;
    const activePreset = PRESET_SCENARIOS.find((p) => p.type === selectedPreset);
    const updatedCtx: Partial<DailyContext> = {};
    if (activePreset?.timeOption) updatedCtx.availableTime = activePreset.timeOption;
    if (activePreset?.energyOption) updatedCtx.energy = activePreset.energyOption;

    onAdoptPlan(simulationResult.simulatedRecommendations, updatedCtx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-stone-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-stone-50 flex items-start justify-between gap-3 border-b border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                PRD Section 19 & 20
              </span>
              <span className="text-[10px] font-medium text-stone-400">
                What-If Trade-Off Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              "What-If" Scenario Simulator
            </h2>
            <p className="text-xs text-stone-400 leading-snug">
              Stress-test hypothetical shifts and inspect algorithmic trade-offs before committing changes.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
              Choose or Configure a Hypothetical Disruption
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_SCENARIOS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() => {
                      setSelectedPreset(preset.type);
                      setSimulationResult(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-600'
                      }`}>
                        {preset.badge}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{preset.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Option Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setSelectedPreset('custom');
                  setSimulationResult(null);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                  selectedPreset === 'custom'
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Custom Scenario Description
              </button>
            </div>

            {/* Custom Input if selected */}
            {selectedPreset === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 animate-in fade-in duration-100">
                <span className="text-xs font-bold text-stone-700 block">
                  Describe what shifted:
                </span>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Working from airport lounge with 45 minutes and spotty wifi..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                />
              </div>
            )}
          </div>

          {/* Trigger Simulation Button */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-stone-100 border border-stone-200">
            <div className="text-xs text-stone-600 font-medium">
              {currentPreset ? currentPreset.description : customPrompt || 'Test how priorities respond to reality shifts.'}
            </div>
            <button
              onClick={() => runSimulation()}
              disabled={isSimulating}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-amber-400' : ''}`} />
              {isSimulating ? 'Simulating Trade-Offs...' : 'Simulate Re-Prioritization'}
            </button>
          </div>

          {/* Results Display */}
          {simulationResult && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Trade-off Rationale Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 text-stone-50 space-y-2 border border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Algorithmic Trade-Off Rationale
                </span>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
                  {simulationResult.tradeOffAnalysis.tradeOffRationale}
                </p>
                <div className="pt-1 text-[11px] text-stone-400 flex items-center gap-1">
                  <span className="font-bold text-stone-300">Accepted Risk:</span>
                  <span>{simulationResult.tradeOffAnalysis.riskAssessment}</span>
                </div>
              </div>

              {/* Side-by-Side Comparison: Current vs Simulated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Current Plan */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Current Active Plan (Today)
                    </span>
                    <span className="text-[10px] font-bold text-stone-400">
                      {recommendations.length} moves
                    </span>
                  </div>

                  <div className="space-y-2">
                    {recommendations.slice(0, 4).map((rec) => {
                      const isProtected = simulationResult.tradeOffAnalysis.protectedMoves.some(
                        (p) => p.toLowerCase().includes(rec.action.toLowerCase().slice(0, 15)) ||
                               rec.action.toLowerCase().includes(p.toLowerCase().slice(0, 15))
                      );
                      const isDisplaced = simulationResult.tradeOffAnalysis.displacedMoves.some(
                        (d) => d.action.toLowerCase().includes(rec.action.toLowerCase().slice(0, 15)) ||
                               rec.action.toLowerCase().includes(d.action.toLowerCase().slice(0, 15))
                      );

                      return (
                        <div
                          key={rec.id}
                          className={`p-3 rounded-xl border text-xs transition space-y-1 ${
                            isDisplaced
                              ? 'bg-stone-100/70 border-stone-200 opacity-60'
                              : 'bg-white border-stone-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-400 text-[11px]">
                                #{rec.priorityRank}
                              </span>
                              <span className={`font-semibold ${isDisplaced ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                                {rec.action}
                              </span>
                            </div>

                            {isProtected && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase shrink-0 flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                Protected
                              </span>
                            )}
                            {isDisplaced && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase shrink-0 flex items-center gap-0.5">
                                <TrendingDown className="w-2.5 h-2.5" />
                                Displaced
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 font-medium block">
                            {rec.estimatedMinutes}m • {rec.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Simulated Outcome */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Simulated Outcome
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-900 text-white">
                      {simulationResult.simulatedRecommendations.length} moves
                    </span>
                  </div>

                  <div className="space-y-2">
                    {simulationResult.simulatedRecommendations.map((simRec, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-stone-300 bg-stone-50 text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-stone-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              {simRec.priorityRank || idx + 1}
                            </span>
                            <span className="font-bold text-stone-900">
                              {simRec.action}
                            </span>
                          </div>
                          {simRec.isNegativeConstraint ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 uppercase shrink-0">
                              Boundary
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 uppercase shrink-0">
                              {simRec.estimatedMinutes}m
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-600 leading-snug pl-6">
                          {simRec.whyThisNow}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Displacement Explanations */}
              {simulationResult.tradeOffAnalysis.displacedMoves.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Why Non-Essential Moves Were Displaced
                  </span>
                  <div className="space-y-1 text-amber-950 font-medium text-[11px]">
                    {simulationResult.tradeOffAnalysis.displacedMoves.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-600">•</span>
                        <span>
                          <strong className="font-bold">{d.action}:</strong> {d.reasonForDisplacement}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-stone-500 font-medium">
            Simulations are non-destructive until you explicitly adopt.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
            >
              Cancel
            </button>
            {simulationResult && (
              <button
                onClick={handleAdoptPlan}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Commit Simulated Plan to Today
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
