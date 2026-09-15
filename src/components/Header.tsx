import React, { useState } from 'react';
import { Sparkles, RefreshCw, User, ChevronDown, Database, Keyboard, Headphones, Brain } from 'lucide-react';
import { UserProfile } from '../types';
import { Next5Logo } from './LandingPage';

interface HeaderProps {
  user: UserProfile;
  currentMode: string;
  onResetAll?: () => void;
  onOpenDailyContext: () => void;
  onOpenEndOfDay: () => void;
  onOpenAuth?: () => void;
  onOpenExportImport?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onOpenWeeklyDebrief?: () => void;
  onOpenAudioBriefing?: () => void;
  onOpenVoiceFriction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentMode,
  onResetAll,
  onOpenDailyContext,
  onOpenEndOfDay,
  onOpenAuth,
  onOpenExportImport,
  onOpenKeyboardShortcuts,
  onOpenWeeklyDebrief,
  onOpenAudioBriefing,
  onOpenVoiceFriction,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const isUserSignedIn = Boolean(user.email || (user.name && user.name !== 'User' && user.name !== 'Private Guest'));

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Clean NEXT5 Brand */}
        <div className="flex items-center gap-2.5">
          <Next5Logo size={30} className="shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-50 tracking-tight text-base leading-none font-mono">
              NEXT<span className="text-emerald-400">5</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Your next five moves.
            </span>
          </div>
        </div>

        {/* Profile & Account Navigation */}
        <div className="flex items-center gap-2 relative">
          {!isUserSignedIn && onOpenAuth && (
            <button
              id="header-direct-login-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 text-xs font-extrabold transition shadow-xs cursor-pointer"
              title="Sign in"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* User Profile & Menu Button */}
          <button
            id="header-profile-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer"
            title="Profile and workspace settings"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/30">
              {user.name && user.name !== 'User' ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-slate-200 font-semibold text-xs max-w-[120px] truncate">
              {user.name && user.name !== 'User' ? user.name.split(' ')[0] : 'Workspace'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-11 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-100">
                {/* User info & Profile action */}
                <div className="px-3.5 py-2.5 border-b border-slate-800/80">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {user.name && user.name !== 'User' ? user.name : 'Personal Workspace'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {user.email || 'Local workspace'}
                  </div>
                  {isUserSignedIn && onOpenAuth && (
                    <button
                      id="menu-account-btn"
                      onClick={() => {
                        onOpenAuth();
                        setShowMenu(false);
                      }}
                      className="mt-2.5 w-full text-left flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-emerald-300 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition border border-slate-700 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Profile Settings</span>
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 -rotate-90" />
                    </button>
                  )}
                </div>

                {/* Productivity Tools */}
                <div className="py-1 border-b border-slate-800/80">
                  {onOpenAudioBriefing && (
                    <button
                      id="menu-audio-briefing-btn"
                      onClick={() => {
                        onOpenAudioBriefing();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                        Executive Audio Briefing
                      </span>
                      <kbd className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">A</kbd>
                    </button>
                  )}

                  {onOpenVoiceFriction && (
                    <button
                      id="menu-voice-friction-btn"
                      onClick={() => {
                        onOpenVoiceFriction();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-emerald-400" />
                        Voice Friction Decompressor
                      </span>
                      <kbd className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">V</kbd>
                    </button>
                  )}

                  {onOpenWeeklyDebrief && (
                    <button
                      onClick={() => {
                        onOpenWeeklyDebrief();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Weekly Strategic Reset
                      </span>
                      <kbd className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">W</kbd>
                    </button>
                  )}

                  {onOpenExportImport && (
                    <button
                      onClick={() => {
                        onOpenExportImport();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 flex items-center gap-2 transition"
                    >
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      Backup & Restore Data
                    </button>
                  )}

                  {onOpenKeyboardShortcuts && (
                    <button
                      onClick={() => {
                        onOpenKeyboardShortcuts();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                        Keyboard Shortcuts
                      </span>
                      <kbd className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">?</kbd>
                    </button>
                  )}
                </div>

                <div className="pt-1">
                  {onResetAll && (
                    <button
                      onClick={() => {
                        onResetAll();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Workspace
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
