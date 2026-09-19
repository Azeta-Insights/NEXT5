import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Goal, DailyContext, Recommendation, DailyFeedback, MemoryItem, 
  UserProfile, EngineMode, FeedbackRating 
} from './types';
import { StorageService } from './lib/storage';
import { calculateClientHeuristicPriorities } from './lib/prioritizer';
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
import { VoiceGoalBreakdownModal } from './components/VoiceGoalBreakdownModal';
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

  // Guards to prevent infinite loops, race conditions, and duplicate recalculations
  const isCalculatingRef = useRef<boolean>(false);
  const hasInitialPrioritizedRef = useRef<boolean>(false);

  // Modals
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isEndOfDayOpen, setIsEndOfDayOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVoiceGoalsModalOpen, setIsVoiceGoalsModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Prioritize using Server API with instant, deterministic client fallback
  const fetchPriorities = useCallback(
    async (
      modeToUse: EngineMode = currentMode, 
      overrideContext?: DailyContext,
      options?: { silent?: boolean }
    ) => {
      if (isCalculatingRef.current) return;
      isCalculatingRef.current = true;

      const ctx = overrideContext || dailyContext;
      const confirmedGoals = goals.filter((g) => g.status === 'active' && g.confirmed !== false);

      if (confirmedGoals.length === 0) {
        setRecommendations([]);
        StorageService.saveRecommendations([]);
        isCalculatingRef.current = false;
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
          throw new Error(`Server responded with status ${res.status}`);
        }

        const data = await res.json();
        const recs: Recommendation[] = (data.recommendations && data.recommendations.length > 0)
          ? data.recommendations
          : calculateClientHeuristicPriorities(confirmedGoals, ctx, modeToUse);

        setRecommendations(recs);
        StorageService.saveRecommendations(recs);

        if (!options?.silent) {
          showToast(
            modeToUse === 'normal'
              ? 'Priorities calculated.'
              : `Recalibrated for ${modeToUse.replace('_', ' ')} mode.`
          );
        }
      } catch (err) {
        console.warn('[Notice] Using robust client prioritizer fallback:', err);
        const fallbackRecs = calculateClientHeuristicPriorities(confirmedGoals, ctx, modeToUse);
        setRecommendations(fallbackRecs);
        StorageService.saveRecommendations(fallbackRecs);

        if (!options?.silent) {
          showToast(
            modeToUse === 'normal'
              ? 'Priorities updated.'
              : `Recalibrated for ${modeToUse.replace('_', ' ')} mode.`
          );
        }
      } finally {
        setIsLoadingRecs(false);
        isCalculatingRef.current = false;
      }
    },
    [goals, dailyContext, currentMode, memory]
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const existingLocal = StorageService.getUser();
        const updatedUser: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || (existingLocal.name && existingLocal.name !== 'User' ? existingLocal.name : (fbUser.isAnonymous ? 'Private Guest' : 'NEXT5 Member')),
          email: fbUser.email || existingLocal.email || '',
          roleTitle: existingLocal.roleTitle,
          primaryFocus: existingLocal.primaryFocus,
          createdAt: fbUser.metadata.creationTime || existingLocal.createdAt || new Date().toISOString(),
        };
        setUser(updatedUser);
        StorageService.saveUser(updatedUser);

        // Synchronize with Firestore
        try {
          const cloudData = await FirestoreSync.loadUserData(fbUser.uid);
          if (cloudData.user) {
            setUser(cloudData.user);
            StorageService.saveUser(cloudData.user);
          }
          if (cloudData.goals && cloudData.goals.length > 0) {
            setGoals(cloudData.goals);
            StorageService.saveGoals(cloudData.goals);
          }
        } catch (e) {
          console.warn('Initial cloud sync notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Safe initial priority calculation on app mount if recommendations are empty
  useEffect(() => {
    if (
      isOnboardingDone && 
      goals.length > 0 && 
      recommendations.length === 0 && 
      !hasInitialPrioritizedRef.current
    ) {
      hasInitialPrioritizedRef.current = true;
      fetchPriorities(currentMode, undefined, { silent: true });
    }
  }, [isOnboardingDone, goals.length, recommendations.length, currentMode, fetchPriorities]);

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
    newGoals.forEach((g) => {
      StorageService.addGoal(g);
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
      setMemory(StorageService.getMemory());

      if (status === 'completed') {
        showToast(`Completed: ${updated.action}`);
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
    setDailyContext(ctx);
    setCurrentMode(mode);
    fetchPriorities(mode, ctx);
  };

  // End-of-Day feedback submit with move dispositions
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Close open modals on Escape
      if (e.key === 'Escape') {
        setIsContextModalOpen(false);
        setIsEndOfDayOpen(false);
        setIsAuthModalOpen(false);
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
    StorageService.addGoal(g);
    setGoals(StorageService.getGoals());
    showToast('New goal added.');
    fetchPriorities();
  };

  const handleBatchAddGoals = (newGoals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    newGoals.forEach((g) => {
      StorageService.addGoal(g);
    });
    const updated = StorageService.getGoals();
    setGoals(updated);
    setActiveTab('today');
    showToast(`Extracted ${newGoals.length} goal${newGoals.length === 1 ? '' : 's'}. Generating your NEXT 5 moves...`);
    // Automatically recalculate priorities so the new goals are prioritized immediately into the Next 5 moves
    fetchPriorities(currentMode);
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    StorageService.updateGoal(id, updates);
    setGoals(StorageService.getGoals());
    showToast('Goal updated.');
    fetchPriorities();
  };

  const handleDeleteGoal = (id: string) => {
    StorageService.deleteGoal(id);
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
    StorageService.addMemory(memoryItem);
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
      setMemory([...current]);
      showToast('Memory updated.');
    }
  };

  const handleDeleteMemory = (id: string) => {
    StorageService.deleteMemory(id);
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
      <div className="min-h-full bg-slate-950 font-sans text-slate-50">
        <Onboarding 
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onComplete={handleOnboardingComplete} 
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={user}
          firebaseUser={firebaseUser}
          onAuthSuccess={async (profile) => {
            setUser(profile);
            StorageService.saveUser(profile);
            showToast(`Welcome, ${profile.name}! Your workspace is personalized.`);
            try {
              const cloudData = await FirestoreSync.loadUserData(profile.id);
              if (cloudData.goals && cloudData.goals.length > 0) {
                setGoals(cloudData.goals);
                StorageService.saveGoals(cloudData.goals);
              }
            } catch (e) {
              console.warn('Sync notice:', e);
            }
          }}
          onSignOut={() => {
            setFirebaseUser(null);
            const guest: UserProfile = {
              id: 'guest_' + Date.now(),
              name: 'User',
              email: '',
              createdAt: new Date().toISOString(),
            };
            setUser(guest);
            StorageService.saveUser(guest);
            showToast('Signed out. Local session.');
          }}
        />
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 border border-slate-800 text-xs font-semibold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  const pendingMovesCount = recommendations.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Global Header */}
      <Header
        user={user}
        currentMode={currentMode}
        onResetAll={handleResetAll}
        onOpenDailyContext={() => setIsContextModalOpen(true)}
        onOpenEndOfDay={() => setIsEndOfDayOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Tab Views */}
        {activeTab === 'today' && (
          <Next5View
            user={user}
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
            onOpenVoiceGoals={() => setIsVoiceGoalsModalOpen(true)}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            goals={goals}
            onAddGoal={handleAddGoal}
            onBatchAddGoals={handleBatchAddGoals}
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
          />
        )}

        {activeTab === 'coach' && (
          <AiCoachView
            user={user}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        firebaseUser={firebaseUser}
        onAuthSuccess={async (profile) => {
          setUser(profile);
          StorageService.saveUser(profile);
          showToast(`Welcome, ${profile.name}! Workspace personalized.`);
          try {
            const cloudData = await FirestoreSync.loadUserData(profile.id);
            if (cloudData.goals && cloudData.goals.length > 0) {
              setGoals(cloudData.goals);
              StorageService.saveGoals(cloudData.goals);
            }
          } catch (e) {
            console.warn('Sync notice:', e);
          }
        }}
        onSignOut={() => {
          setFirebaseUser(null);
          const guest: UserProfile = {
            id: 'guest_' + Date.now(),
            name: 'User',
            email: '',
            createdAt: new Date().toISOString(),
          };
          setUser(guest);
          StorageService.saveUser(guest);
          showToast('Signed out. Switched to offline session.');
        }}
      />

      {/* Voice Goal Breakdown Modal */}
      <VoiceGoalBreakdownModal
        isOpen={isVoiceGoalsModalOpen}
        onClose={() => setIsVoiceGoalsModalOpen(false)}
        onConfirmGoals={handleBatchAddGoals}
      />

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 border border-slate-800 text-xs font-semibold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
