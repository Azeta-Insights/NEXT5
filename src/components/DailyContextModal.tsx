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
  Calendar, 
  Compass
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
  { id: '100', label: '100%', sub: 'Peak & Charged', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40' },
  { id: '70', label: '70%', sub: 'Steady & Capable', color: 'text-slate-200 bg-slate-900 border-slate-750' },
  { id: '40', label: '40%', sub: 'Low / Drained', color: 'text-amber-300 bg-amber-950/40 border-amber-500/40' },
  { id: '10', label: '10%', sub: 'Crisis / Burnout', color: 'text-rose-300 bg-rose-950/40 border-rose-500/40' },
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
  'Manager report due today (3pm)',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 flex flex-col gap-5 max-h-[90vh] overflow-y-auto text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-400" />
              Daily Circumstance Intake
            </span>
            <h3 className="font-extrabold text-slate-100 text-lg font-mono">Morning Check-In</h3>
            <p className="text-xs text-slate-400">
              NEXT5 adjusts move sizes and priorities around your real-world time and energy.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Time Available */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              1. How much time do you actually have today?
            </span>
            <span className="text-[10px] font-medium text-slate-500">Realistic total work capacity</span>
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
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  time === opt.id
                    ? 'border-emerald-500 bg-slate-900 ring-1 ring-emerald-500 shadow-xs text-emerald-300'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-400'
                }`}
              >
                <div className={`text-xs font-bold ${time === opt.id ? 'text-emerald-400' : 'text-slate-200'}`}>{opt.label}</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Energy Level */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              2. How is your energy level right now?
            </span>
            <span className="text-[10px] font-medium text-slate-500">Directly paces task complexity</span>
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
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  energy === opt.id
                    ? 'border-emerald-500 bg-slate-900 ring-1 ring-emerald-500 shadow-xs'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-400'
                }`}
              >
                <div className={`text-xs font-bold ${energy === opt.id ? 'text-emerald-400' : 'text-slate-200'}`}>{opt.label}</div>
                <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Focus Style Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              3. Focus Style
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ENGINE_MODES.map((m) => {
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-slate-900 ring-1 ring-emerald-500 shadow-xs'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{m.icon}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>{m.label}</span>
                  </div>
                  <span className="block text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Mode Detail Explanation */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 leading-snug">
            <span className="font-bold text-emerald-400">Mode Impact: </span>
            {ENGINE_MODES.find((m) => m.id === mode)?.detail}
          </div>
        </div>

        {/* 4. Urgent Items & Non-Negotiables */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              4. Urgent Items & Hard Deadlines Today
            </span>
            <span className="text-[10px] text-slate-500">Carries strict consequences</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_URGENT_ITEMS.map((item) => {
              const active = urgentItems.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleUrgentItem(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    active
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {item}
                </button>
              );
            })}
          </div>

          <form onSubmit={addCustomUrgent} className="flex gap-1.5">
            <input
              type="text"
              value={customUrgent}
              onChange={(e) => setCustomUrgent(e.target.value)}
              placeholder="Add other urgent item..."
              className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customUrgent.trim()}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {/* 5. Constraints & Calendar Locks */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              5. Environmental Constraints & Blockers
            </span>
            <span className="text-[10px] text-slate-500">Contextual limits</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CONSTRAINTS.map((item) => {
              const active = constraints.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleConstraint(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    active
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
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
              className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customConstraint.trim()}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {/* 6. What's Happening Today */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              6. Freeform Reality & Nuance
            </label>
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-800/40 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              Voice Check-In
            </button>
          </div>
          <textarea
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder="e.g. 3 client calls this afternoon, proposal due tomorrow, exhausted after travel..."
            rows={3}
            className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-xs focus:border-emerald-500 outline-hidden leading-relaxed placeholder:text-slate-600 resize-none shadow-xs"
          />

          {/* Quick Preset Scenarios */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
              className="text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50 hover:bg-amber-900/50 font-medium cursor-pointer"
            >
              Overloaded Day
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
              className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-750 font-medium cursor-pointer"
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
              className="text-[11px] text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50 hover:bg-emerald-900/50 font-medium cursor-pointer"
            >
              Deep Focus Day
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            {urgentItems.length} urgent · {constraints.length} constraints
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="daily-context-generate-btn"
              type="button"
              onClick={handleSaveAndGenerate}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 hover:from-emerald-300 hover:to-teal-200 transition shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
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
