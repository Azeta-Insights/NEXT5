import React, { useState } from 'react';
import { 
  Mic, 
  Edit3, 
  ArrowRight, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  Briefcase,
  Compass,
  Heart,
  HelpCircle
} from 'lucide-react';
import { Goal, GoalCategory, ExtractedGoalDraft, GoalType, GoalImportance } from '../types';
import { VoiceModal } from './VoiceModal';

interface OnboardingProps {
  onComplete: (confirmedGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onSkip?: () => void;
}

const CATEGORY_META: Record<GoalCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  business: { label: 'Business', icon: DollarSign },
  work: { label: 'Work', icon: Briefcase },
  career: { label: 'Career', icon: Compass },
  personal: { label: 'Personal', icon: Heart },
  health: { label: 'Health', icon: Heart },
  finance: { label: 'Finance', icon: DollarSign },
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputText, setInputText] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<string>('Analyzing workload...');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedGoals, setExtractedGoals] = useState<ExtractedGoalDraft[]>([]);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);

  // Handle extraction via Gemini server endpoint
  const handleExtractGoals = async (textToExtract = inputText) => {
    if (!textToExtract.trim()) return;
    setIsExtracting(true);
    setExtractionError(null);
    setExtractProgress('Analyzing your commitments & targets...');

    const timer1 = setTimeout(() => setExtractProgress('Extracting concrete goals & deadlines...'), 600);
    const timer2 = setTimeout(() => setExtractProgress('Filtering busywork from core drivers...'), 1300);

    try {
      const res = await fetch('/api/extract-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToExtract,
          contexts: ['general'],
        }),
      });

      if (!res.ok) {
        throw new Error('Extraction request failed');
      }

      const data = await res.json();
      const drafts: ExtractedGoalDraft[] = (data.goals || []).map((g: any, index: number) => ({
        tempId: `draft_${Date.now()}_${index}`,
        title: g.title || 'Focus Priority',
        category: (g.category as GoalCategory) || 'work',
        goalType: (g.goalType as GoalType) || 'target',
        targetValue: g.targetValue || undefined,
        currentValue: g.currentValue || undefined,
        unit: g.unit || undefined,
        deadline: g.deadline || undefined,
        importance: (g.importance as GoalImportance) || 'high',
        notes: g.notes || '',
        isInferred: Boolean(g.isInferred),
        isConfirmedByUser: false,
      }));

      setExtractedGoals(drafts);
      setStep(3); // Advance to user confirmation screen
    } catch (err: any) {
      console.warn('Extraction fallback triggered:', err);
      // Fallback heuristics
      setExtractedGoals([
        {
          tempId: `draft_${Date.now()}_0`,
          title: textToExtract.slice(0, 80),
          category: 'work',
          goalType: 'project',
          importance: 'high',
          notes: 'Extracted directly from your input',
          isInferred: true,
          isConfirmedByUser: false,
        },
      ]);
      setStep(3);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsExtracting(false);
    }
  };

  const handleUpdateDraft = (index: number, updates: Partial<ExtractedGoalDraft>) => {
    setExtractedGoals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveDraft = (index: number) => {
    setExtractedGoals((prev) => prev.filter((_, i) => i !== index));
    if (editingGoalIndex === index) {
      setEditingGoalIndex(null);
    }
  };

  const handleAddCustomDraft = () => {
    const newDraft: ExtractedGoalDraft = {
      tempId: `draft_${Date.now()}_custom`,
      title: 'New Goal or Priority',
      category: 'work',
      goalType: 'target',
      importance: 'high',
      isInferred: false,
      isConfirmedByUser: true,
    };
    setExtractedGoals((prev) => [...prev, newDraft]);
    setEditingGoalIndex(extractedGoals.length);
  };

  const handleConfirmAll = () => {
    const finalGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = extractedGoals.map((d) => ({
      userId: 'user_active',
      title: d.title,
      category: d.category,
      goalType: d.goalType,
      targetValue: d.targetValue,
      currentValue: d.currentValue,
      unit: d.unit,
      deadline: d.deadline,
      importance: d.importance,
      status: 'active',
      confirmed: true, // Crucial: explicitly confirmed by user
      source: d.isInferred ? 'ai_extracted' : 'user',
      notes: d.notes,
    }));

    onComplete(finalGoals);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center px-4 py-8 max-w-xl mx-auto">
      {/* SCREEN 1: Welcome & Value Proposition */}
      {step === 1 && (
        <div className="flex flex-col items-start gap-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-stone-900 text-stone-50 font-extrabold text-lg shadow-sm">
              5
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900">NEXT5</span>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Your next five moves.
            </h1>
            <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-md">
              You don’t need to figure everything out. Just know what matters next.
            </p>
          </div>

          <div className="w-full p-4 rounded-xl bg-stone-100/90 border border-stone-200/90 text-stone-700 text-xs sm:text-sm space-y-2">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-stone-800" />
              How NEXT5 Works:
            </div>
            <ul className="space-y-1.5 text-stone-600 pl-1">
              <li className="flex items-start gap-2">
                <span className="text-stone-400 font-bold">•</span>
                <span><strong>No rigid to-do lists:</strong> NEXT5 dynamically calculates your highest-leverage actions based on your actual time and energy.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stone-400 font-bold">•</span>
                <span><strong>Negative constraints:</strong> It explicitly tells you what <em>not</em> to do today to avoid getting trapped in busywork.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stone-400 font-bold">•</span>
                <span><strong>You stay in control:</strong> You decide. NEXT5 does the ruthless organizing.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              id="onboarding-get-started-btn"
              onClick={() => setStep(2)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-900 text-stone-50 font-bold text-sm hover:bg-stone-800 transition shadow-sm"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full sm:w-auto text-xs font-semibold text-stone-500 hover:text-stone-900 px-3 py-2 transition"
              >
                Start with a blank slate
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 2: Thought Dump (Voice + Text) */}
      {step === 2 && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <button
            onClick={() => setStep(1)}
            className="text-stone-400 hover:text-stone-700 flex items-center gap-1 text-xs self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              What are you trying to accomplish?
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Tell NEXT5 about your top 1–3 goals right now and what your reality looks like today (deadlines, commitments, available time, or energy). You don't need to organize it first.
            </p>
          </div>

          {/* Text Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="onboarding-thought-input" className="text-xs font-bold text-stone-800">
                Your Goals & Current Reality:
              </label>
              <span className="text-[11px] text-stone-400">{inputText.length} characters</span>
            </div>

            <textarea
              id="onboarding-thought-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. What are you working toward? What needs to happen today or this week? Any hard deadlines or time limits?"
              rows={5}
              className="w-full p-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none leading-relaxed placeholder:text-stone-400"
            />
          </div>

          {/* Action Buttons: Voice / Submit */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              id="onboarding-voice-btn"
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold transition shadow-sm"
            >
              <Mic className="w-4 h-4 text-red-600" />
              Talk to NEXT5 (Voice)
            </button>

            <button
              id="onboarding-extract-btn"
              disabled={!inputText.trim() || isExtracting}
              onClick={() => handleExtractGoals()}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 shadow-sm"
            >
              {isExtracting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-stone-300" />
                  <span>{extractProgress}</span>
                </>
              ) : (
                <>
                  Organize My Priorities
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Voice Recording Modal */}
          <VoiceModal
            isOpen={showVoiceModal}
            onClose={() => setShowVoiceModal(false)}
            initialText={inputText}
            promptTitle="Tell NEXT5 what you're trying to achieve"
            onSubmitTranscript={(transcribedText) => {
              setInputText(transcribedText);
              handleExtractGoals(transcribedText);
            }}
          />
        </div>
      )}

      {/* SCREEN 3: Candidate Goals Review & Confirmation (PRD Section 4 & 22) */}
      {step === 3 && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-stone-500 text-xs">
              <span className="font-semibold text-stone-700">Review & Confirm</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Confirmation Required
              </span>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Here’s what I understood.
            </h2>
            <p className="text-xs text-stone-600">
              NEXT5 does the organizing, but you do the deciding. Edit, re-categorize, or add goals before confirming.
            </p>
          </div>

          {/* Extracted Goals Cards List */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {extractedGoals.map((draft, idx) => (
              <div
                key={draft.tempId}
                className="p-4 rounded-xl border border-stone-200 bg-white shadow-sm space-y-3 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {editingGoalIndex === idx ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(e) => handleUpdateDraft(idx, { title: e.target.value })}
                          className="w-full text-sm font-bold text-stone-900 border-b border-stone-400 focus:outline-none pb-1"
                          placeholder="Goal title"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(Object.keys(CATEGORY_META) as GoalCategory[]).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleUpdateDraft(idx, { category: cat })}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                                draft.category === cat
                                  ? 'bg-stone-900 text-white'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{draft.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 capitalize">
                            {draft.category}
                          </span>
                          <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                            {draft.goalType}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {draft.isInferred ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200" title="Inferred by AI from your context">
                        Inferred
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200" title="Explicitly stated by you">
                        Confirmed
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingGoalIndex(editingGoalIndex === idx ? null : idx)}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded"
                      title={editingGoalIndex === idx ? 'Done editing' : 'Edit goal'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveDraft(idx)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded"
                      title="Remove goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Editing for target/deadline details */}
                {editingGoalIndex === idx ? (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-xs">
                    <div>
                      <label className="text-[10px] text-stone-400 uppercase tracking-wider block">Target Value</label>
                      <input
                        type="text"
                        value={draft.targetValue || ''}
                        onChange={(e) => handleUpdateDraft(idx, { targetValue: e.target.value })}
                        placeholder="e.g. $4M or 100 users"
                        className="w-full text-xs p-1 border rounded border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 uppercase tracking-wider block">Deadline</label>
                      <input
                        type="text"
                        value={draft.deadline || ''}
                        onChange={(e) => handleUpdateDraft(idx, { deadline: e.target.value })}
                        placeholder="e.g. Tomorrow 3pm, Dec 31"
                        className="w-full text-xs p-1 border rounded border-stone-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 pt-1 border-t border-stone-100">
                    {draft.deadline && (
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Deadline</span>
                        <span className="font-semibold text-amber-900">{draft.deadline}</span>
                      </div>
                    )}

                    {draft.targetValue && (
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Target</span>
                        <span className="font-medium text-stone-900">{draft.targetValue}</span>
                      </div>
                    )}
                  </div>
                )}

                {draft.notes && !editingGoalIndex && (
                  <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg">
                    "{draft.notes}"
                  </p>
                )}
              </div>
            ))}

            {/* Add custom goal */}
            <button
              type="button"
              onClick={handleAddCustomDraft}
              className="w-full py-2.5 rounded-xl border border-dashed border-stone-300 text-stone-600 hover:bg-stone-100 hover:border-stone-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another goal
            </button>
          </div>

          {/* Confirmation & Progress Action */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              Back to edit thoughts
            </button>

            <button
              id="onboarding-accept-all-btn"
              type="button"
              disabled={extractedGoals.length === 0}
              onClick={handleConfirmAll}
              className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Confirm & Calculate My NEXT5
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
