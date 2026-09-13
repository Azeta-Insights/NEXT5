import React, { useState } from 'react';
import { 
  Clock, 
  Zap, 
  MessageSquare, 
  Mic, 
  Sparkles, 
  X, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  Flame, 
  Moon, 
  RotateCcw, 
  Calendar, 
  Tag, 
  Plus,
  Compass,
  BatteryCharging
} from 'lucide-react';
import { DailyContext, AvailableTimeOption, EnergyOption, EngineMode } from '../types';
import { VoiceModal } from './VoiceModal';

interface DailyContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext: DailyContext;
  currentMode: EngineMode;
  onSave: (ctx: DailyContext, mode: EngineMode) => void;
}

const TIME_OPTIONS: { id: AvailableTimeOption; label: string; desc: string }[] = [
  { id: '10m', label: '10 min', desc: 'Single quick move' },
  { id: '30m', label: '30 min', desc: 'Focused block' },
  { id: '1h', label: '1 hour', desc: 'Solid progress' },
  { id: '2h_plus', label: '2+ hours', desc: 'Deep work window' },
  { id: 'full_day', label: 'Full Day', desc: 'Unrestricted focus' },
];

const ENERGY_OPTIONS: { id: EnergyOption; label: string; sub: string; color: string }[] = [
  { id: '100', label: '100%', sub: 'Peak & Charged', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
  { id: '70', label: '70%', sub: 'Steady & Capable', color: 'text-stone-800 bg-stone-100 border-stone-300' },
  { id: '40', label: '40%', sub: 'Low / Drained', color: 'text-amber-800 bg-amber-50 border-amber-300' },
  { id: '10', label: '10%', sub: 'Crisis / Burnout', color: 'text-rose-800 bg-rose-50 border-rose-300' },
];

const ENGINE_MODES: { id: EngineMode; label: string; icon: string; desc: string; detail: string }[] = [
  { 
    id: 'normal', 
    label: 'Standard', 
    icon: '⚖️', 
    desc: 'Balanced multi-factor',
    detail: 'Balances strategic progress, immediate urgency, and realistic pacing.'
  },
  { 
    id: 'high_energy', 
    label: 'High Energy', 
    icon: '🚀', 
    desc: 'Heavy strategic leaps',
    detail: 'Prioritizes hard, high-outcome deep work and bold commercial moves first.'
  },
  { 
    id: 'low_energy', 
    label: 'Low Energy', 
    icon: '🌱', 
    desc: 'Gentle, high-return moves',
    detail: 'Surfaces unblockers with low cognitive load; adds recovery boundaries.'
  },
  { 
    id: '15min', 
    label: '15-Min Sprints', 
    icon: '⚡', 
    desc: 'Rapid high-leverage move',
    detail: 'Restricts to 1-2 rapid unblockers (<= 15m); strictly forbids reactive communications.'
  },
  { 
    id: 'bad_day', 
    label: 'Crisis / Bad Day', 
    icon: '🌧️', 
    desc: 'Damage control & recovery',
    detail: '1 essential task to prevent fallout, 1 communication update, 1 recovery boundary.'
  },
  { 
    id: 'catch_up', 
    label: 'Catch-up', 
    icon: '🔄', 
    desc: 'Restart stalled goals',
    detail: 'Targets neglected priorities to break inertia with low friction restart moves.'
  },
];

const PRESET_URGENT_ITEMS = [
  'High-value proposal due tomorrow',
  "Manager report due today (3pm)",
  'Certification / exam coming up',
  'Client or stakeholder escalation',
  'Payroll or critical vendor deadline',
];

const PRESET_CONSTRAINTS = [
  'Heavy meeting schedule',
  'Travel or transit day',
  'Feeling unwell / low physical energy',
  'Family or caregiving commitments',
  'Solo focus time (no meetings)',
];

export const DailyContextModal: React.FC<DailyContextModalProps> = ({
  isOpen,
  onClose,
  currentContext,
  currentMode,
  onSave,
}) => {
  const [time, setTime] = useState<AvailableTimeOption>(currentContext.availableTime || '1h');
  const [energy, setEnergy] = useState<EnergyOption>(currentContext.energy || '70');
  const [freeform, setFreeform] = useState(currentContext.freeformContext || '');
  const [mode, setMode] = useState<EngineMode>(currentMode || 'normal');
  const [urgentItems, setUrgentItems] = useState<string[]>(currentContext.urgentItems || []);
  const [constraints, setConstraints] = useState<string[]>(currentContext.constraints || []);
  const [customUrgent, setCustomUrgent] = useState('');
  const [customConstraint, setCustomConstraint] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  if (!isOpen) return null;

  const toggleUrgentItem = (item: string) => {
    setUrgentItems((prev) => 
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomUrgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrgent.trim() && !urgentItems.includes(customUrgent.trim())) {
      setUrgentItems([...urgentItems, customUrgent.trim()]);
      setCustomUrgent('');
    }
  };

  const toggleConstraint = (item: string) => {
    setConstraints((prev) => 
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomConstraint = (e: React.FormEvent) => {
    e.preventDefault();
    if (customConstraint.trim() && !constraints.includes(customConstraint.trim())) {
      setConstraints([...constraints, customConstraint.trim()]);
      setCustomConstraint('');
    }
  };

  const handleSaveAndGenerate = () => {
    const updated: DailyContext = {
      ...currentContext,
      availableTime: time,
      energy: energy,
      freeformContext: freeform,
      urgentItems: urgentItems,
      constraints: constraints,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      mode: mode,
    };
    onSave(updated, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-stone-500" />
              Daily Circumstance Intake (PRD Section 6)
            </span>
            <h3 className="font-extrabold text-stone-900 text-lg">Morning Check-In</h3>
            <p className="text-xs text-stone-500">
              NEXT5 adjusts its rigor, move sizes, and trade-offs around your true situation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Time Available */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-700" />
              1. How much time do you actually have today?
            </span>
            <span className="text-[10px] font-medium text-stone-400">Realistic total work capacity</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTime(opt.id);
                  if (opt.id === '10m') setMode('15min');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  time === opt.id
                    ? 'border-stone-900 bg-white ring-2 ring-stone-900 shadow-xs'
                    : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                }`}
              >
                <div className="text-xs font-bold text-stone-900">{opt.label}</div>
                <div className="text-[10px] text-stone-400 leading-tight mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Energy Level */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-stone-700" />
              2. How is your energy level right now?
            </span>
            <span className="text-[10px] font-medium text-stone-400">Directly paces task complexity</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setEnergy(opt.id);
                  if (opt.id === '10') setMode('bad_day');
                  else if (opt.id === '40' && mode === 'normal') setMode('low_energy');
                  else if (opt.id === '100' && mode === 'normal') setMode('high_energy');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  energy === opt.id
                    ? 'border-stone-900 bg-white ring-2 ring-stone-900 shadow-xs'
                    : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                }`}
              >
                <div className="text-xs font-bold text-stone-900">{opt.label}</div>
                <div className="text-[10px] text-stone-500 font-medium leading-tight mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Engine Mode Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-stone-700" />
              3. Engine Mode (Algorithm Rigor)
            </label>
            <span className="text-[10px] font-medium text-stone-400">PRD Section 17</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ENGINE_MODES.map((m) => {
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-stone-900 bg-white ring-2 ring-stone-900 shadow-xs'
                      : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{m.icon}</span>
                    <span className="text-xs font-bold text-stone-900">{m.label}</span>
                  </div>
                  <span className="block text-[10px] text-stone-500 mt-0.5 font-medium leading-tight">
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Mode Detail Explanation */}
          <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-700 leading-snug">
            <span className="font-bold text-stone-900">Mode Impact: </span>
            {ENGINE_MODES.find((m) => m.id === mode)?.detail}
          </div>
        </div>

        {/* 4. Urgent Items & Non-Negotiables */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              4. Urgent Items & Hard Deadlines Today
            </span>
            <span className="text-[10px] text-stone-400">Carries strict consequences</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_URGENT_ITEMS.map((item) => {
              const active = urgentItems.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleUrgentItem(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    active
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {item}
                </button>
              );
            })}
          </div>

          {/* Custom urgent item input */}
          <form onSubmit={addCustomUrgent} className="flex gap-1.5">
            <input
              type="text"
              value={customUrgent}
              onChange={(e) => setCustomUrgent(e.target.value)}
              placeholder="Add other urgent item..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
            <button
              type="submit"
              disabled={!customUrgent.trim()}
              className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded-lg font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>

        {/* 5. Constraints & Calendar Locks */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-700" />
              5. Environmental Constraints & Blockers
            </span>
            <span className="text-[10px] text-stone-400">Contextual limits</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CONSTRAINTS.map((item) => {
              const active = constraints.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleConstraint(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    active
                      ? 'bg-stone-900 border-stone-900 text-white font-bold'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {item}
                </button>
              );
            })}
          </div>

          <form onSubmit={addCustomConstraint} className="flex gap-1.5">
            <input
              type="text"
              value={customConstraint}
              onChange={(e) => setCustomConstraint(e.target.value)}
              placeholder="Add other constraint or lock..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
            <button
              type="submit"
              disabled={!customConstraint.trim()}
              className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded-lg font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>

        {/* 6. What's Happening Today (Voice-first or Freeform) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-stone-700" />
              6. Freeform Reality & Nuance
            </label>
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200"
            >
              <Mic className="w-3.5 h-3.5" />
              Voice Check-In
            </button>
          </div>
          <textarea
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder="e.g. 3 client calls this afternoon, proposal due tomorrow, manager needs report by 3pm, exhausted after travel..."
            rows={3}
            className="w-full p-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none leading-relaxed placeholder:text-stone-400 resize-none shadow-xs"
          />

          {/* Quick Preset Scenarios */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Quick Scenarios:
            </span>
            <button
              type="button"
              onClick={() => {
                setTime('2h_plus');
                setEnergy('40');
                setMode('low_energy');
                setUrgentItems(['High-value proposal due tomorrow', 'Manager report due today (3pm)']);
                setConstraints(['Heavy meeting schedule']);
                setFreeform('I have a $500k proposal due tomorrow, a manager report due today by 3pm, 3 meetings, 17 emails, and a certification exam on Friday. Running on low energy.');
              }}
              className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 font-medium"
            >
              PRD 40.H Stress Test
            </button>
            <button
              type="button"
              onClick={() => {
                setTime('10m');
                setEnergy('40');
                setMode('15min');
                setConstraints(['Heavy meeting schedule']);
                setFreeform('Back-to-back client calls all morning, only have 15 minutes between 11:30 and 11:45.');
              }}
              className="text-[11px] text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 hover:bg-stone-200 font-medium"
            >
              15-Min Squeeze
            </button>
            <button
              type="button"
              onClick={() => {
                setTime('2h_plus');
                setEnergy('100');
                setMode('high_energy');
                setFreeform('No meetings today. Feeling energized and ready to push the primary revenue initiative.');
              }}
              className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 font-medium"
            >
              Deep Focus Day
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-200">
          <span className="text-[11px] text-stone-500">
            {urgentItems.length} urgent · {constraints.length} constraints
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200 transition"
            >
              Cancel
            </button>
            <button
              id="daily-context-generate-btn"
              type="button"
              onClick={handleSaveAndGenerate}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-stone-900 text-stone-50 hover:bg-stone-800 transition shadow-sm"
            >
              <Check className="w-4 h-4" />
              Recalibrate NEXT5
            </button>
          </div>
        </div>
      </div>

      {/* Voice Modal */}
      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        initialText={freeform}
        promptTitle="Speak Today's Circumstances"
        onSubmitTranscript={(txt) => setFreeform(txt)}
      />
    </div>
  );
};
