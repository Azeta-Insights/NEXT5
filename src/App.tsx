import React, { useState, useEffect, useCallback } from 'react';
import { 
  Goal, DailyContext, Recommendation, DailyFeedback, MemoryItem, 
  UserProfile, EngineMode, FeedbackRating 
} from './types';
import { StorageService } from './lib/storage';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Onboarding } from './components/Onboarding';
import { Next5View } from './components/Next5View';
import { GoalsView } from './components/GoalsView';
import { MemoryView } from './components/MemoryView';
import { FutureMeView } from './components/FutureMeView';
import { AiCoachView } from './components/AiCoachView';
import { DailyContextModal } from './components/DailyContextModal';
import { EndOfDayModal } from './components/EndOfDayModal';
import { AuthModal } from './components/AuthModal';
import { ExportImportModal } from './components/ExportImportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { WeeklyDebriefModal } from './components/WeeklyDebriefModal';
import { ScenarioSimulationModal } from './components/ScenarioSimulationModal';
import { AudioBriefingModal } from './components/AudioBriefingModal';
import { VoiceFrictionModal } from './components/VoiceFrictionModal';
import { auth, onAuthStateChanged, FirebaseUser } from './lib/firebase';
import { FirestoreSync } from './lib/firestoreSync';

export default function App() {
  const [user, setUser] = useState<UserProfile>(() => StorageService.getUser());
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isOnboardingDone, setIsOnboardingDone] = useState<boolean>(() => StorageService.isOnboardingComplete());
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [goals, setGoals] = useState<Goal[]>(() => StorageService.getGoals());
  const [dailyContext, setDailyContext] = useState<DailyContext>(() => StorageService.getDailyContext());
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() => StorageService.getRecommendations());
  const [memory, setMemory] = useState<MemoryItem[]>(() => StorageService.getMemory());
  const [currentMode, setCurrentMode] = useState<EngineMode>('normal');
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isEndOfDayOpen, setIsEndOfDayOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isWeeklyDebriefOpen, setIsWeeklyDebriefOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isAudioBriefingOpen, setIsAudioBriefingOpen] = useState(false);
  const [isVoiceFrictionOpen, setIsVoiceFrictionOpen] = useState(false);
  const [activeSprintRec, setActiveSprintRec] = useState<Recommendation | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Prioritize using Server API (with local deterministic fallback)
  const fetchPriorities = useCallback(
    async (modeToUse: EngineMode = currentMode, overrideContext?: DailyContext) => {
      const ctx = overrideContext || dailyContext;
      const confirmedGoals = goals.filter((g) => g.status === 'active' && g.confirmed);

      if (confirmedGoals.length === 0) {
        setRecommendations([]);
        return;
      }

      setIsLoadingRecs(true);
      try {
        const res = await fetch('/api/prioritize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmedGoals,
            dailyContext: ctx,
            mode: modeToUse,
            memory,
          }),
        });

        if (!res.ok) {
          throw new Error('Server error');
        }

        const data = await res.json();
        const recs: Recommendation[] = data.recommendations || [];
        setRecommendations(recs);
        StorageService.saveRecommendations(recs);
        showToast(
          modeToUse === 'normal'
            ? 'Priorities calculated.'
            : `Recalibrated for ${modeToUse.replace('_', ' ')} mode.`
        );
      } catch (err) {
        console.warn('Fallback prioritizing on client:', err);
        // Local fallback handled in server or fallback generator
      } finally {
        setIsLoadingRecs(false);
      }
    },
    [goals, dailyContext, currentMode, memory]
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const updatedUser: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || (fbUser.isAnonymous ? 'Private Guest' : 'NEXT5 Member'),
          email: fbUser.email || '',
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
        };
        setUser(updatedUser);
        StorageService.saveUser(updatedUser);
        FirestoreSync.saveUser(updatedUser);

        // Attempt loading user data from Firestore if available
        const cloudData = await FirestoreSync.loadUserData(fbUser.uid);
        if (cloudData.goals && cloudData.goals.length > 0) {
          setGoals(cloudData.goals);
          StorageService.saveGoals(cloudData.goals);
        }
        if (cloudData.dailyContext) {
          setDailyContext(cloudData.dailyContext);
          StorageService.saveDailyContext(cloudData.dailyContext);
        }
        if (cloudData.memories && cloudData.memories.length > 0) {
          setMemory(cloudData.memories);
          StorageService.saveMemory(cloudData.memories);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Recalculate priorities if goals change or recommendations are empty
  useEffect(() => {
    if (isOnboardingDone && goals.length > 0 && recommendations.length === 0 && !isLoadingRecs) {
      fetchPriorities(currentMode);
    }
  }, [isOnboardingDone, goals, recommendations.length, currentMode, fetchPriorities, isLoadingRecs]);

  // Reset all workspace data to true clean state
  const handleResetAll = () => {
    StorageService.resetAll();
    setUser(StorageService.getUser());
    setGoals([]);
    setDailyContext(StorageService.getDailyContext());
    setMemory([]);
    setRecommendations([]);
    setIsOnboardingDone(false);
    setActiveTab('today');
    setCurrentMode('normal');
    showToast('Workspace reset to zero. Welcome to NEXT5.');
  };

  // Onboarding completion
  const handleOnboardingComplete = (newGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const createdGoals: Goal[] = [];
    newGoals.forEach((g) => {
      const added = StorageService.addGoal(g);
      createdGoals.push(added);
      FirestoreSync.saveGoal(user.id, added);
    });

    StorageService.setOnboardingComplete(true);
    setGoals(StorageService.getGoals());
    setIsOnboardingDone(true);
    setActiveTab('today');
    showToast('Goals confirmed! Calculating your NEXT5...');
    setTimeout(() => {
      fetchPriorities('normal');
    }, 100);
  };

  // Update recommendation status (complete, not today, not relevant)
  const handleUpdateRecStatus = (id: string, status: Recommendation['status']) => {
    const updated = StorageService.updateRecommendationStatus(id, status);
    if (updated) {
      setRecommendations(StorageService.getRecommendations());
      setMemory(StorageService.getMemory()); // Might record behavioral observation
      FirestoreSync.updateRecommendationStatus(user.id, id, status);

      if (status === 'completed') {
        showToast(`Completed: ${updated.action}`);
        // If all completed, suggest end-of-day
        const remaining = StorageService.getRecommendations().filter((r) => r.status === 'pending');
        if (remaining.length === 0) {
          setTimeout(() => setIsEndOfDayOpen(true), 800);
        }
      } else if (status === 'not_today') {
        showToast('Postponed for today.');
      } else if (status === 'not_relevant') {
        showToast('Removed from recommendations.');
      }
    }
  };

  // Save Daily Context & recalculate
  const handleSaveDailyContext = (ctx: DailyContext, mode: EngineMode) => {
    StorageService.saveDailyContext(ctx);
    FirestoreSync.saveDailyContext(user.id, ctx);
    setDailyContext(ctx);
    setCurrentMode(mode);
    fetchPriorities(mode, ctx);
  };

  // End-of-Day feedback submit with move dispositions (PRD Section 24)
  const handleSubmitEndOfDayFeedback = (
    rating: FeedbackRating, 
    comments?: string,
    moveDispositions?: Record<string, 'reevaluate' | 'breakdown' | 'drop'>
  ) => {
    const fb: DailyFeedback = {
      id: `fb_${Date.now()}`,
      userId: user.id,
      date: new Date().toISOString().split('T')[0],
      rating,
      comments,
      createdAt: new Date().toISOString(),
    };
    StorageService.saveFeedback(fb);
    FirestoreSync.saveFeedback(user.id, fb);

    // Apply move dispositions if any
    if (moveDispositions) {
      const recs = StorageService.getRecommendations();
      let updatedAny = false;

      recs.forEach((r) => {
        const action = moveDispositions[r.id];
        if (r.status === 'pending' && action) {
          updatedAny = true;
          if (action === 'drop') {
            r.status = 'not_relevant';
          } else if (action === 'reevaluate') {
            r.status = 'not_today';
          } else if (action === 'breakdown') {
            r.estimatedMinutes = Math.min(r.estimatedMinutes, 15);
            r.action = `[15m Unblocker] ${r.action}`;
          }
          FirestoreSync.updateRecommendationStatus(user.id, r.id, r.status);
        }
      });

      if (updatedAny) {
        StorageService.saveRecommendations(recs);
        setRecommendations(recs);
      }
    }

    setMemory(StorageService.getMemory());
    showToast('Day closed out cleanly. Priorities calibrated for tomorrow.');
  };

  // Global Keyboard Shortcuts (PRD Section 4.5 Power User workflows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Check for '?' key to toggle shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Close open modals on Escape
      if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
        setIsContextModalOpen(false);
        setIsEndOfDayOpen(false);
        setIsAuthModalOpen(false);
        setIsExportModalOpen(false);
        setIsWeeklyDebriefOpen(false);
        setIsSimulatorOpen(false);
        setIsAudioBriefingOpen(false);
        setIsVoiceFrictionOpen(false);
        setActiveSprintRec(null);
        return;
      }

      // 'a' or 'A' -> Open Executive Audio Briefing (Spoken Standup)
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setIsAudioBriefingOpen(true);
        return;
      }

      // 'v' or 'V' -> Open Voice Friction Decompressor
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setIsVoiceFrictionOpen(true);
        return;
      }

      // 'w' or 'W' -> Open Weekly Debrief & Strategic Reset
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setIsWeeklyDebriefOpen(true);
        return;
      }

      // 't' or 'T' -> Open What-If Scenario Simulator
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsSimulatorOpen(true);
        return;
      }

      // 'c' or 'C' -> Open What Changed Daily Context
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setIsContextModalOpen(true);
        return;
      }

      // 'r' or 'R' -> Recalculate NEXT5
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fetchPriorities(currentMode);
        showToast('Recalculating NEXT5 priorities...');
        return;
      }

      // 'e' or 'E' -> End of Day review
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsEndOfDayOpen(true);
        return;
      }

      // 'b' or 'B' -> Backup / Data Sovereignty
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsExportModalOpen(true);
        return;
      }

      // 's' or 'S' -> Launch Focus Sprint on Priority #1
      if (e.key === 's' || e.key === 'S') {
        const rank1Rec = recommendations.find((r) => r.priorityRank === 1 && r.status === 'pending');
        if (rank1Rec) {
          e.preventDefault();
          setActiveSprintRec(rank1Rec);
        }
        return;
      }

      // Keys 1 - 5: Toggle complete on move 1 through 5
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const rank = parseInt(e.key, 10);
        const targetRec = recommendations.find((r) => r.priorityRank === rank);
        if (targetRec) {
          e.preventDefault();
          const nextStatus = targetRec.status === 'completed' ? 'pending' : 'completed';
          handleUpdateRecStatus(targetRec.id, nextStatus);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recommendations, currentMode, fetchPriorities, user.id]);

  // Goal actions
  const handleAddGoal = (g: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const added = StorageService.addGoal(g);
    FirestoreSync.saveGoal(user.id, added);
    setGoals(StorageService.getGoals());
    showToast('New goal added.');
    fetchPriorities();
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    StorageService.updateGoal(id, updates);
    const updated = StorageService.getGoals().find((g) => g.id === id);
    if (updated) {
      FirestoreSync.saveGoal(user.id, updated);
    }
    setGoals(StorageService.getGoals());
    showToast('Goal updated.');
    fetchPriorities();
  };

  const handleDeleteGoal = (id: string) => {
    StorageService.deleteGoal(id);
    FirestoreSync.deleteGoal(id);
    setGoals(StorageService.getGoals());
    showToast('Goal removed.');
    fetchPriorities();
  };

  // Memory actions
  const handleAddMemory = (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'> | Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    const memoryItem: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
      ...item,
      userId: ('userId' in item && item.userId) ? item.userId : user.id,
    };
    const added = StorageService.addMemory(memoryItem);
    FirestoreSync.saveMemory(user.id, added);
    setMemory(StorageService.getMemory());
    showToast('Memory item added.');
  };

  const handleUpdateMemory = (id: string, content: string) => {
    const current = StorageService.getMemory();
    const idx = current.findIndex((m) => m.id === id);
    if (idx !== -1) {
      current[idx].content = content;
      current[idx].updatedAt = new Date().toISOString();
      StorageService.saveMemory(current);
      FirestoreSync.saveMemory(user.id, current[idx]);
      setMemory([...current]);
      showToast('Memory updated.');
    }
  };

  const handleDeleteMemory = (id: string) => {
    StorageService.deleteMemory(id);
    FirestoreSync.deleteMemory(id);
    setMemory(StorageService.getMemory());
    showToast('Memory removed.');
  };

  const handleClearAllMemory = () => {
    StorageService.clearAllMemory();
    setMemory([]);
    showToast('All memory cleared.');
  };

  // If user has not completed onboarding
  if (!isOnboardingDone) {
    return (
      <div className="min-h-full bg-stone-50 font-sans text-stone-900">
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          onSkip={() => {
            StorageService.setOnboardingComplete(true);
            setIsOnboardingDone(true);
          }}
        />
      </div>
    );
  }

  const pendingMovesCount = recommendations.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
      {/* Global Header */}
      <Header
        user={user}
        currentMode={currentMode}
        onResetAll={handleResetAll}
        onOpenDailyContext={() => setIsContextModalOpen(true)}
        onOpenEndOfDay={() => setIsEndOfDayOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenExportImport={() => setIsExportModalOpen(true)}
        onOpenKeyboardShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenWeeklyDebrief={() => setIsWeeklyDebriefOpen(true)}
        onOpenAudioBriefing={() => setIsAudioBriefingOpen(true)}
        onOpenVoiceFriction={() => setIsVoiceFrictionOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Tab Views */}
        {activeTab === 'today' && (
          <Next5View
            recommendations={recommendations}
            dailyContext={dailyContext}
            goals={goals}
            currentMode={currentMode}
            isLoading={isLoadingRecs}
            onUpdateStatus={handleUpdateRecStatus}
            onRefreshPriorities={(newMode) => {
              const mode = newMode || currentMode;
              setCurrentMode(mode);
              fetchPriorities(mode);
            }}
            onOpenContextModal={() => setIsContextModalOpen(true)}
            onOpenEndOfDay={() => setIsEndOfDayOpen(true)}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            onOpenAudioBriefing={() => setIsAudioBriefingOpen(true)}
            onOpenVoiceFriction={() => setIsVoiceFrictionOpen(true)}
            activeSprintRec={activeSprintRec}
            onCloseSprintModal={() => setActiveSprintRec(null)}
            onOpenSprintModal={(rec) => setActiveSprintRec(rec)}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryView
            memories={memory}
            onAddMemory={handleAddMemory}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
            onClearAll={handleClearAllMemory}
          />
        )}

        {activeTab === 'future' && (
          <FutureMeView 
            goals={goals} 
            recommendations={recommendations}
            memory={memory}
            onAddMemory={handleAddMemory}
            onTriggerCatchUp={() => {
              setCurrentMode('catch_up');
              fetchPriorities('catch_up');
              setActiveTab('today');
              showToast('Switched to Catch-up mode to unstick stalled goals.');
            }}
          />
        )}

        {activeTab === 'coach' && (
          <AiCoachView
            goals={goals}
            recommendations={recommendations}
            dailyContext={dailyContext}
            memory={memory}
          />
        )}
      </main>

      {/* Mobile-first Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingMovesCount={pendingMovesCount}
      />

      {/* Daily Context Modal */}
      <DailyContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        currentContext={dailyContext}
        currentMode={currentMode}
        onSave={handleSaveDailyContext}
      />

      {/* End of Day Modal */}
      <EndOfDayModal
        isOpen={isEndOfDayOpen}
        onClose={() => setIsEndOfDayOpen(false)}
        recommendations={recommendations}
        goals={goals}
        onSubmitFeedback={handleSubmitEndOfDayFeedback}
      />

      {/* Auth & Cloud Isolation Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        firebaseUser={firebaseUser}
        onAuthSuccess={(profile) => {
          setUser(profile);
          StorageService.saveUser(profile);
          FirestoreSync.saveUser(profile);
          showToast(`Signed in as ${profile.name}`);
        }}
        onSignOut={() => {
          setFirebaseUser(null);
          const guest: UserProfile = {
            id: 'guest_' + Date.now(),
            name: 'Private Guest',
            email: '',
            createdAt: new Date().toISOString(),
          };
          setUser(guest);
          StorageService.saveUser(guest);
          showToast('Signed out. Switched to offline session.');
        }}
      />

      {/* Export / Import Data Sovereignty Modal */}
      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onDataRestored={() => {
          setUser(StorageService.getUser());
          setGoals(StorageService.getGoals());
          setDailyContext(StorageService.getDailyContext());
          setRecommendations(StorageService.getRecommendations());
          setMemory(StorageService.getMemory());
          setIsOnboardingDone(StorageService.isOnboardingComplete());
          showToast('Workspace refreshed with restored data.');
        }}
      />

      {/* Keyboard Shortcuts Helper Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Weekly Executive Debrief & Strategic Reset Modal (Phase 9) */}
      <WeeklyDebriefModal
        isOpen={isWeeklyDebriefOpen}
        onClose={() => setIsWeeklyDebriefOpen(false)}
        goals={goals}
        recommendations={recommendations}
        memory={memory}
        onAdoptMemoryRule={(rule) => {
          handleAddMemory({
            content: rule.content,
            type: rule.type,
            source: 'behavioral_observation',
            confirmed: true,
          });
          showToast('Rule adopted into NEXT5 engine memory!');
        }}
        onTriggerCatchUp={() => {
          setCurrentMode('catch_up');
          fetchPriorities('catch_up');
          setActiveTab('today');
          showToast('Switched to Catch-up mode to unstick stalled goals.');
        }}
      />

      {/* "What-If" Scenario Simulation & Trade-Off Engine Modal (PRD Section 19 & 20 - Phase 10) */}
      <ScenarioSimulationModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        goals={goals}
        recommendations={recommendations}
        dailyContext={dailyContext}
        onAdoptPlan={(newRecs, updatedCtx) => {
          setRecommendations(newRecs);
          StorageService.saveRecommendations(newRecs);
          FirestoreSync.saveRecommendations(user.id, newRecs);

          if (updatedCtx && Object.keys(updatedCtx).length > 0) {
            const merged = { ...dailyContext, ...updatedCtx };
            setDailyContext(merged);
            StorageService.saveDailyContext(merged);
            FirestoreSync.saveDailyContext(user.id, merged);
          }

          showToast('Committed simulated scenario into active day!');
        }}
      />

      {/* Executive Audio Briefing Modal (Phase 11 - PRD Section 5 & 25) */}
      <AudioBriefingModal
        isOpen={isAudioBriefingOpen}
        onClose={() => setIsAudioBriefingOpen(false)}
        goals={goals}
        recommendations={recommendations}
        dailyContext={dailyContext}
        userName={user.name}
      />

      {/* Voice Friction Decompressor Modal (Phase 11 - PRD Section 5 & 25) */}
      <VoiceFrictionModal
        isOpen={isVoiceFrictionOpen}
        onClose={() => setIsVoiceFrictionOpen(false)}
        recommendations={recommendations}
        dailyContext={dailyContext}
        onSwitchMode={(mode) => {
          setCurrentMode(mode);
          fetchPriorities(mode);
          showToast(`Engine switched to ${mode.replace('_', ' ')} mode.`);
        }}
        onOpenSprintModal={(rec) => setActiveSprintRec(rec)}
      />

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-stone-50 text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
