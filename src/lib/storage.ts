import { Goal, DailyContext, Recommendation, DailyFeedback, MemoryItem, UserProfile } from '../types';

const STORAGE_KEYS = {
  USER: 'next5_user',
  GOALS: 'next5_goals',
  DAILY_CONTEXT: 'next5_daily_context',
  RECOMMENDATIONS: 'next5_recommendations',
  FEEDBACK: 'next5_feedback',
  MEMORY: 'next5_memory',
  ONBOARDING_DONE: 'next5_onboarding_done',
};

// Purge any legacy mock / seeded data left in localStorage from previous test sessions
function sanitizeStorage(): void {
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (
      rawUser &&
      (rawUser.includes('Alex Rivera') ||
        rawUser.includes('Sarah Chen') ||
        rawUser.includes('Marcus Vance') ||
        rawUser.includes('Elena Rostova') ||
        rawUser.includes('David Kim') ||
        rawUser.includes('techcorp.io') ||
        rawUser.includes('workspace.net') ||
        rawUser.includes('Guest Explorer'))
    ) {
      localStorage.clear();
      return;
    }

    const rawGoals = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (
      rawGoals &&
      (rawGoals.includes('$4M') ||
        rawGoals.includes('g_h_1') ||
        rawGoals.includes('g_a_1') ||
        rawGoals.includes('$500k Strategic Enterprise Deal'))
    ) {
      localStorage.clear();
      return;
    }
    localStorage.removeItem('next5_current_persona');
  } catch {
    // Ignore in non-browser environments
  }
}

sanitizeStorage();

export const StorageService = {
  getUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read user from storage', e);
    }
    
    const defaultUser: UserProfile = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name: 'User',
      email: '',
      createdAt: new Date().toISOString(),
    };
    
    this.saveUser(defaultUser);
    return defaultUser;
  },

  saveUser(user: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  isOnboardingComplete(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
  },

  setOnboardingComplete(val: boolean) {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, val ? 'true' : 'false');
  },

  getGoals(): Goal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read goals', e);
    }
    return [];
  },

  saveGoals(goals: Goal[]) {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const goals = this.getGoals();
    const newGoal: Goal = {
      ...goal,
      id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    goals.push(newGoal);
    this.saveGoals(goals);
    return newGoal;
  },

  updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const goals = this.getGoals();
    const idx = goals.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    
    goals[idx] = {
      ...goals[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveGoals(goals);
    return goals[idx];
  },

  deleteGoal(id: string) {
    const goals = this.getGoals().filter((g) => g.id !== id);
    this.saveGoals(goals);
  },

  getDailyContext(): DailyContext {
    const today = new Date().toISOString().split('T')[0];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_CONTEXT);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.date === today) return parsed;
      }
    } catch (e) {
      console.error('Failed to read daily context', e);
    }
    
    const def: DailyContext = {
      id: 'ctx_' + Date.now(),
      userId: this.getUser().id,
      date: today,
      availableTime: '1h',
      energy: '70',
      freeformContext: '',
      createdAt: new Date().toISOString(),
    };
    
    this.saveDailyContext(def);
    return def;
  },

  saveDailyContext(ctx: DailyContext) {
    localStorage.setItem(STORAGE_KEYS.DAILY_CONTEXT, JSON.stringify(ctx));
  },

  getRecommendations(): Recommendation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read recommendations', e);
    }
    return [];
  },

  saveRecommendations(recs: Recommendation[]) {
    localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(recs));
  },

  updateRecommendationStatus(id: string, status: Recommendation['status']): Recommendation | null {
    const recs = this.getRecommendations();
    const idx = recs.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    
    recs[idx].status = status;
    
    if (status === 'completed') {
      recs[idx].completedAt = new Date().toISOString();
      // Record light behavioral observation if appropriate
      if (recs[idx].priorityRank === 1) {
        this.addMemory({
          userId: recs[idx].userId,
          type: 'observed_pattern',
          content: `Completed top priority (#1) move on ${recs[idx].date}: ${recs[idx].action}`,
          source: 'behavioral_observation',
          confirmed: true,
        });
      }
    }
    
    this.saveRecommendations(recs);
    return recs[idx];
  },

  getFeedback(): DailyFeedback[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read feedback', e);
    }
    return [];
  },

  saveFeedback(fb: DailyFeedback) {
    const list = this.getFeedback();
    list.push(fb);
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(list));
    
    // Add memory item if user provided comments
    if (fb.comments) {
      this.addMemory({
        userId: fb.userId,
        type: 'explicit_context',
        content: `User feedback on ${fb.date} (${fb.rating}): "${fb.comments}"`,
        source: 'user_stated',
        confirmed: true,
      });
    }
  },

  getMemory(): MemoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read memory', e);
    }
    return [];
  },

  saveMemory(items: MemoryItem[]) {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(items));
  },

  addMemory(item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>): MemoryItem {
    const memories = this.getMemory();
    const newMem: MemoryItem = {
      ...item,
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memories.push(newMem);
    this.saveMemory(memories);
    return newMem;
  },

  deleteMemory(id: string) {
    const memories = this.getMemory().filter((m) => m.id !== id);
    this.saveMemory(memories);
  },

  clearAllMemory() {
    this.saveMemory([]);
  },

  resetAll() {
    localStorage.clear();
  },
};
