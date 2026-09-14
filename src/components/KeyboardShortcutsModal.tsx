import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1 - 5', desc: 'Toggle complete / uncomplete on move #1 to #5' },
    { key: 'A', desc: 'Listen to Executive Audio Briefing (Spoken Standup)' },
    { key: 'V', desc: 'Open Voice Friction Decompressor' },
    { key: 'S', desc: 'Launch Focus Sprint on priority Move #1' },
    { key: 'R', desc: 'Recalculate today’s NEXT5 priorities' },
    { key: 'C', desc: 'Open "What Changed?" Daily Circumstances modal' },
    { key: 'T', desc: 'Open "What-If" Scenario Simulator (Trade-Offs)' },
    { key: 'E', desc: 'Open End-of-Day Closeout & Calibration modal' },
    { key: 'W', desc: 'Open Weekly Executive Debrief & Reset modal' },
    { key: 'B', desc: 'Open Data Sovereignty & Backup modal' },
    { key: '?', desc: 'Toggle this keyboard shortcut helper' },
    { key: 'Esc', desc: 'Close any active modal dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-800 flex flex-col gap-4 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
              <Keyboard className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-100 text-sm font-mono">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 font-mono font-bold text-[11px] border border-slate-700 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 text-center font-mono">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">Esc</kbd> anytime to dismiss.
        </p>
      </div>
    </div>
  );
};
