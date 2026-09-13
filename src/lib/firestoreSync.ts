import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebase';
import { Goal, DailyContext, Recommendation, DailyFeedback, MemoryItem, UserProfile } from '../types';

export const FirestoreSync = {
  async saveUser(user: UserProfile): Promise<void> {
    try {
      if (!user.id) return;
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUser note (rules/connectivity):', err);
    }
  },

  async saveGoal(userId: string, goal: Goal): Promise<void> {
    try {
      if (!userId || !goal.id) return;
      const goalRef = doc(db, 'goals', goal.id);
      await setDoc(goalRef, {
        ...goal,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveGoal note:', err);
    }
  },

  async deleteGoal(goalId: string): Promise<void> {
    try {
      if (!goalId) return;
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (err) {
      console.warn('Firestore deleteGoal note:', err);
    }
  },

  async saveDailyContext(userId: string, ctx: DailyContext): Promise<void> {
    try {
      if (!userId || !ctx.id) return;
      const ctxRef = doc(db, 'daily_context', ctx.id);
      await setDoc(ctxRef, {
        ...ctx,
        userId,
        createdAt: ctx.createdAt || new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveDailyContext note:', err);
    }
  },

  async saveRecommendations(userId: string, recs: Recommendation[]): Promise<void> {
    try {
      if (!userId || !recs.length) return;
      for (const rec of recs) {
        const recRef = doc(db, 'daily_recommendations', rec.id);
        await setDoc(recRef, {
          ...rec,
          userId,
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore saveRecommendations note:', err);
    }
  },

  async updateRecommendationStatus(
    userId: string, 
    recId: string, 
    status: Recommendation['status']
  ): Promise<void> {
    try {
      if (!userId || !recId) return;
      const recRef = doc(db, 'daily_recommendations', recId);
      await setDoc(recRef, {
        userId,
        status,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore updateRecommendationStatus note:', err);
    }
  },

  async saveFeedback(userId: string, fb: DailyFeedback): Promise<void> {
    try {
      if (!userId || !fb.id) return;
      const fbRef = doc(db, 'daily_feedback', fb.id);
      await setDoc(fbRef, {
        ...fb,
        userId,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveFeedback note:', err);
    }
  },

  async saveMemory(userId: string, item: MemoryItem): Promise<void> {
    try {
      if (!userId || !item.id) return;
      const memRef = doc(db, 'memory', item.id);
      await setDoc(memRef, {
        ...item,
        userId,
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveMemory note:', err);
    }
  },

  async deleteMemory(memId: string): Promise<void> {
    try {
      if (!memId) return;
      await deleteDoc(doc(db, 'memory', memId));
    } catch (err) {
      console.warn('Firestore deleteMemory note:', err);
    }
  },

  async loadUserData(userId: string): Promise<{
    goals?: Goal[];
    dailyContext?: DailyContext;
    recommendations?: Recommendation[];
    memories?: MemoryItem[];
  }> {
    const result: {
      goals?: Goal[];
      dailyContext?: DailyContext;
      recommendations?: Recommendation[];
      memories?: MemoryItem[];
    } = {};

    try {
      if (!userId) return result;

      // Load goals
      const goalsQ = query(collection(db, 'goals'), where('userId', '==', userId));
      const goalsSnap = await getDocs(goalsQ);
      if (!goalsSnap.empty) {
        result.goals = goalsSnap.docs.map((d) => d.data() as Goal);
      }

      // Load daily context
      const today = new Date().toISOString().split('T')[0];
      const ctxQ = query(
        collection(db, 'daily_context'), 
        where('userId', '==', userId), 
        where('date', '==', today)
      );
      const ctxSnap = await getDocs(ctxQ);
      if (!ctxSnap.empty) {
        result.dailyContext = ctxSnap.docs[0].data() as DailyContext;
      }

      // Load memory
      const memQ = query(collection(db, 'memory'), where('userId', '==', userId));
      const memSnap = await getDocs(memQ);
      if (!memSnap.empty) {
        result.memories = memSnap.docs.map((d) => d.data() as MemoryItem);
      }
    } catch (err) {
      console.warn('Firestore loadUserData note:', err);
    }

    return result;
  }
};
