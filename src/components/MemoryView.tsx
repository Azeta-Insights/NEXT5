import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Edit2, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Check, 
  Search, 
  Sparkles, 
  Lightbulb, 
  Sliders, 
  Info,
  Clock,
  Zap,
  RotateCcw
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
    color: 'bg-stone-100 text-stone-800 border-stone-200',
    desc: 'How you explicitly prefer to structure your energy and time.',
  },
  observed_pattern: {
    label: 'Observed Pattern',
    color: 'bg-blue-50 text-blue-900 border-blue-200',
    desc: 'Empirical patterns observed from your completed moves and feedback.',
  },
  explicit_context: {
    label: 'Context & Constraint',
    color: 'bg-amber-50 text-amber-900 border-amber-200',
    desc: 'Hard commitments, recurring duties, and known environmental limits.',
  },
  goal_insight: {
    label: 'Goal Insight',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
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

// Helper to provide a transparent explanation of how this memory influences the engine
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

  // Filtered memory list
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-150">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-stone-800" />
            Transparent Memory
          </h1>
          <p className="text-xs text-stone-500">
            What NEXT5 remembers about your working patterns, preferences, and context over time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {memories.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all memory? NEXT5 will forget all past patterns and reset to neutral baseline.')) {
                  onClearAll();
                }
              }}
              className="text-xs text-stone-500 hover:text-rose-600 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 transition flex items-center gap-1.5"
              title="Wipe all memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Forget All
            </button>
          )}

          <button
            id="add-memory-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Radical Transparency & Control Philosophy Banner (PRD Section 8 & 27) */}
      <div className="p-4 bg-stone-100/80 rounded-2xl border border-stone-200 text-stone-700 text-xs space-y-1.5 shadow-sm">
        <div className="font-bold text-stone-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Full Transparency Guarantee (PRD Section 8)
        </div>
        <p className="text-stone-600 text-[11px] leading-relaxed">
          NEXT5 never conceals hidden weights, diagnostic labels, or secret behavioral profiles. You can inspect every memory item, edit its text, or delete it at any time.
        </p>
      </div>

      {/* Suggested Memories for Instant Value */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-stone-500" />
          Suggested Working Guardrails:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTED_MEMORIES.map((sug, i) => (
            <div
              key={i}
              className="p-3 bg-white border border-stone-200 rounded-xl flex items-start justify-between gap-2 shadow-xs hover:border-stone-300 transition"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                  {sug.tag}
                </span>
                <p className="text-xs text-stone-700 font-medium leading-snug">
                  "{sug.text}"
                </p>
              </div>
              <button
                onClick={() => handleAddSuggested(sug)}
                className="shrink-0 p-1.5 bg-stone-100 hover:bg-stone-900 hover:text-white rounded-lg text-stone-600 transition"
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
              activeFilter === 'all'
                ? 'bg-stone-900 text-stone-50 font-bold'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            All Memories ({memories.length})
          </button>
          {(Object.keys(MEMORY_TYPE_CONFIG) as MemoryType[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                activeFilter === t
                  ? 'bg-stone-900 text-stone-50 font-bold'
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              {MEMORY_TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
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
              className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-3 transition hover:border-stone-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>

                  <span className="text-[10px] text-stone-400">
                    Source: {mem.source === 'behavioral_observation' ? 'Observed Pattern' : 'User Stated'}
                  </span>

                  {mem.confirmed && (
                    <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-0.5">
                      <Check className="w-3 h-3 text-emerald-600" /> Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => (isEditing ? saveEdit(mem.id) : startEdit(mem))}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                    title={isEditing ? 'Save' : 'Edit memory'}
                  >
                    {isEditing ? <Check className="w-4 h-4 text-emerald-600" /> : <Edit2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onDeleteMemory(mem.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100"
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
                    className="w-full p-2.5 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(mem.id)}
                      className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800"
                    >
                      Save Memory
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-stone-900 leading-relaxed">
                  "{mem.content}"
                </p>
              )}

              {/* How This Shapes Your NEXT5 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-2 text-xs text-stone-600">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    How This Shapes Your Next Moves:
                  </span>
                  <p className="text-[11px] text-stone-700 font-medium">
                    {influenceExplanation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMemories.length === 0 && (
          <div className="p-10 text-center bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <Brain className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-stone-700">No memories match your filter.</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Add rules, peak-performance hours, or communication boundaries to keep NEXT5 aligned with your working style.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition"
            >
              Add Memory
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-50 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-stone-800" />
                <h3 className="font-bold text-stone-900 text-base">Add New Memory</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-900 block mb-1">Memory Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                >
                  <option value="preference">User Preference (Working style, timing, focus)</option>
                  <option value="observed_pattern">Observed Pattern (What helps you accomplish moves)</option>
                  <option value="explicit_context">Context & Constraints (Hard commitments, calendar locks)</option>
                  <option value="goal_insight">Goal Insight (Strategic leverage for specific goals)</option>
                </select>
                <p className="text-[11px] text-stone-400 mt-1">
                  {MEMORY_TYPE_CONFIG[newType]?.desc}
                </p>
              </div>

              <div>
                <label className="font-bold text-stone-900 block mb-1">Memory Rule or Pattern *</label>
                <textarea
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. Never schedule client calls on Friday afternoons; reserve for deep strategy reviews."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 font-bold hover:bg-stone-800 shadow-sm"
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
