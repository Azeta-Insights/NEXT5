import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Goal, DailyContext, Recommendation, DailyFeedback, MemoryItem, UserProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const FirestoreSync = {
  async saveUser(user: UserProfile): Promise<void> {
    const path = `users/${user.id}`;
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
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async saveGoal(userId: string, goal: Goal): Promise<void> {
    const path = `goals/${goal.id}`;
    try {
      if (!userId || !goal.id) return;
      const goalRef = doc(db, 'goals', goal.id);
      await setDoc(goalRef, {
        ...goal,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async deleteGoal(goalId: string): Promise<void> {
    const path = `goals/${goalId}`;
    try {
      if (!goalId) return;
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async saveDailyContext(userId: string, ctx: DailyContext): Promise<void> {
    const path = `daily_context/${ctx.id}`;
    try {
      if (!userId || !ctx.id) return;
      const ctxRef = doc(db, 'daily_context', ctx.id);
      await setDoc(ctxRef, {
        ...ctx,
        userId,
        createdAt: ctx.createdAt || new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async saveRecommendations(userId: string, recs: Recommendation[]): Promise<void> {
    const path = 'daily_recommendations';
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
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async updateRecommendationStatus(
    userId: string, 
    recId: string, 
    status: Recommendation['status']
  ): Promise<void> {
    const path = `daily_recommendations/${recId}`;
    try {
      if (!userId || !recId) return;
      const recRef = doc(db, 'daily_recommendations', recId);
      await setDoc(recRef, {
        userId,
        status,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async saveFeedback(userId: string, fb: DailyFeedback): Promise<void> {
    const path = `daily_feedback/${fb.id}`;
    try {
      if (!userId || !fb.id) return;
      const fbRef = doc(db, 'daily_feedback', fb.id);
      await setDoc(fbRef, {
        ...fb,
        userId,
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async saveMemory(userId: string, item: MemoryItem): Promise<void> {
    const path = `memory/${item.id}`;
    try {
      if (!userId || !item.id) return;
      const memRef = doc(db, 'memory', item.id);
      await setDoc(memRef, {
        ...item,
        userId,
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async deleteMemory(memId: string): Promise<void> {
    const path = `memory/${memId}`;
    try {
      if (!memId) return;
      await deleteDoc(doc(db, 'memory', memId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async loadUserData(userId: string): Promise<{
    user?: UserProfile;
    goals?: Goal[];
    dailyContext?: DailyContext;
    recommendations?: Recommendation[];
    memories?: MemoryItem[];
  }> {
    const result: {
      user?: UserProfile;
      goals?: Goal[];
      dailyContext?: DailyContext;
      recommendations?: Recommendation[];
      memories?: MemoryItem[];
    } = {};

    if (!userId) return result;

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        result.user = userDoc.data() as UserProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }

    try {
      // Load goals
      const goalsQ = query(collection(db, 'goals'), where('userId', '==', userId));
      const goalsSnap = await getDocs(goalsQ);
      if (!goalsSnap.empty) {
        result.goals = goalsSnap.docs.map((d) => d.data() as Goal);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'goals');
    }

    try {
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
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'daily_context');
    }

    try {
      // Load memory
      const memQ = query(collection(db, 'memory'), where('userId', '==', userId));
      const memSnap = await getDocs(memQ);
      if (!memSnap.empty) {
        result.memories = memSnap.docs.map((d) => d.data() as MemoryItem);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'memory');
    }

    return result;
  }
};
