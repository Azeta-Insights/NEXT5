import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Check, X, Sparkles, Edit3, Trash2, Plus, 
  ArrowRight, ArrowLeft, AlertCircle, Calendar, Target, DollarSign, Briefcase, Compass, Heart,
  Zap
} from 'lucide-react';
import { Goal, GoalCategory, GoalType, GoalImportance, ExtractedGoalDraft } from '../types';
import { SpeechEngine } from '../lib/speech';
import { filterJargonAndExtractGoals } from '../lib/goalParser';

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

  const handleAnalyzeAndOutline = async () => {
    if (!transcript.trim()) return;
    handleStopRecording();
    setIsAnalyzing(true);
    setAnalyzeStep('Reviewing your commitments & priorities...');

    const timer1 = setTimeout(() => setAnalyzeStep('Organizing your distinct goals...'), 550);
    const timer2 = setTimeout(() => setAnalyzeStep('Drafting immediate first moves for NEXT5...'), 1150);

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
        suggestedFirstMove: g.suggestedFirstMove || undefined,
        isConfirmedByUser: false,
      }));

      setExtractedDrafts(drafts);
      setSelectedIds(new Set(drafts.map((d) => d.tempId)));
      setStep('outline');
    } catch (err: any) {
      console.warn('Backend extraction fallback, parsing locally:', err);
      const localResult = filterJargonAndExtractGoals(transcript);
      setExtractedDrafts(localResult.goals);
      setSelectedIds(new Set(localResult.goals.map((d) => d.tempId)));
      setStep('outline');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelect = (tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
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

  const handleUpdateDraft = (tempId: string, updates: Partial<ExtractedGoalDraft>) => {
    setExtractedDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, ...updates } : d))
    );
  };

  const handleDeleteDraft = (tempId: string) => {
    setExtractedDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  const handleAddManualDraft = () => {
    const newDraft: ExtractedGoalDraft = {
      tempId: `draft_${Date.now()}_manual`,
      title: 'New Priority Goal',
      category: 'work',
      goalType: 'target',
      importance: 'high',
      isInferred: false,
      isConfirmedByUser: true,
    };
    setExtractedDrafts((prev) => [newDraft, ...prev]);
    setSelectedIds((prev) => new Set([...prev, newDraft.tempId]));
    setEditingId(newDraft.tempId);
  };

  const handleConfirmAndSave = () => {
    const confirmed = extractedDrafts.filter((d) => selectedIds.has(d.tempId));
    if (confirmed.length === 0) return;

    const finalGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = confirmed.map((d) => ({
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
      confirmed: true,
      source: d.isInferred ? 'ai_extracted' : 'user',
      notes: d.notes,
    }));

    onConfirmGoals(finalGoals);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-800 flex flex-col overflow-hidden text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 font-mono">
                {step === 'record' ? 'Speak Your Goals (Voice Breakdown)' : 'Outlined Goals from Voice Prompt'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'record'
                  ? 'Say everything you want to accomplish. NEXT5 breaks it down into individual goals.'
                  : `Outlined ${extractedDrafts.length} goal${extractedDrafts.length === 1 ? '' : 's'} based on what you said.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: VOICE INPUT & TRANSCRIPTION */}
          {step === 'record' && (
            <div className="space-y-4">
              {/* Audio recording status banner */}
              <div className={`p-4 rounded-xl border transition ${
                isListening
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              } flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    isListening ? 'bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700'
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
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-750 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                      Pause Mic
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 text-xs font-extrabold hover:bg-emerald-300 transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Resume Mic
                    </button>
                  )}
                </div>
              </div>

              {/* Permission alerts */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">{errorMsg}</span>
                    {permissionDenied && (
                      <p className="text-[11px] text-amber-300/80 mt-1">
                        Please check your browser permissions to allow microphone access, or type your thoughts below.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Live Transcript */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Your Voice Transcript / Goals Dump:</span>
                  </label>
                  {transcript && (
                    <button
                      type="button"
                      onClick={handleClearTranscript}
                      className="text-slate-500 hover:text-slate-300 text-[11px] underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Speak or type everything you want to do... (e.g. 'Need to finish the Q3 financial presentation by Friday, go to the gym 3 times this week, review quarterly budget, and close deal with Acme.')"
                  rows={6}
                  className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-hidden focus:border-emerald-500 leading-relaxed placeholder:text-slate-600"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Tip: Mention deadlines, target numbers, or habits as you speak.</span>
                  <span>{transcript.length} characters</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OUTLINED GOALS REVIEW */}
          {step === 'outline' && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-bold text-emerald-200">
                    {extractedDrafts.length} distinct {extractedDrafts.length === 1 ? 'goal' : 'goals'} identified
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Review & select below
                </span>
              </div>

              {/* User transcript quote */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  FROM YOUR VOICE PROMPT:
                </span>
                <p className="italic text-slate-300 line-clamp-2">"{transcript}"</p>
              </div>

              {/* Selection Summary bar */}
              <div className="flex items-center justify-between pb-1 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
                  >
                    {selectedIds.size === extractedDrafts.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-bold text-slate-300">
                    {selectedIds.size} of {extractedDrafts.length} goals selected
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddManualDraft}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-slate-100 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-850 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Add Another Goal
                </button>
              </div>

              {/* Outlined Goals Cards */}
              <div className="space-y-3">
                {extractedDrafts.map((draft) => {
                  const isSelected = selectedIds.has(draft.tempId);
                  const isEditing = editingId === draft.tempId;
                  const CatIcon = CATEGORY_CONFIG[draft.category]?.icon || Target;

                  return (
                    <div
                      key={draft.tempId}
                      className={`p-4 rounded-xl border transition ${
                        isSelected
                          ? 'border-emerald-500/50 bg-slate-900 shadow-xs'
                          : 'border-slate-800 bg-slate-950/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(draft.tempId)}
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-bold'
                              : 'border-slate-700 bg-slate-900 hover:border-slate-500'
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
                                className="w-full text-sm font-bold text-slate-100 border-b border-emerald-400 pb-1 focus:outline-hidden bg-transparent"
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
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize transition cursor-pointer ${
                                      draft.category === cat
                                        ? 'bg-emerald-400 text-slate-950 font-extrabold'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>

                              {/* Target / Deadline inputs */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Target Value</label>
                                  <input
                                    type="text"
                                    value={draft.targetValue || ''}
                                    onChange={(e) => handleUpdateDraft(draft.tempId, { targetValue: e.target.value })}
                                    placeholder="e.g. 3 times/week or $5M"
                                    className="w-full text-xs p-1.5 border rounded-lg border-slate-700 bg-slate-950 text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Deadline</label>
                                  <input
                                    type="text"
                                    value={draft.deadline || ''}
                                    onChange={(e) => handleUpdateDraft(draft.tempId, { deadline: e.target.value })}
                                    placeholder="e.g. Friday, Dec 31"
                                    className="w-full text-xs p-1.5 border rounded-lg border-slate-700 bg-slate-950 text-slate-100"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-100 leading-snug">
                                  {draft.title}
                                </h4>
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 capitalize">
                                  <CatIcon className="w-3 h-3 text-emerald-400" />
                                  {draft.category}
                                </span>

                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">
                                  {draft.goalType}
                                </span>

                                {draft.deadline && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-500/30">
                                    <Calendar className="w-3 h-3 text-amber-400" />
                                    {draft.deadline}
                                  </span>
                                )}

                                {draft.targetValue && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200">
                                    Target: {draft.targetValue}
                                  </span>
                                )}
                              </div>

                              {/* Suggested Immediate Move */}
                              {draft.suggestedFirstMove && (
                                <div className="mt-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-slate-100">First move for NEXT5: </span>
                                    <span className="text-slate-400">{draft.suggestedFirstMove}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : draft.tempId)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title={isEditing ? 'Done editing' : 'Edit goal'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(draft.tempId)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          {step === 'record' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!transcript.trim() || isAnalyzing}
                onClick={handleAnalyzeAndOutline}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition disabled:opacity-40 shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{analyzeStep}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Review Voice & Outline Goals</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('record')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Voice
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleConfirmAndSave}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-slate-950 text-xs font-extrabold hover:from-emerald-300 hover:to-teal-200 transition disabled:opacity-40 shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Create Next 5 Moves from {selectedIds.size} Goal{selectedIds.size === 1 ? '' : 's'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
