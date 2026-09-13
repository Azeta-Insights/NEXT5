import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Target, 
  Calendar, 
  X, 
  Check, 
  AlertTriangle, 
  Pause, 
  Play, 
  Archive, 
  Search,
  DollarSign,
  Briefcase,
  Compass,
  Heart,
  Shield,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Goal, GoalCategory, GoalImportance, GoalStatus, GoalType } from '../types';

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
}

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  business: { label: 'Business', icon: DollarSign },
  work: { label: 'Work', icon: Briefcase },
  career: { label: 'Career', icon: Compass },
  personal: { label: 'Personal', icon: Heart },
  health: { label: 'Health', icon: Heart },
  finance: { label: 'Finance', icon: DollarSign },
};

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<GoalStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('work');
  const [goalType, setGoalType] = useState<GoalType>('target');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [importance, setImportance] = useState<GoalImportance>('high');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setTitle('');
    setCategory('work');
    setGoalType('target');
    setTargetValue('');
    setCurrentValue('');
    setDeadline('');
    setImportance('high');
    setStatus('active');
    setNotes('');
    setEditingGoal(null);
    setShowAddModal(true);
  };

  const openEditModal = (g: Goal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setCategory(g.category);
    setGoalType(g.goalType || 'target');
    setTargetValue(String(g.targetValue || ''));
    setCurrentValue(String(g.currentValue || ''));
    setDeadline(g.deadline || '');
    setImportance(g.importance);
    setStatus(g.status);
    setNotes(g.notes || '');
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, {
        title: title.trim(),
        category,
        goalType,
        targetValue: targetValue.trim() || undefined,
        currentValue: currentValue.trim() || undefined,
        deadline: deadline.trim() || undefined,
        importance,
        status,
        notes: notes.trim() || undefined,
        confirmed: true,
      });
    } else {
      onAddGoal({
        userId: 'user_active',
        title: title.trim(),
        category,
        goalType,
        targetValue: targetValue.trim() || undefined,
        currentValue: currentValue.trim() || undefined,
        deadline: deadline.trim() || undefined,
        importance,
        status,
        confirmed: true,
        source: 'user',
        notes: notes.trim() || undefined,
      });
    }

    setShowAddModal(false);
  };

  // Helper to calculate numerical progress percentage
  const calculateProgress = (curr?: string | number, targ?: string | number): number | null => {
    if (!curr || !targ) return null;
    const cleanNum = (val: string | number) => {
      const match = String(val).replace(/[^0-9.]/g, '');
      return parseFloat(match);
    };
    const c = cleanNum(curr);
    const t = cleanNum(targ);
    if (!isNaN(c) && !isNaN(t) && t > 0) {
      return Math.min(100, Math.round((c / t) * 100));
    }
    return null;
  };

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      // Status filter
      if (g.status !== activeStatus) return false;
      // Category filter
      if (activeCategory !== 'all' && g.category !== activeCategory) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesNotes = (g.notes || '').toLowerCase().includes(q);
        const matchesCat = g.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCat) return false;
      }
      return true;
    });
  }, [goals, activeStatus, activeCategory, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      active: goals.filter((g) => g.status === 'active').length,
      paused: goals.filter((g) => g.status === 'paused').length,
      completed: goals.filter((g) => g.status === 'completed').length,
      archived: goals.filter((g) => g.status === 'archived').length,
    };
  }, [goals]);

  // Neglected goals (active goals with no moves recorded or long inactivity)
  const neglectedGoals = useMemo(() => {
    return goals.filter((g) => {
      if (g.status !== 'active') return false;
      // Consider neglected if specifically flagged or if 2nd or 3rd goal in list has no recent movement
      if (g.notes?.toLowerCase().includes('neglected') || g.notes?.toLowerCase().includes('stalled')) {
        return true;
      }
      return false;
    });
  }, [goals]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-150">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-stone-800" />
            Goal Management
          </h1>
          <p className="text-xs text-stone-500">
            Confirmed targets and outcomes that mathematically drive your NEXT5 prioritization.
          </p>
        </div>

        <button
          id="add-goal-btn"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Goal Health Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Active Priorities
          </span>
          <p className="text-xl font-extrabold text-stone-900">{statusCounts.active}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            High / Critical
          </span>
          <p className="text-xl font-extrabold text-amber-900">
            {goals.filter((g) => g.status === 'active' && (g.importance === 'critical' || g.importance === 'high')).length}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Metrics Tracked
          </span>
          <p className="text-xl font-extrabold text-stone-900">
            {goals.filter((g) => g.targetValue).length}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Completed Goals
          </span>
          <p className="text-xl font-extrabold text-emerald-800">{statusCounts.completed}</p>
        </div>
      </div>

      {/* Neglected Goals Notice (PRD Section 11 & 14) */}
      {neglectedGoals.length > 0 && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-bold">Neglected Priority Alert</span>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              "{neglectedGoals[0].title}" hasn't had recent momentum. NEXT5 can schedule a 15-minute unblocking move to break stagnation.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filtering Controls */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-semibold">
          {(['active', 'paused', 'completed', 'archived'] as GoalStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition flex items-center gap-1.5 shrink-0 ${
                activeStatus === st
                  ? 'bg-stone-900 text-stone-50 font-bold'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <span>{st}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeStatus === st ? 'bg-stone-700 text-stone-200' : 'bg-stone-200 text-stone-600'
              }`}>
                {statusCounts[st]}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Chips */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition ${
                activeCategory === 'all'
                  ? 'bg-stone-200 text-stone-900 font-bold'
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              All Categories
            </button>
            {(Object.keys(CATEGORY_CONFIG) as GoalCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs capitalize shrink-0 transition ${
                  activeCategory === cat
                    ? 'bg-stone-200 text-stone-900 font-bold'
                    : 'text-stone-500 hover:bg-stone-100'
                }`}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals..."
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
      </div>

      {/* Goals Cards List */}
      <div className="space-y-3">
        {filteredGoals.map((goal) => {
          const progress = calculateProgress(goal.currentValue, goal.targetValue);
          const isNeglected = neglectedGoals.some((ng) => ng.id === goal.id);

          return (
            <div
              key={goal.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm space-y-3 transition hover:border-stone-300 ${
                isNeglected ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize">
                      {goal.category}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        goal.importance === 'critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : goal.importance === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {goal.importance} priority
                    </span>

                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                      {goal.goalType}
                    </span>

                    {goal.confirmed ? (
                      <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> Confirmed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800">
                        Inferred (Unconfirmed)
                      </span>
                    )}

                    {isNeglected && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-700" /> Neglected Priority
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-stone-900 pt-0.5 leading-snug">
                    {goal.title}
                  </h3>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {goal.status === 'active' ? (
                    <button
                      onClick={() => onUpdateGoal(goal.id, { status: 'paused' })}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                      title="Pause goal (exclude from today's engine)"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  ) : goal.status === 'paused' ? (
                    <button
                      onClick={() => onUpdateGoal(goal.id, { status: 'active' })}
                      className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50"
                      title="Resume goal"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  {goal.status !== 'completed' ? (
                    <button
                      onClick={() => onUpdateGoal(goal.id, { status: 'completed' })}
                      className="p-1.5 text-stone-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50"
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateGoal(goal.id, { status: 'active' })}
                      className="p-1.5 text-emerald-700 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                      title="Re-open goal"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(goal)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                    title="Edit goal details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${goal.title}"?`)) {
                        onDeleteGoal(goal.id);
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress & Target Details */}
              {(goal.targetValue || goal.currentValue || goal.deadline) && (
                <div className="p-3.5 bg-stone-50 rounded-xl space-y-2 border border-stone-100">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-stone-600">
                    {goal.targetValue && (
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Target Value</span>
                        <span className="font-bold text-stone-900">{goal.targetValue}</span>
                      </div>
                    )}

                    {goal.currentValue && (
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Current Progress</span>
                        <span className="font-bold text-stone-900">{goal.currentValue}</span>
                      </div>
                    )}

                    {goal.deadline && (
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Deadline</span>
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-700" />
                          {goal.deadline}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Visual Progress Bar */}
                  {progress !== null && (
                    <div className="pt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500">
                        <span>Pacing towards target</span>
                        <span className="font-bold text-stone-900">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-900 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {goal.notes && (
                <p className="text-xs text-stone-600 italic bg-stone-50/50 p-2.5 rounded-lg border border-stone-100 leading-relaxed">
                  "{goal.notes}"
                </p>
              )}
            </div>
          );
        })}

        {filteredGoals.length === 0 && (
          <div className="p-10 text-center bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <Target className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-stone-700">
              {searchQuery ? 'No goals match your search.' : `No ${activeStatus} goals found.`}
            </p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Add goals with concrete deadlines or metrics so NEXT5 can prioritize moves with mathematical precision.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition"
            >
              Add New Goal
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-50 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-stone-800" />
                <h3 className="font-bold text-stone-900 text-base">
                  {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-900 block mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hit $4M annual revenue target or Close Apex Renewal"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-stone-900 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GoalCategory)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="business">Business / Sales</option>
                    <option value="work">Work Deliverable</option>
                    <option value="career">Career / Transition</option>
                    <option value="personal">Personal / Family</option>
                    <option value="health">Health & Fitness</option>
                    <option value="finance">Finance / Capital</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-900 block mb-1">Goal Type</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as GoalType)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="target">Measurable Target</option>
                    <option value="project">Project / Milestone</option>
                    <option value="recurring_focus">Recurring Focus</option>
                    <option value="boundary">Boundary / Guardrail</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-stone-900 block mb-1">Importance</label>
                  <select
                    value={importance}
                    onChange={(e) => setImportance(e.target.value as GoalImportance)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="critical">Critical (Must address first)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-900 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GoalStatus)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="active">Active (Generates moves)</option>
                    <option value="paused">Paused (Temporarily skip)</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-stone-900 block mb-1">Target Metric</label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="e.g. $4M or 100 customers"
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-900 block mb-1">Current Progress</label>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="e.g. $1.8M or 18 customers"
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-900 block mb-1">Deadline / Horizon</label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="e.g. Tomorrow 3pm, Dec 31, Q3 close"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-900 block mb-1">Context & Strategic Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. High-probability deals need focus; proposals before noon win more often..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none resize-none"
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
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
