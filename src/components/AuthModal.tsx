import React, { useState, useEffect } from 'react';
import { 
  X, 
  LogOut, 
  User as UserIcon, 
  Sparkles,
  Check, 
  AlertCircle, 
  Briefcase, 
  Mail, 
  RefreshCw, 
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { 
  auth, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  googleProvider, 
  fbSignOut, 
  FirebaseUser 
} from '../lib/firebase';
import { UserProfile } from '../types';
import { FirestoreSync } from '../lib/firestoreSync';

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
  // Main tabs: 'google' | 'email' | 'profile'
  const [activeTab, setActiveTab] = useState<'google' | 'email' | 'profile'>('google');
  
  // Email auth mode: 'signin' | 'signup' | 'forgot'
  const [emailAuthMode, setEmailAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Form inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile fields
  const [name, setName] = useState(currentUser.name === 'User' ? '' : currentUser.name);
  const [roleTitle, setRoleTitle] = useState(currentUser.roleTitle || '');
  const [primaryFocus, setPrimaryFocus] = useState(currentUser.primaryFocus || '');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name === 'User' ? '' : currentUser.name);
      setRoleTitle(currentUser.roleTitle || '');
      setPrimaryFocus(currentUser.primaryFocus || '');
      if (currentUser.email && !emailInput) {
        setEmailInput(currentUser.email);
      }
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const isSignedIn = !!firebaseUser || Boolean(currentUser.email);

  // Identify provider for signed in users
  const isGoogleUser = firebaseUser?.providerData?.some(
    (p) => p.providerId === 'google.com'
  );
  const isEmailUser = firebaseUser?.providerData?.some(
    (p) => p.providerId === 'password'
  );

  // Translate Firebase error codes into helpful user messages
  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password. Please verify your credentials or create a new account.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address. Please switch to Sign In.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-blocked':
        return 'Google sign-in popup was blocked by your browser. Please allow popups or use Email & Password.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in window was closed before completing.';
      case 'auth/too-many-requests':
        return 'Access temporarily blocked due to multiple failed attempts. Please try again later or reset your password.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not yet enabled in your Firebase console. Please enable it under Authentication > Sign-in method.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      default:
        return err?.message || 'Authentication error. Please try again.';
    }
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const profile: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || name || 'NEXT5 Member',
        email: fbUser.email || emailInput || '',
        roleTitle: roleTitle || undefined,
        primaryFocus: primaryFocus || undefined,
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };

      try {
        await FirestoreSync.saveUser(profile);
      } catch (cloudErr) {
        console.warn('Firestore sync pending:', cloudErr);
      }

      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign-In or Sign-Up handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!emailInput.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Forgot password flow
    if (emailAuthMode === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, emailInput.trim());
        setInfoMessage(`Password reset link sent to ${emailInput.trim()}. Please check your inbox.`);
      } catch (err: any) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!passwordInput) {
      setError('Please enter your password.');
      return;
    }

    if (emailAuthMode === 'signup') {
      if (passwordInput.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);

    try {
      let fbUser: FirebaseUser;

      if (emailAuthMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        fbUser = cred.user;

        // Set display name if provided
        const displayName = name.trim() || 'NEXT5 Member';
        try {
          await updateProfile(fbUser, { displayName });
        } catch (profileErr) {
          console.warn('Could not update profile display name:', profileErr);
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        fbUser = cred.user;
      }

      const profile: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || name.trim() || (emailAuthMode === 'signup' ? 'NEXT5 Member' : 'Member'),
        email: fbUser.email || emailInput.trim(),
        roleTitle: roleTitle || undefined,
        primaryFocus: primaryFocus || undefined,
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };

      try {
        await FirestoreSync.saveUser(profile);
      } catch (cloudErr) {
        console.warn('Firestore sync pending:', cloudErr);
      }

      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.warn('Email auth error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Local / Guest Profile update handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedProfile: UserProfile = {
        id: firebaseUser ? firebaseUser.uid : currentUser.id || `user_${Date.now()}`,
        name: name.trim(),
        email: emailInput.trim() || currentUser.email || '',
        roleTitle: roleTitle.trim() || undefined,
        primaryFocus: primaryFocus.trim() || undefined,
        createdAt: currentUser.createdAt || new Date().toISOString(),
      };

      await FirestoreSync.saveUser(updatedProfile);

      setIsSaved(true);
      onAuthSuccess(updatedProfile);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 600);
    } catch {
      const fallbackProfile: UserProfile = {
        id: currentUser.id || `user_${Date.now()}`,
        name: name.trim(),
        email: emailInput.trim() || currentUser.email || '',
        roleTitle: roleTitle.trim() || undefined,
        primaryFocus: primaryFocus.trim() || undefined,
        createdAt: currentUser.createdAt || new Date().toISOString(),
      };
      onAuthSuccess(fallbackProfile);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
      onSignOut();
      onClose();
    } catch (err: any) {
      console.error('Sign out notice:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 flex flex-col gap-4 max-h-[90vh] overflow-y-auto text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base tracking-tight font-mono">
                {isSignedIn ? 'Account Profile' : 'Sign In to NEXT5'}
              </h3>
              <p className="text-xs text-slate-400">
                {isSignedIn 
                  ? 'Your moves and priorities are actively synchronized' 
                  : 'Two sign-in methods: Google or Email/Password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status pill */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-sm font-extrabold shrink-0">
              {currentUser.name && currentUser.name !== 'User'
                ? currentUser.name.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">
                {currentUser.name && currentUser.name !== 'User' ? currentUser.name : 'Guest User'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentUser.email || 'Local workspace (unsaved in cloud)'}
              </div>
            </div>
          </div>

          <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full whitespace-nowrap border ${
            isSignedIn 
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isSignedIn 
              ? (isGoogleUser ? 'Google Connected' : isEmailUser ? 'Email Connected' : 'Cloud Connected')
              : 'Local Session'}
          </span>
        </div>

        {!isSignedIn ? (
          <>
            {/* Primary Auth Method Tabs reflecting Firebase Authentication Options */}
            <div className="grid grid-cols-3 p-1 bg-slate-900 rounded-xl text-xs font-semibold border border-slate-800">
              {/* Tab 1: Google */}
              <button
                type="button"
                id="tab-google-auth"
                onClick={() => { setActiveTab('google'); setError(null); setInfoMessage(null); }}
                className={`py-2 px-2.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'google'
                    ? 'bg-slate-800 text-slate-100 shadow-xs font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="truncate">Google</span>
              </button>

              {/* Tab 2: Email & Password */}
              <button
                type="button"
                id="tab-email-auth"
                onClick={() => { setActiveTab('email'); setError(null); setInfoMessage(null); }}
                className={`py-2 px-2.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'email'
                    ? 'bg-slate-800 text-slate-100 shadow-xs font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Email / Password</span>
              </button>

              {/* Tab 3: Local Profile */}
              <button
                type="button"
                id="tab-profile-details"
                onClick={() => { setActiveTab('profile'); setError(null); setInfoMessage(null); }}
                className={`py-2 px-2.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-slate-800 text-slate-100 shadow-xs font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Local Profile</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-amber-950/40 text-amber-200 rounded-xl text-xs border border-amber-800/60 space-y-1.5 animate-in fade-in duration-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Info Message (e.g. password reset sent) */}
            {infoMessage && (
              <div className="p-3 bg-emerald-950/40 text-emerald-200 rounded-xl text-xs border border-emerald-500/30 flex items-start gap-2 animate-in fade-in duration-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">{infoMessage}</p>
              </div>
            )}

            {/* TAB 1: GOOGLE SIGN-IN */}
            {activeTab === 'google' && (
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    One-Click Google Authentication
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sign in seamlessly with your Google credentials. Your goals, daily context, and decision history will automatically synchronize with your private cloud space.
                  </p>
                </div>

                <button
                  type="button"
                  id="modal-google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white text-slate-950 text-xs font-extrabold hover:bg-slate-100 transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Prefer standard credentials?</span>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('email'); setError(null); }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    Switch to Email & Password &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: EMAIL & PASSWORD AUTHENTICATION */}
            {activeTab === 'email' && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-100">
                {/* Mode toggle between Sign In / Create Account / Forgot Password */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="email-mode-signin"
                      onClick={() => { setEmailAuthMode('signin'); setError(null); setInfoMessage(null); }}
                      className={`text-xs font-bold pb-1 transition cursor-pointer ${
                        emailAuthMode === 'signin'
                          ? 'text-emerald-400 border-b-2 border-emerald-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <span className="text-slate-700">•</span>
                    <button
                      type="button"
                      id="email-mode-signup"
                      onClick={() => { setEmailAuthMode('signup'); setError(null); setInfoMessage(null); }}
                      className={`text-xs font-bold pb-1 transition cursor-pointer ${
                        emailAuthMode === 'signup'
                          ? 'text-emerald-400 border-b-2 border-emerald-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {emailAuthMode !== 'forgot' && (
                    <button
                      type="button"
                      onClick={() => { setEmailAuthMode('forgot'); setError(null); setInfoMessage(null); }}
                      className="text-[11px] text-slate-400 hover:text-emerald-300 font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                  {emailAuthMode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => { setEmailAuthMode('signin'); setError(null); setInfoMessage(null); }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  )}
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {/* Name field (for sign up only) */}
                  {emailAuthMode === 'signup' && (
                    <div className="space-y-1.5 animate-in fade-in duration-100">
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        Full Name <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="email-auth-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Blessing"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-medium placeholder:text-slate-600"
                      />
                    </div>
                  )}

                  {/* Email address field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email Address <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="email-auth-email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g. blessing@example.com"
                      required
                      autoComplete="email"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-medium placeholder:text-slate-600"
                    />
                  </div>

                  {/* Password field (not needed for forgot password) */}
                  {emailAuthMode !== 'forgot' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          Password <span className="text-emerald-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="email-auth-password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder={emailAuthMode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                          required
                          autoComplete={emailAuthMode === 'signup' ? 'new-password' : 'current-password'}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-medium placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Confirm password (for signup) */}
                  {emailAuthMode === 'signup' && (
                    <div className="space-y-1.5 animate-in fade-in duration-100">
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                        Confirm Password <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="email-auth-confirm-password"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-medium placeholder:text-slate-600"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="email-auth-submit-btn"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 text-xs font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : emailAuthMode === 'signup' ? (
                      <>
                        <span>Create Account & Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : emailAuthMode === 'forgot' ? (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Password Reset Link</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In with Email</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Want one-click access?</span>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('google'); setError(null); }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    Use Google Sign-In &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: LOCAL GUEST PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-1 animate-in fade-in duration-100">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  Enter your name to personalize your recommendations without signing into a cloud account.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    Your Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Blessing"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-medium placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      Role
                    </label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="e.g. Founder"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                      Focus
                    </label>
                    <input
                      type="text"
                      value={primaryFocus}
                      onChange={(e) => setPrimaryFocus(e.target.value)}
                      placeholder="e.g. Execution"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-extrabold transition border border-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Saved Locally</span>
                    </>
                  ) : loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Local Preferences</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          /* Signed In View - Profile details & cloud connection */
          <div className="space-y-4 pt-1">
            <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold">
                  Connected via {isGoogleUser ? 'Google Account' : isEmailUser ? 'Email & Password' : 'Firebase Auth'}
                </span>
                <p className="text-[11px] text-emerald-300/80">
                  Your goals, daily context, and move history are protected and actively synchronized.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Strategic Focus
                  </label>
                  <input
                    type="text"
                    value={primaryFocus}
                    onChange={(e) => setPrimaryFocus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition border border-slate-700 cursor-pointer"
              >
                {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{isSaved ? 'Updated in Cloud' : 'Update Profile Details'}</span>
              </button>
            </form>

            <button
              type="button"
              id="auth-signout-btn"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs font-semibold hover:bg-rose-950/60 transition disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
