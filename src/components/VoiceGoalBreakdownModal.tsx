import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Check, X, Sparkles, Edit3, Trash2, Plus, 
  ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Calendar, Target, DollarSign, Briefcase, Compass, Heart
} from 'lucide-react';
import { Goal, GoalCategory, GoalType, GoalImportance, ExtractedGoalDraft } from '../types';
import { SpeechEngine } from '../lib/speech';

interface VoiceGoalBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmGoals: (goals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  initialTranscript?: string;
}

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  work: { label: 'Work', icon: Briefcase },
  career: { label: 'Career', icon: Compass },
  business: { label: 'Business', icon: DollarSign },
  personal: { label: 'Personal', icon: Heart },
  health: { label: 'Health', icon: Heart },
  finance: { label: 'Finance', icon: DollarSign },
};

export const VoiceGoalBreakdownModal: React.FC<VoiceGoalBreakdownModalProps> = ({
  isOpen,
  onClose,
  onConfirmGoals,
  initialTranscript = '',
}) => {
  const [step, setStep] = useState<'record' | 'outline'>('record');
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState('Reviewing your voice prompt...');
  const [extractedDrafts, setExtractedDrafts] = useState<ExtractedGoalDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const speechEngineRef = useRef<SpeechEngine | null>(null);

  // Initialize SpeechEngine on modal open
  useEffect(() => {
    if (isOpen) {
      setStep('record');
      setTranscript(initialTranscript);
      setErrorMsg(null);
      setPermissionDenied(false);
      setIsAnalyzing(false);

      speechEngineRef.current = new SpeechEngine(
        (text) => setTranscript(text),
        (err, denied) => {
          setErrorMsg(err);
          setPermissionDenied(denied);
          setIsListening(false);
        },
        () => setIsListening(false),
        initialTranscript
      );

      // Automatically start recording when opening
      handleStartRecording();
    } else {
      handleStopRecording();
    }

    return () => {
      handleStopRecording();
    };
  }, [isOpen]);

  const handleStartRecording = async () => {
    if (speechEngineRef.current) {
      setErrorMsg(null);
      setPermissionDenied(false);
      speechEngineRef.current.setBaseTranscript(transcript);
      const started = await speechEngineRef.current.start();
      setIsListening(started);
    }
  };

  const handleStopRecording = () => {
    if (speechEngineRef.current) {
      speechEngineRef.current.stop();
      setIsListening(false);
    }
  };

  const handleClearTranscript = () => {
    setTranscript('');
    if (speechEngineRef.current) {
      speechEngineRef.current.resetTranscript();
    }
  };

  // Call extract-goals API
  const handleAnalyzeAndOutline = async () => {
    if (!transcript.trim()) return;
    handleStopRecording();
    setIsAnalyzing(true);
    setAnalyzeStep('Reviewing your voice prompt...');

    const timer1 = setTimeout(() => setAnalyzeStep('Breaking down every single goal stated...'), 500);
    const timer2 = setTimeout(() => setAnalyzeStep('Extracting deadlines, targets, and categories...'), 1100);

    try {
      const res = await fetch('/api/extract-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          contexts: ['work', 'personal', 'business', 'health'],
        }),
      });

      if (!res.ok) {
        throw new Error('Goal extraction failed');
      }

      const data = await res.json();
      const rawGoals = data.goals || [];

      const drafts: ExtractedGoalDraft[] = rawGoals.map((g: any, index: number) => ({
        tempId: `draft_${Date.now()}_${index}`,
        title: g.title || 'Extracted Priority',
        category: (g.category as GoalCategory) || 'work',
        goalType: (g.goalType as GoalType) || 'project',
        targetValue: g.targetValue || undefined,
        currentValue: g.currentValue || undefined,
        unit: g.unit || undefined,
        deadline: g.deadline || undefined,
        importance: (g.importance as GoalImportance) || 'high',
        notes: g.notes || 'Outlined from your voice prompt',
        isInferred: Boolean(g.isInferred),
        isConfirmedByUser: true,
      }));

      setExtractedDrafts(drafts);
      setSelectedIds(new Set(drafts.map((d) => d.tempId)));
      setStep('outline');
    } catch (err: any) {
      console.warn('Voice goal extraction fallback:', err);
      // Fallback: split on clauses so user never loses their goals
      const clauses = transcript
        .split(/\n+|;|\. |\band\b|\balso\b|\bthen\b|\bplus\b/i)
        .map((c) => c.trim())
        .filter((c) => c.length > 3);

      const fallbackDrafts: ExtractedGoalDraft[] = (clauses.length > 0 ? clauses : [transcript]).map((clause, idx) => ({
        tempId: `draft_${Date.now()}_${idx}`,
        title: clause.charAt(0).toUpperCase() + clause.slice(1),
        category: 'work',
        goalType: 'project',
        importance: 'high',
        notes: 'Outlined from your voice prompt',
        isInferred: false,
        isConfirmedByUser: true,
      }));

      setExtractedDrafts(fallbackDrafts);
      setSelectedIds(new Set(fallbackDrafts.map((d) => d.tempId)));
      setStep('outline');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === extractedDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extractedDrafts.map((d) => d.tempId)));
    }
  };

  const handleUpdateDraft = (id: string, updates: Partial<ExtractedGoalDraft>) => {
    setExtractedDrafts((prev) =>
      prev.map((d) => (d.tempId === id ? { ...d, ...updates } : d))
    );
  };

  const handleDeleteDraft = (id: string) => {
    setExtractedDrafts((prev) => prev.filter((d) => d.tempId !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (editingId === id) setEditingId(null);
  };

  const handleAddManualDraft = () => {
    const newDraft: ExtractedGoalDraft = {
      tempId: `draft_${Date.now()}_new`,
      title: 'New Goal',
      category: 'work',
      goalType: 'project',
      importance: 'high',
      notes: 'Manually added',
      isInferred: false,
      isConfirmedByUser: true,
    };
    setExtractedDrafts((prev) => [...prev, newDraft]);
    setSelectedIds((prev) => new Set([...prev, newDraft.tempId]));
    setEditingId(newDraft.tempId);
  };

  const handleConfirmAndSave = () => {
    const chosenDrafts = extractedDrafts.filter((d) => selectedIds.has(d.tempId));
    if (chosenDrafts.length === 0) return;

    const formattedGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = chosenDrafts.map((d) => ({
      userId: 'user_active',
      title: d.title.trim(),
      category: d.category,
      goalType: d.goalType,
      targetValue: d.targetValue,
      currentValue: d.currentValue,
      unit: d.unit,
      deadline: d.deadline,
      importance: d.importance,
      status: 'active',
      confirmed: true,
      source: 'ai_extracted',
      notes: d.notes,
    }));

    onConfirmGoals(formattedGoals);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center">
              <Mic className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {step === 'record' ? 'Speak Your Goals (Voice Breakdown)' : 'Outlined Goals from Voice Prompt'}
              </h2>
              <p className="text-xs text-stone-500">
                {step === 'record'
                  ? 'Say everything you want to accomplish. NEXT5 breaks it down into individual goals.'
                  : `Outlined ${extractedDrafts.length} goal${extractedDrafts.length === 1 ? '' : 's'} based on what you said.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: VOICE INPUT & TRANSCRIPTION */}
          {step === 'record' && (
            <div className="space-y-4">
              {/* Audio visualizer / recording status banner */}
              <div className={`p-4 rounded-xl border transition ${
                isListening
                  ? 'bg-red-50/70 border-red-200 text-red-900'
                  : 'bg-stone-100/70 border-stone-200 text-stone-700'
              } flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    isListening ? 'bg-red-600 animate-ping' : 'bg-stone-400'
                  }`} />
                  <span className="text-xs font-semibold">
                    {isListening ? 'Listening... Speak as many goals and tasks as you want' : 'Microphone paused'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isListening ? (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                      Pause Mic
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Resume Mic
                    </button>
                  )}
                </div>
              </div>

              {/* Permission / error alerts */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{errorMsg}</span>
                    {permissionDenied && (
                      <p className="text-[11px] text-amber-800 mt-1">
                        Please check your browser permissions to allow microphone access, or type/paste your thoughts below.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Live Transcript / Thought Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span>Your Voice Transcript / Goals Dump:</span>
                  </label>
                  {transcript && (
                    <button
                      type="button"
                      onClick={handleClearTranscript}
                      className="text-stone-400 hover:text-stone-600 text-[11px] underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Speak or type everything you want to do... (e.g. 'Need to finish the Q3 financial presentation by Friday, go to the gym 3 times this week, call the accountant about corporate taxes, review the candidate resume, and study system design.')"
                  rows={6}
                  className="w-full p-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none leading-relaxed placeholder:text-stone-400"
                />
                <div className="flex justify-between items-center text-[11px] text-stone-400">
                  <span>Tip: Mention deadlines, target numbers, or habits as you speak.</span>
                  <span>{transcript.length} characters</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OUTLINED GOALS REVIEW */}
          {step === 'outline' && (
            <div className="space-y-4">
              {/* User transcript quote snippet */}
              <div className="p-3 rounded-xl bg-stone-100/80 border border-stone-200/80 text-xs text-stone-600 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  FROM YOUR VOICE PROMPT:
                </span>
                <p className="italic text-stone-700 line-clamp-2">“{transcript}”</p>
              </div>

              {/* Selection Summary bar */}
              <div className="flex items-center justify-between pb-1 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-semibold text-stone-700 hover:text-stone-900 underline underline-offset-2"
                  >
                    {selectedIds.size === extractedDrafts.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-stone-300">•</span>
                  <span className="text-xs font-bold text-stone-900">
                    {selectedIds.size} of {extractedDrafts.length} goals selected
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddManualDraft}
                  className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Goal
                </button>
              </div>

              {/* Outlined Goals Cards */}
              <div className="space-y-3">
                {extractedDrafts.map((draft, idx) => {
                  const isSelected = selectedIds.has(draft.tempId);
                  const isEditing = editingId === draft.tempId;
                  const CatIcon = CATEGORY_CONFIG[draft.category]?.icon || Target;

                  return (
                    <div
                      key={draft.tempId}
                      className={`p-4 rounded-xl border transition ${
                        isSelected
                          ? 'border-stone-300 bg-white shadow-xs'
                          : 'border-stone-200 bg-stone-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(draft.tempId)}
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                            isSelected
                              ? 'bg-stone-900 border-stone-900 text-white'
                              : 'border-stone-300 bg-white hover:border-stone-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        {/* Goal Content */}
                        <div className="flex-1 space-y-2">
                          {isEditing ? (
                            <div className="space-y-2.5">
                              <input
                                type="text"
                                value={draft.title}
                                onChange={(e) => handleUpdateDraft(draft.tempId, { title: e.target.value })}
                                className="w-full text-sm font-bold text-stone-900 border-b border-stone-400 pb-1 focus:outline-none"
                                placeholder="Goal title"
                                autoFocus
                              />

                              {/* Category selector */}
                              <div className="flex flex-wrap gap-1.5">
                                {(Object.keys(CATEGORY_CONFIG) as GoalCategory[]).map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleUpdateDraft(draft.tempId, { category: cat })}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize transition ${
                                      draft.category === cat
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>

                              {/* Target / Deadline inputs */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Target Value</label>
                                  <input
                                    type="text"
                                    value={draft.targetValue || ''}
                                    onChange={(e) => handleUpdateDraft(draft.tempId, { targetValue: e.target.value })}
                                    placeholder="e.g. 3 times/week or $5M"
                                    className="w-full text-xs p-1.5 border rounded-lg border-stone-200"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Deadline</label>
                                  <input
                                    type="text"
                                    value={draft.deadline || ''}
                                    onChange={(e) => handleUpdateDraft(draft.tempId, { deadline: e.target.value })}
                                    placeholder="e.g. Friday, Dec 31"
                                    className="w-full text-xs p-1.5 border rounded-lg border-stone-200"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-stone-900 leading-snug">
                                  {draft.title}
                                </h4>
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 capitalize">
                                  <CatIcon className="w-3 h-3 text-stone-500" />
                                  {draft.category}
                                </span>

                                <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                                  {draft.goalType}
                                </span>

                                {draft.deadline && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                    <Calendar className="w-3 h-3 text-amber-600" />
                                    {draft.deadline}
                                  </span>
                                )}

                                {draft.targetValue && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                                    Target: {draft.targetValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : draft.tempId)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                            title={isEditing ? 'Done editing' : 'Edit goal'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(draft.tempId)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-white flex items-center justify-between shrink-0">
          {step === 'record' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 text-xs font-semibold hover:bg-stone-100 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!transcript.trim() || isAnalyzing}
                onClick={handleAnalyzeAndOutline}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-stone-300" />
                    <span>{analyzeStep}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Review Voice & Outline Goals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('record')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-stone-600 hover:text-stone-900 text-xs font-semibold hover:bg-stone-100 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Voice
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-stone-500 hover:text-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleConfirmAndSave}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 shadow-sm"
                >
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Add {selectedIds.size} Goal{selectedIds.size === 1 ? '' : 's'} to Workspace</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
