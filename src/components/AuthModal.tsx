import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Lock, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { 
  auth, 
  signInAnonymously, 
  signInWithPopup, 
  googleProvider, 
  fbSignOut, 
  FirebaseUser 
} from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  firebaseUser: FirebaseUser | null;
  onAuthSuccess: (profile: UserProfile) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  firebaseUser,
  onAuthSuccess,
  onSignOut,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const profile: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || 'NEXT5 Member',
        email: fbUser.email || '',
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err?.message || 'Google Sign-in failed. Please try again or continue as guest.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      const fbUser = result.user;
      const profile: UserProfile = {
        id: fbUser.uid,
        name: 'Private Guest',
        email: '',
        createdAt: new Date().toISOString(),
      };
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setError('Guest mode initialized locally.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
      onSignOut();
      onClose();
    } catch (err: any) {
      console.error('Sign-out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSignedIn = !!firebaseUser;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Account & Privacy</h3>
              <p className="text-[11px] text-stone-500">End-to-end isolated data storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Active Identity
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isSignedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
            }`}>
              {isSignedIn ? 'Cloud Authenticated' : 'Local / Offline Mode'}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-bold">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-900 truncate">
                {currentUser.name || 'User'}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {currentUser.email || 'No email attached (Private Session)'}
              </p>
            </div>
          </div>
        </div>

        {/* Security / Isolation Guarantee */}
        <div className="p-3 bg-stone-100/70 rounded-xl border border-stone-200/80 text-xs text-stone-600 space-y-1">
          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Zero Cross-User Data Leakage
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            All your goals, daily contexts, recommendations, and memory items are secured under strict Firestore rules with user-level UID isolation.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {!isSignedIn ? (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-bold hover:bg-stone-800 transition shadow-sm disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Google
              </button>

              <button
                type="button"
                onClick={handleAnonymousSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition disabled:opacity-50"
              >
                <UserIcon className="w-4 h-4 text-stone-500" />
                Continue as Anonymous Guest
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-rose-700 text-xs font-semibold hover:bg-rose-50 transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out from Device
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
