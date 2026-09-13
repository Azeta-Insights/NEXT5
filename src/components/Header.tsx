import React, { useState } from 'react';
import { Sparkles, RefreshCw, User, HelpCircle, Layers, ChevronDown, Database, Keyboard, Headphones, Brain, Shield } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  currentMode: string;
  onResetAll?: () => void;
  onOpenDailyContext: () => void;
  onOpenEndOfDay: () => void;
  onOpenAuth: () => void;
  onOpenExportImport: () => void;
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

  return (
    <header className="sticky top-0 z-30 bg-stone-50/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Clean NEXT5 Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-stone-900 text-stone-50 font-black text-xs tracking-tight shadow-xs">
            5
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-stone-900 tracking-tight text-base leading-none">
              NEXT5
            </span>
            <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
              Your next five moves.
            </span>
          </div>
        </div>

        {/* Profile & Account Menu */}
        <div className="flex items-center gap-2 relative">
          {/* Unified Profile & Workspace Menu */}
          <button
            id="header-profile-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-medium transition shadow-2xs"
            title="Profile, Tools & Workspace Settings"
          >
            <div className="w-5 h-5 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center text-[10px] font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-stone-700 font-semibold text-xs max-w-[100px] truncate">
              {user.name.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* User info & Account */}
                <div className="px-3.5 py-2 border-b border-stone-100">
                  <div className="text-xs font-bold text-stone-900 truncate">{user.name}</div>
                  <div className="text-[11px] text-stone-400 truncate">{user.email || 'Private session'}</div>
                  <button
                    onClick={() => {
                      onOpenAuth();
                      setShowMenu(false);
                    }}
                    className="mt-2 w-full text-left flex items-center justify-between text-xs font-semibold text-stone-700 hover:text-stone-950 p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-500" />
                      Account & Cloud Sync
                    </span>
                    <ChevronDown className="w-3 h-3 text-stone-400 -rotate-90" />
                  </button>
                </div>

                {/* Productivity & Voice Tools */}
                <div className="py-1 border-b border-stone-100">
                  {onOpenAudioBriefing && (
                    <button
                      id="menu-audio-briefing-btn"
                      onClick={() => {
                        onOpenAudioBriefing();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Headphones className="w-3.5 h-3.5 text-stone-500" />
                        Executive Audio Briefing
                      </span>
                      <kbd className="text-[10px] font-mono bg-stone-100 px-1 rounded text-stone-500 border border-stone-200">A</kbd>
                    </button>
                  )}

                  {onOpenVoiceFriction && (
                    <button
                      id="menu-voice-friction-btn"
                      onClick={() => {
                        onOpenVoiceFriction();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-stone-500" />
                        Voice Friction Decompressor
                      </span>
                      <kbd className="text-[10px] font-mono bg-stone-100 px-1 rounded text-stone-500 border border-stone-200">V</kbd>
                    </button>
                  )}

                  {onOpenWeeklyDebrief && (
                    <button
                      onClick={() => {
                        onOpenWeeklyDebrief();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Weekly Strategic Reset
                      </span>
                      <kbd className="text-[10px] font-mono bg-stone-100 px-1 rounded text-stone-500 border border-stone-200">W</kbd>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onOpenExportImport();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition"
                  >
                    <Database className="w-3.5 h-3.5 text-stone-500" />
                    Backup & Restore Data
                  </button>

                  {onOpenKeyboardShortcuts && (
                    <button
                      onClick={() => {
                        onOpenKeyboardShortcuts();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Keyboard className="w-3.5 h-3.5 text-stone-500" />
                        Keyboard Shortcuts
                      </span>
                      <kbd className="text-[10px] font-mono bg-stone-100 px-1 rounded text-stone-500 border border-stone-200">?</kbd>
                    </button>
                  )}
                </div>

                <div className="border-t border-stone-100 pt-1">
                  {onResetAll && (
                    <button
                      onClick={() => {
                        onResetAll();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset & Start Fresh
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
