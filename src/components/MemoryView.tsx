import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Edit2, 
  ShieldCheck, 
  X, 
  Check, 
  Search, 
  Sparkles, 
  Zap
} from 'lucide-react';
import { MemoryItem, MemoryType } from '../types';

interface MemoryViewProps {
  memories: MemoryItem[];
  onAddMemory: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMemory: (id: string, content: string) => void;
  onDeleteMemory: (id: string) => void;
  onClearAll: () => void;
}

const MEMORY_TYPE_CONFIG: Record<MemoryType, { label: string; color: string; desc: string }> = {
  preference: {
    label: 'User Preference',
    color: 'bg-slate-800 text-slate-200 border-slate-700',
    desc: 'How you explicitly prefer to structure your energy and time.',
  },
  observed_pattern: {
    label: 'Observed Pattern',
    color: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
    desc: 'Empirical patterns observed from your completed moves and feedback.',
  },
  explicit_context: {
    label: 'Context & Constraint',
    color: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    desc: 'Hard commitments, recurring duties, and known environmental limits.',
  },
  goal_insight: {
    label: 'Goal Insight',
    color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    desc: 'High-leverage pathways tied directly to your active goals.',
  },
};

const SUGGESTED_MEMORIES = [
  {
    type: 'preference' as MemoryType,
    text: "Prioritize revenue-generating outreach and client proposals before noon.",
    tag: "Peak Energy",
  },
  {
    type: 'preference' as MemoryType,
    text: "Batch inbox processing and non-critical admin tasks to late afternoon (after 4pm).",
    tag: "Time Boundary",
  },
  {
    type: 'observed_pattern' as MemoryType,
    text: "Completing Move #1 within the first 45 minutes correlates with 85%+ completion of all 5 daily moves.",
    tag: "Momentum",
  },
  {
    type: 'explicit_context' as MemoryType,
    text: "When energy is below 50%, skip discretionary meetings and generate high-leverage 15-minute unblockers.",
    tag: "Low Energy Protocol",
  },
];

const getMemoryInfluenceExplanation = (content: string, type: MemoryType): string => {
  const c = content.toLowerCase();
  if (c.includes('morning') || c.includes('noon') || c.includes('early')) {
    return "Upscales deep-work or revenue moves into the #1 or #2 slots for early completion.";
  }
  if (c.includes('email') || c.includes('admin') || c.includes('afternoon') || c.includes('batch')) {
    return "Downweights administrative tasks during peak hours; prevents premature inbox trapping.";
  }
  if (c.includes('energy') || c.includes('sleep') || c.includes('tired')) {
    return "Automatically activates the low-energy engine mode when daily energy is 40% or lower.";
  }
  if (c.includes('proposal') || c.includes('client') || c.includes('revenue')) {
    return "Directly weights sales and revenue-critical deadlines as non-negotiable priority moves.";
  }
  if (type === 'observed_pattern') {
    return "Adjusts difficulty pacing based on your verified completion habits.";
  }
  return "Provides persistent context across your daily morning check-ins.";
};

export const MemoryView: React.FC<MemoryViewProps> = ({
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAll,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('preference');

  const startEdit = (mem: MemoryItem) => {
    setEditingId(mem.id);
    setEditText(mem.content);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateMemory(id, editText.trim());
    }
    setEditingId(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory({
      userId: 'user_active',
      type: newType,
      content: newContent.trim(),
      source: 'user_stated',
      confirmed: true,
    });
    setNewContent('');
    setShowAddModal(false);
  };

  const handleAddSuggested = (suggested: typeof SUGGESTED_MEMORIES[0]) => {
    onAddMemory({
      userId: 'user_active',
      type: suggested.type,
      content: suggested.text,
      source: 'user_stated',
      confirmed: true,
    });
  };

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (activeFilter !== 'all' && m.type !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.content.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [memories, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-24 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-50 tracking-tight flex items-center gap-2 font-mono">
            <Brain className="w-6 h-6 text-emerald-400" />
            Transparent Memory
          </h1>
          <p className="text-xs text-slate-400">
            What NEXT5 remembers about your working patterns, preferences, and context over time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {memories.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all memory? NEXT5 will reset to neutral baseline.')) {
                  onClearAll();
                }
              }}
              className="text-xs text-slate-400 hover:text-rose-400 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
              title="Wipe all memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Forget All
            </button>
          )}

          <button
            id="add-memory-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Transparency & Control Banner */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-slate-300 text-xs space-y-1.5 shadow-sm">
        <div className="font-bold text-slate-100 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Full Transparency Guarantee
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          NEXT5 never conceals hidden weights or secret profiles. You can inspect every working preference, edit its text, or delete it at any time.
        </p>
      </div>

      {/* Suggested Memories */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Suggested Working Guardrails:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTED_MEMORIES.map((sug, i) => (
            <div
              key={i}
              className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start justify-between gap-2 shadow-xs hover:border-slate-700 transition"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                  {sug.tag}
                </span>
                <p className="text-xs text-slate-300 font-medium leading-snug">
                  "{sug.text}"
                </p>
              </div>
              <button
                onClick={() => handleAddSuggested(sug)}
                className="shrink-0 p-1.5 bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 rounded-lg text-slate-400 transition cursor-pointer"
                title="Adopt this memory"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            All Memories ({memories.length})
          </button>
          {(Object.keys(MEMORY_TYPE_CONFIG) as MemoryType[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                activeFilter === t
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              {MEMORY_TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Memory Items List */}
      <div className="space-y-3">
        {filteredMemories.map((mem) => {
          const typeInfo = MEMORY_TYPE_CONFIG[mem.type] || MEMORY_TYPE_CONFIG.preference;
          const isEditing = editingId === mem.id;
          const influenceExplanation = getMemoryInfluenceExplanation(mem.content, mem.type);

          return (
            <div
              key={mem.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3 transition hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>

                  <span className="text-[10px] text-slate-500">
                    Source: {mem.source === 'behavioral_observation' ? 'Observed Pattern' : 'User Stated'}
                  </span>

                  {mem.confirmed && (
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3 text-emerald-400" /> Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => (isEditing ? saveEdit(mem.id) : startEdit(mem))}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 cursor-pointer"
                    title={isEditing ? 'Save' : 'Edit memory'}
                  >
                    {isEditing ? <Check className="w-4 h-4 text-emerald-400" /> : <Edit2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onDeleteMemory(mem.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Memory Content */}
              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 text-xs border border-slate-800 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-slate-950 text-slate-100"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(mem.id)}
                      className="px-3.5 py-1.5 text-xs font-bold bg-emerald-400 text-slate-950 rounded-xl hover:bg-emerald-300 cursor-pointer"
                    >
                      Save Memory
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                  "{mem.content}"
                </p>
              )}

              {/* How This Shapes Your NEXT5 */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    How This Shapes Your Next Moves:
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {influenceExplanation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMemories.length === 0 && (
          <div className="p-10 text-center bg-slate-900/60 rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <Brain className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">No memories match your filter.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add rules, peak-performance hours, or communication boundaries to keep NEXT5 aligned with your working style.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition cursor-pointer"
            >
              Add Memory
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-950 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-slate-100 text-base font-mono">Add New Memory</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Memory Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="preference">User Preference (Working style, timing, focus)</option>
                  <option value="observed_pattern">Observed Pattern (What helps you accomplish moves)</option>
                  <option value="explicit_context">Context & Constraints (Hard commitments, calendar locks)</option>
                  <option value="goal_insight">Goal Insight (Strategic leverage for specific goals)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {MEMORY_TYPE_CONFIG[newType]?.desc}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Memory Rule or Pattern *</label>
                <textarea
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. Never schedule client calls on Friday afternoons; reserve for deep strategy reviews."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 focus:border-emerald-500 focus:outline-hidden resize-none leading-relaxed placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 font-extrabold hover:from-emerald-300 hover:to-teal-200 shadow-sm cursor-pointer"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
