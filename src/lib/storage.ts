import { Goal, DailyContext, Recommendation, DailyFeedback, MemoryItem, UserProfile } from '../types';

const STORAGE_KEYS = {
  USER: 'next5_user',
  GOALS: 'next5_goals',
  DAILY_CONTEXT: 'next5_daily_context',
  RECOMMENDATIONS: 'next5_recommendations',
  FEEDBACK: 'next5_feedback',
  MEMORY: 'next5_memory',
  ONBOARDING_DONE: 'next5_onboarding_done',
  CURRENT_PERSONA: 'next5_current_persona',
};

// Purge any legacy mock / seeded data left in localStorage from previous test sessions
function sanitizeStorage(): void {
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (
      rawUser &&
      (rawUser.includes('Alex Rivera') ||
        rawUser.includes('Sarah Chen') ||
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
    if (localStorage.getItem(STORAGE_KEYS.CURRENT_PERSONA)) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PERSONA);
    }
  } catch {
    // Ignore in non-browser environments
  }
}
sanitizeStorage();

// Seed personas from prompt section 33 & 40.H
export const SEED_PERSONAS = {
  persona_a: {
    id: 'user_persona_a',
    name: 'Sarah Chen (BD Manager)',
    email: 'sarah.chen@techcorp.io',
    createdAt: new Date().toISOString(),
    goals: [
      {
        id: 'g_a_1',
        userId: 'user_persona_a',
        title: 'Hit $4M Annual Revenue Target',
        description: 'Close enterprise pipeline and expand existing client accounts',
        category: 'business' as const,
        goalType: 'target' as const,
        targetValue: '$4M',
        currentValue: '$1.8M',
        unit: 'USD',
        deadline: 'Dec 31',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        source: 'user' as const,
        notes: 'Needs focus on 3 large enterprise renewals and 2 high-probability proposals',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_a_2',
        userId: 'user_persona_a',
        title: 'Deliver High-Impact Client Proposals',
        description: 'Maintain 65%+ win rate on Tier-1 enterprise opportunities',
        category: 'work' as const,
        goalType: 'project' as const,
        deadline: 'Ongoing',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        source: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    dailyContext: {
      id: 'ctx_a',
      userId: 'user_persona_a',
      date: new Date().toISOString().split('T')[0],
      availableTime: '1h' as const,
      energy: '70' as const,
      freeformContext: 'I have 3 client calls this afternoon, need to finalize the Apex renewal proposal, and have 20 unread emails.',
      createdAt: new Date().toISOString(),
    },
    memories: [
      {
        id: 'mem_a_1',
        userId: 'user_persona_a',
        type: 'observed_pattern' as const,
        content: 'Highest proposal win rates happen when initial draft review is completed before noon.',
        source: 'behavioral_observation' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem_a_2',
        userId: 'user_persona_a',
        type: 'preference' as const,
        content: 'Prefers batching administrative email responses after 4 PM.',
        source: 'user_stated' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  scenario_h: {
    id: 'user_scenario_h',
    name: 'Alex Rivera (Prioritization Quality Test)',
    email: 'alex.rivera@workspace.net',
    createdAt: new Date().toISOString(),
    goals: [
      {
        id: 'g_h_1',
        userId: 'user_scenario_h',
        title: 'Close $500k Strategic Enterprise Deal',
        description: 'Submit winning proposal for enterprise client',
        category: 'business' as const,
        goalType: 'target' as const,
        targetValue: '$500,000',
        deadline: 'Tomorrow at 10 AM',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        notes: 'Due tomorrow! High financial consequence.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_h_2',
        userId: 'user_scenario_h',
        title: 'Pass Cloud Security Certification Exam',
        description: 'Scheduled exam to secure seniority promotion',
        category: 'career' as const,
        goalType: 'milestone' as const,
        deadline: 'Friday',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        notes: 'Exam is in 3 days. Needs 30m high-yield practice.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_h_3',
        userId: 'user_scenario_h',
        title: 'Operational Reporting & Management KPIs',
        description: 'Deliver weekly operations report to senior management',
        category: 'work' as const,
        goalType: 'project' as const,
        deadline: 'Today at 3 PM',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        notes: 'Due today! Manager has zero tolerance for late submission.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    dailyContext: {
      id: 'ctx_h',
      userId: 'user_scenario_h',
      date: new Date().toISOString().split('T')[0],
      availableTime: '2h_plus' as const,
      energy: '40' as const, // Low energy!
      freeformContext: 'I have a $500k proposal due tomorrow, a manager report due today by 3pm, 3 meetings, 17 emails, and a certification exam on Friday. Honestly I am running on low energy.',
      createdAt: new Date().toISOString(),
    },
    memories: [
      {
        id: 'mem_h_1',
        userId: 'user_scenario_h',
        type: 'observed_pattern' as const,
        content: 'Tends to get sucked into email clearing when feeling low energy instead of finishing the report.',
        source: 'behavioral_observation' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  persona_c: {
    id: 'user_persona_c',
    name: 'Marcus Vance (Career Changer)',
    email: 'marcus.vance@careerdev.io',
    createdAt: new Date().toISOString(),
    goals: [
      {
        id: 'g_c_1',
        userId: 'user_persona_c',
        title: 'Transition into DevSecOps Engineer Role',
        description: 'Secure first DevSecOps role by Q4',
        category: 'career' as const,
        goalType: 'outcome' as const,
        targetValue: 'DevSecOps Job Offer',
        deadline: 'Nov 30',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        notes: 'Balancing this while working full-time in technical support.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_c_2',
        userId: 'user_persona_c',
        title: 'Complete AWS Certified Security Specialty',
        category: 'career' as const,
        goalType: 'milestone' as const,
        deadline: 'Next month',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_c_3',
        userId: 'user_persona_c',
        title: 'Build CI/CD Vulnerability Scanner Portfolio Project',
        category: 'career' as const,
        goalType: 'project' as const,
        deadline: 'In 3 weeks',
        importance: 'medium' as const,
        status: 'active' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    dailyContext: {
      id: 'ctx_c',
      userId: 'user_persona_c',
      date: new Date().toISOString().split('T')[0],
      availableTime: '1h' as const,
      energy: '40' as const,
      freeformContext: 'Exhausted after an 8-hour shift at my day job. Only have 1 hour before dinner to make career progress.',
      createdAt: new Date().toISOString(),
    },
    memories: [],
  },
  persona_d: {
    id: 'user_persona_d',
    name: 'Elena Rostova (Founder)',
    email: 'elena@stealthstartup.co',
    createdAt: new Date().toISOString(),
    goals: [
      {
        id: 'g_d_1',
        userId: 'user_persona_d',
        title: 'Acquire First 100 Paying Customers',
        description: 'Reach 100 paid users to prove unit economics',
        category: 'business' as const,
        goalType: 'target' as const,
        targetValue: '100',
        currentValue: '14',
        unit: 'Customers',
        deadline: 'Oct 31',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        notes: 'Priority is direct founder outreach and customer conversations over passive marketing.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    dailyContext: {
      id: 'ctx_d',
      userId: 'user_persona_d',
      date: new Date().toISOString().split('T')[0],
      availableTime: '2h_plus' as const,
      energy: '100' as const,
      freeformContext: 'I have 5 customer demo calls and need to make sure I don’t spend the day redesigning our landing page.',
      createdAt: new Date().toISOString(),
    },
    memories: [],
  },
  persona_e: {
    id: 'user_persona_e',
    name: 'David Kim (Personal Balance)',
    email: 'david.kim@gmail.com',
    createdAt: new Date().toISOString(),
    goals: [
      {
        id: 'g_e_1',
        userId: 'user_persona_e',
        title: 'Build $20,000 Emergency Fund',
        category: 'finance' as const,
        goalType: 'target' as const,
        targetValue: '$20,000',
        currentValue: '$11,500',
        unit: 'USD',
        deadline: 'End of Year',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_e_2',
        userId: 'user_persona_e',
        title: 'Exercise 4x Per Week & Run 5k',
        category: 'health' as const,
        goalType: 'habit' as const,
        targetValue: '4 sessions/wk',
        currentValue: '2 sessions',
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'g_e_3',
        userId: 'user_persona_e',
        title: 'Family Dinner Without Screens 5x/Week',
        category: 'personal' as const,
        goalType: 'habit' as const,
        importance: 'high' as const,
        status: 'active' as const,
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    dailyContext: {
      id: 'ctx_e',
      userId: 'user_persona_e',
      date: new Date().toISOString().split('T')[0],
      availableTime: '30m' as const,
      energy: '70' as const,
      freeformContext: 'Busy Tuesday. Want to make sure I get a quick workout in and review monthly savings rate.',
      createdAt: new Date().toISOString(),
    },
    memories: [],
  },
};

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
      name: 'Guest Explorer',
      email: 'user@next5.app',
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

  loadPersona(personaKey: keyof typeof SEED_PERSONAS) {
    const persona = SEED_PERSONAS[personaKey];
    if (!persona) return;
    this.saveUser({
      id: persona.id,
      name: persona.name,
      email: persona.email,
      createdAt: persona.createdAt,
    });
    this.saveGoals(persona.goals);
    this.saveDailyContext(persona.dailyContext);
    this.saveMemory(persona.memories);
    this.setOnboardingComplete(true);
    localStorage.setItem(STORAGE_KEYS.CURRENT_PERSONA, personaKey);
    // Clear old recommendations so fresh ones generate
    localStorage.removeItem(STORAGE_KEYS.RECOMMENDATIONS);
  },

  resetAll() {
    localStorage.clear();
  },
};
