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
  HelpCircle,
  Zap,
  CheckCircle2,
  User
} from 'lucide-react';
import { Goal, GoalCategory, ExtractedGoalDraft, GoalType, GoalImportance, UserProfile } from '../types';
import { VoiceModal } from './VoiceModal';
import { filterJargonAndExtractGoals } from '../lib/goalParser';
import { LandingPage, Next5Logo } from './LandingPage';

interface OnboardingProps {
  user?: UserProfile;
  onOpenAuth?: () => void;
  onComplete: (confirmedGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

const CATEGORY_META: Record<GoalCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  business: { label: 'Business', icon: DollarSign },
  work: { label: 'Work', icon: Briefcase },
  career: { label: 'Career', icon: Compass },
  personal: { label: 'Personal', icon: Heart },
  health: { label: 'Health', icon: Heart },
  finance: { label: 'Finance', icon: DollarSign },
};

export const Onboarding: React.FC<OnboardingProps> = ({ user, onOpenAuth, onComplete }) => {
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
      console.warn('Extraction fallback triggered, using smart client parser:', err);
      const parsed = filterJargonAndExtractGoals(textToExtract);
      setExtractedGoals(parsed.goals);
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
    const activeUserId = user?.id || 'user_active';
    const finalGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = extractedGoals.map((d) => ({
      userId: activeUserId,
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

  if (step === 1) {
    return (
      <LandingPage 
        user={user}
        onGetStarted={() => setStep(2)} 
        onOpenAuth={onOpenAuth}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-center px-4 py-8 max-w-2xl mx-auto selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Background radial glow */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(16,185,129,0.15),transparent_70%)]" 
        aria-hidden="true"
      />

      {/* Persistent Obsidian Header for Step 2 & 3 */}
      <div className="relative z-10 flex items-center justify-between pb-6 mb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Next5Logo size={36} className="shrink-0" />
          <div>
            <div className="font-extrabold tracking-tight text-lg text-slate-100 font-mono">
              NEXT<span className="text-emerald-400">5</span>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
              <span>{step === 2 ? 'Step 1 of 2: Goal Input' : 'Step 2 of 2: Confirm Moves'}</span>
              {user && user.name && user.name !== 'User' && (
                <span className="text-emerald-400 font-semibold">• {user.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAuth && (!user?.email || user?.name === 'User') && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 transition flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* SCREEN 2: Thought Dump (Voice + Text) */}
      {step === 2 && (
        <div className="relative z-10 flex flex-col gap-5 animate-in fade-in duration-200">
          <button
            onClick={() => setStep(1)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs self-start px-2.5 py-1 rounded-lg hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Overview
          </button>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              What are you trying to accomplish?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Speak or describe everything you want to achieve. As many things as you say, NEXT5 will filter conversational filler and outline every distinct goal for you to confirm.
            </p>
          </div>

          {/* Text Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="onboarding-thought-input" className="text-xs font-bold text-slate-300">
                Your Goals & Current Reality:
              </label>
              <span className="text-[11px] text-slate-500 font-mono">{inputText.length} characters</span>
            </div>

            <textarea
              id="onboarding-thought-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Close the $20k contract with Acme by Friday, hit the gym 4 times this week, finish onboarding redesign, and review quarterly budget..."
              rows={6}
              className="w-full p-4 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none leading-relaxed placeholder:text-slate-500 shadow-inner"
            />
          </div>

          {/* Action Buttons: Voice / Submit */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              id="onboarding-voice-btn"
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition shadow-sm"
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Talk to NEXT5 (Voice)</span>
            </button>

            <button
              id="onboarding-extract-btn"
              disabled={!inputText.trim() || isExtracting}
              onClick={() => handleExtractGoals()}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition disabled:opacity-30 shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{extractProgress}</span>
                </>
              ) : (
                <>
                  <span>Organize My Priorities</span>
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

      {/* SCREEN 3: Candidate Goals Review & Confirmation */}
      {step === 3 && (
        <div className="relative z-10 flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <span className="font-semibold text-slate-300">Review & Confirm</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Confirmation Required
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Outlined {extractedGoals.length} Goal{extractedGoals.length === 1 ? '' : 's'} from Your Prompt
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              NEXT5 separated your prompt into distinct goals. Review, customize, or add goals before calculating your Next 5 moves.
            </p>
          </div>

          {/* Extracted Goals Cards List */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {extractedGoals.map((draft, idx) => (
              <div
                key={draft.tempId}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-md shadow-black/40 space-y-3 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {editingGoalIndex === idx ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(e) => handleUpdateDraft(idx, { title: e.target.value })}
                          className="w-full text-sm font-bold text-slate-100 bg-transparent border-b border-emerald-400 focus:outline-none pb-1"
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
                                  ? 'bg-emerald-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{draft.title}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 capitalize">
                            {draft.category}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                            {draft.goalType}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {draft.isInferred ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30" title="Suggested from your notes">
                        Suggested
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" title="Explicitly stated by you">
                        Confirmed
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingGoalIndex(editingGoalIndex === idx ? null : idx)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                      title={editingGoalIndex === idx ? 'Done editing' : 'Edit goal'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveDraft(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                      title="Remove goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Editing for target/deadline details */}
                {editingGoalIndex === idx ? (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Value</label>
                      <input
                        type="text"
                        value={draft.targetValue || ''}
                        onChange={(e) => handleUpdateDraft(idx, { targetValue: e.target.value })}
                        placeholder="e.g. $4M or 100 users"
                        className="w-full text-xs p-1.5 border rounded border-slate-700 bg-slate-950 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Deadline</label>
                      <input
                        type="text"
                        value={draft.deadline || ''}
                        onChange={(e) => handleUpdateDraft(idx, { deadline: e.target.value })}
                        placeholder="e.g. Tomorrow 3pm, Dec 31"
                        className="w-full text-xs p-1.5 border rounded border-slate-700 bg-slate-950 text-slate-100"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    {draft.deadline && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Deadline</span>
                        <span className="font-semibold text-amber-300">{draft.deadline}</span>
                      </div>
                    )}

                    {draft.targetValue && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target</span>
                        <span className="font-medium text-emerald-300">{draft.targetValue}</span>
                      </div>
                    )}
                  </div>
                )}

                {draft.notes && !editingGoalIndex && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    "{draft.notes}"
                  </p>
                )}
              </div>
            ))}

            {/* Add custom goal */}
            <button
              type="button"
              onClick={handleAddCustomDraft}
              className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-900/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another goal
            </button>
          </div>

          {/* Confirmation & Progress Action */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-slate-400 hover:text-slate-200 font-medium"
            >
              Back to edit thoughts
            </button>

            <button
              id="onboarding-accept-all-btn"
              type="button"
              disabled={extractedGoals.length === 0}
              onClick={handleConfirmAll}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition disabled:opacity-30 shadow-[0_0_20px_rgba(52,211,153,0.35)] cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm & Calculate My NEXT5</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
